# ADR-0008: RTC 이모지 반응을 별도 Socket.IO 채널로 분리

## Decision

LiveKit은 영상 전송과 방 종료 RPC만 담당하고, 이모지 반응은 서버의
`/rtc` Socket.IO namespace를 사용하는 별도 feature로 구현한다.
VIEWER는 domain hook을 통해 `rtc:feedback:send`를 전송하고, HOST는
`rtc:feedback:received`를 받아 제한된 일회성 버블 queue로 표현한다.

Socket.IO namespace 연결은 reaction room 참여 완료로 취급하지 않는다.
transport가 연결 직후 역할에 따라 `rtc:host:join` 또는 `rtc:viewer:join`을
전송하고 acknowledgement의 `ok`가 true인 경우에만 채널을 `CONNECTED`로
전환한다. VIEWER join payload는 store의 동일 세션에서 받은 `roomId`와
`participantId`를 사용한다.

```text
Socket.IO /rtc connect
  ↓
HOST   → rtc:host:join { roomId }
VIEWER → rtc:viewer:join { roomId, participantId }
  ↓ acknowledgement ok
Reaction channel CONNECTED
  ↓
VIEWER rtc:feedback:send
  ↓
HOST rtc:feedback:received
```

## Context

VisionCamera가 유일한 카메라 owner인 현재 구조에서 이모지 반응 실패가
영상 송출, Pose 검출, 촬영에 영향을 주면 안 된다. 서버는 이모지 반응
transport로 LiveKit DataPacket이 아닌 Socket.IO 계약을 제공한다.

## Alternatives

1. LiveKit DataPacket에 반응을 포함한다.
2. 화면 컴포넌트가 Socket.IO를 직접 연결한다.
3. Socket.IO adapter와 domain hook을 feature 경계에 두고 LiveKit과
   독립된 lifecycle로 관리한다.

## Reason

3번은 서버 계약과 일치하며 transport 세부사항을 UI 밖으로 숨긴다.
방 화면의 활성 상태와 room key가 바뀔 때 연결을 폐기하므로 listener
중복과 이전 방 이벤트 유입을 막을 수 있다.

Socket.IO reconnect 시에는 새 connection에서 역할별 join을 다시 수행한다.
join timeout 또는 거절 시 joined 상태를 false로 유지하고 1초부터 최대
15초까지 지수 backoff로 join handshake를 재시도한다. 이 기간에는 VIEWER
전송을 차단한다.

## Trade-off

영상과 반응에 각각 연결이 필요해 연결 상태가 하나 더 생긴다. 대신 반응
서버 장애가 LiveKit과 CameraSession으로 전파되지 않고, 향후 반응
transport를 교체할 때 UI와 영상 계층을 유지할 수 있다.

서버 수신 payload에는 event ID와 발신자 정보가 없으므로 중복 제거와
발신자 표시는 하지 않는다. 버블 렌더링에만 사용하는 `renderId`는 서버
event ID로 취급하지 않는다.

## Result

- HOST는 `{ roomId }`, VIEWER는 `{ roomId, participantId }`로 역할별 reaction
  room에 가입한다.
- join acknowledgement 성공 이후에만 CONNECTED와 VIEWER 전송을 허용한다.
- disconnect cleanup과 Socket.IO reconnect에서 joined 상태를 초기화하고
  역할별 join을 다시 수행한다.
- DEV 로그는 socket connect, join, send, receive, bubble queue 단계를 토큰
  노출 없이 추적한다.
- 실제 기기에서 다중 VIEWER 전송, HOST burst queue, 재연결, 방 전환 후
  이전 이벤트 차단을 검증한 뒤 최종 결과를 기록한다.
