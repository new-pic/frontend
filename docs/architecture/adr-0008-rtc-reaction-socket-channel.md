# ADR-0008: RTC 이모지 반응을 별도 Socket.IO 채널로 분리

## Decision

LiveKit은 영상 전송과 방 종료 RPC만 담당하고, 이모지 반응은 서버의
`/rtc` Socket.IO namespace를 사용하는 별도 feature로 구현한다.
VIEWER는 domain hook을 통해 `rtc:feedback:send`를 전송하고, HOST는
`rtc:feedback:received`를 받아 제한된 일회성 버블 queue로 표현한다.

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

## Trade-off

영상과 반응에 각각 연결이 필요해 연결 상태가 하나 더 생긴다. 대신 반응
서버 장애가 LiveKit과 CameraSession으로 전파되지 않고, 향후 반응
transport를 교체할 때 UI와 영상 계층을 유지할 수 있다.

서버 수신 payload에는 event ID와 발신자 정보가 없으므로 중복 제거와
발신자 표시는 하지 않는다. 버블 렌더링에만 사용하는 `renderId`는 서버
event ID로 취급하지 않는다.

## Result

실제 기기에서 다중 VIEWER 전송, HOST burst queue, 재연결, 방 전환 후
이전 이벤트 차단을 검증한 뒤 기록한다.
