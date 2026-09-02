# ADR-0016: RTC 참여자 LiveKit 토큰 식별자

## Decision

참여자 LiveKit 토큰 요청은 촬영자용 방 endpoint와 분리된
`POST /rtc/participants/{participantId}/livekit-token`을 사용한다.

토큰 발급 use case에는 `roomId`와 `participantId`를 함께 전달한다.
네트워크 요청 경로에는 `participantId`만 사용하고, 응답을 RTC store에
적용하기 전 현재 Viewer session의 두 ID가 요청과 모두 같은지 검증한다.

```text
6자리 코드 참여
        ↓
{ roomId, participantId }
        ↓
Viewer token request
        ├─ participantId → API path
        └─ roomId + participantId → stale response guard
        ↓
LiveKitConnection(role: VIEWER)
```

## Context

코드 참여 응답은 방 식별자와 참여자 식별자를 함께 반환한다. 참여자용
LiveKit endpoint의 path parameter는 방 ID가 아니라 이 응답의
`participantId`다.

토큰 발급이 실패하면 코드 참여 요청을 반복하지 않고 기존 참여 결과로
토큰 단계만 재시도한다. 이때 사용자가 다른 방 참여를 시작하면 이전
요청의 늦은 응답이 새로운 Viewer session을 덮어쓰지 않아야 한다.

## Alternatives

### participantId만 token mutation에 전달

API 요청에는 충분하지만 응답 시 동일 참여자인지 확인할 수 있어도 어느
방에서 시작된 요청인지 함께 검증할 수 없다.

### roomId와 participantId를 함께 전달

API에는 필요한 participantId만 사용하면서 store 반영 경계에서는 두
식별자를 모두 검증할 수 있다. 요청 타입이 한 필드 더 커지지만 세션
lifecycle과 stale-response 처리 의도가 명확하다.

## Reason

서버 endpoint의 식별자 계약을 정확히 따르면서 비동기 응답을 현재
Viewer session에만 적용하기 위해 두 식별자를 함께 유지하는 방식을
선택했다. Host 토큰과 Viewer 토큰은 서로 다른 query와 endpoint를
사용하며 Viewer entry lifecycle에는 실제 연결에 필요한 URL과 token만 노출한다.

## Trade-off

얻는 것:

- 참여자 ID를 사용하는 정확한 LiveKit 토큰 요청
- 토큰 발급 재시도 시 코드 참여 API 중복 호출 방지
- 방 변경 중 늦게 도착한 응답의 store 오염 방지
- Host와 Viewer 네트워크 경계 분리

포기하는 것:

- participantId 하나만 전달하는 더 작은 mutation 인자

## Result

- Join 응답의 `participantId`를 재시도 상태에 함께 보관한다.
- Viewer token path는 `participantId`를 사용한다.
- `roomId` 또는 `participantId`가 다른 응답은 LiveKit connection에
  적용하지 않는다.
- 현재 세션 일치 및 ID trim 동작을 단위 테스트로 검증했다.
