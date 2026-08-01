# ADR-0026: RTC 참여자 대기 진입과 LIVE 기반 연결

## Decision

RTC 참여자는 6자리 코드로 방 참여가 성공하면 LiveKit 토큰을 즉시 발급하지
않고 viewer 대기 화면으로 이동한다. `join-room` feature의
`useRtcViewerEntry`가 공용 RTC 방 SSE lifecycle과 참여자 진입 상태를 소유한다.

```text
RTC 참여 코드
  ↓ join API
roomId + participantId
  ↓ viewer session store
Viewer waiting page
  ↓ GET /rtc/rooms/{roomId}/events
status LIVE
  ↓ viewer LiveKit token API
LiveKit viewer connection
  ↓
Remote camera UI
```

SSE 구독 adapter는 호스트 전용 query와 분리해 `entities/rtc/api/rtc-query.ts`에
둔다. 앱 access token을 사용하는 공용 전송 경계이며, host와 viewer feature가
각자의 lifecycle에 맞게 재사용한다.

LiveKit 토큰 발급 실패는 자동 반복하지 않는다. 같은 SSE 연결에서 LIVE가
반복되어도 최초 실패 상태를 유지하고 사용자가 대기 화면의 `다시 시도`를
누른 경우에만 동일한 `participantId`로 다시 요청한다. LIVE 전에 `ended`
이벤트가 오면 viewer session을 먼저 무효화해 늦은 토큰 응답을 차단하고,
Alert 확인 후 피드 화면으로 이동한다.

## Context

기존 참여 폼은 join API와 LiveKit 토큰 API를 하나의 submit 흐름으로 묶었다.
따라서 호스트가 아직 방을 시작하지 않았어도 참여자가 LiveKit에 연결됐고,
대기 상태와 연결 준비 상태를 UI에서 구분할 수 없었다. 토큰 발급이 실패하면
참여 코드를 다시 제출하는 책임과 기존 participant identity 재사용 책임도 폼에
섞였다.

SSE는 호스트와 참여자가 모두 사용하는 방 상태 입력으로 변경되었지만, 실제
stream adapter가 host query 경계처럼 보이는 위치에 있어 역할 의도가 불명확했다.

## Alternatives

### 페이지에서 SSE와 token mutation을 직접 조합

화면 하나에서 흐름을 따라가기 쉽지만 페이지가 stream 재연결, 중복 LIVE,
token single-flight, 종료 race까지 소유하게 된다. UI 교체와 상태 전이 테스트가
어렵다.

### 참여자 진입 상태를 feature hook으로 분리

페이지는 대기·오류·완료 표현과 navigation만 담당한다. hook은 SSE 구독,
LIVE 판정, token single-flight와 수동 retry를 담당한다. 상태 경계가 하나
추가되지만 외부 stream과 LiveKit token API 사이의 race를 격리할 수 있다.

## Reason

두 번째 구조를 선택했다. 참여자 진입은 join form이나 LiveKit renderer 한쪽에
속하지 않는 독립 use case이고, SSE와 token API를 연결하는 lifecycle을 UI에서
분리해야 중복 발급과 늦은 응답을 통제할 수 있기 때문이다.

## Trade-off

얻는 것:

- 호스트가 LIVE로 전환한 뒤에만 참여자 LiveKit 토큰 발급
- join identity와 token retry identity의 일관성
- 반복 LIVE 이벤트에 의한 자동 token 재요청 방지
- 공용 SSE adapter와 역할별 lifecycle 분리
- ended와 진행 중 token 응답 사이 race 차단

포기하거나 제한된 것:

- SSE 연결이 열리지 않으면 참여자는 대기 화면에 머문다.
- token 실패 복구는 사용자의 명시적인 재시도가 필요하다.
- 앱 프로세스가 종료되면 메모리 기반 viewer session은 복구되지 않는다.

## Result

- join form은 join API 성공 후 viewer route 이동까지만 수행한다.
- viewer waiting hook은 WAITING, REQUESTING_TOKEN, TOKEN_ERROR, READY,
  ROOM_ENDED 전이를 소유한다.
- token 오류 시 대기 화면에 다시 시도 버튼과 취소 버튼이 함께 표시된다.
- LIVE 이전 ended는 취소 불가능한 Alert로 안내하고 확인 후 피드로 이동한다.
- 실제 서버 SSE 순서와 실제 기기 LiveKit 연결 결과는 통합 테스트 후 이 항목에
  추가 기록한다.
