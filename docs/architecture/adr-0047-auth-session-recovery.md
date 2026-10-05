# ADR-0047: 앱 시작 인증 세션 복구와 실패 정책

## Decision

앱 시작 시 `restore-auth-session` use case가 SecureStore의 access/refresh token을 함께
읽고, 화면과 라우팅을 열기 전에 세션을 다음과 같이 복구한다.

```text
Root app lifecycle
  ↓
restore-auth-session
  ├─ token 없음                 → unauthenticated
  ├─ 유효 access + refresh      → runtime session 복원
  ├─ 만료 access + refresh      → refresh API → session 복원
  ├─ access만 존재              → 불완전 session 정리
  ├─ refresh 4xx / token 없음   → terminal logout
  └─ network / timeout / 5xx    → token 보존 + 재시도 화면
```

인증 상태는 `shared/model`의 auth store가 소유한다. refresh transport와 terminal 오류
분류는 `shared/api`가 담당하고, 앱 시작 복구 순서와 lifecycle은
`features/user/restore-auth-session`이 담당한다. 같은 feature가 재시도 UI를 제공하고,
Root layout은 use case를 시작한 뒤 `initializing`, `ready`, `recoverable-error` 상태에
따라 앱 라우팅과 복구 UI를 조립한다.

## Context

기존 초기화는 저장된 access token 하나만 읽어 만료 여부와 refresh token 존재 여부를
확인하지 않았다. 따라서 앱을 오랜만에 실행하면 만료된 token을 인증된 상태로 먼저
복원한 뒤 API 401에서 뒤늦게 갱신해야 했다.

동시에 기존 refresh 함수는 인증 거절뿐 아니라 네트워크 단절, timeout, 서버 5xx,
SecureStore 오류까지 모두 logout으로 처리했다. 일시적인 외부 실패가 영속 token
삭제로 전파되어 자동 로그인이 풀리는 원인이 될 수 있었다.

## Alternatives

### 모든 refresh 실패에서 즉시 logout

상태는 단순하지만 일시적인 통신 장애에도 사용자의 로그인 정보를 삭제하므로
채택하지 않았다.

### 만료된 access token도 우선 복원하고 첫 API 401에서 refresh

초기 진입은 빠르지만 화면이 열린 뒤 인증 상태가 바뀌고, 여러 초기 API 요청이 동시에
401을 만들 수 있어 채택하지 않았다.

### 앱 시작 전에 세션을 중앙 복구하고 실패를 분류

초기 화면 대기 시간이 refresh 요청만큼 늘 수 있지만 인증 상태가 확정된 뒤 라우팅되고,
일시적인 실패와 실제 만료를 구분할 수 있어 채택했다.

## Reason

로그아웃은 서버가 refresh token을 거절했거나 복구에 필요한 token이 없는 경우처럼
세션이 실제로 지속 불가능할 때만 수행해야 한다. 네트워크와 서버 가용성은 사용자
세션의 유효성과 다른 실패 축이므로 token을 보존하고 사용자가 같은 복구 작업을 다시
시도할 수 있게 한다.

## Trade-off

- 만료 token을 갱신하는 동안 첫 화면이 잠시 대기한다.
- 일시적 실패에서는 앱 본문 대신 명시적인 재시도 화면을 표시한다.
- HTTP 408, 429, 5xx와 응답 없는 통신 오류는 recoverable로 취급한다.
- 그 외 4xx는 refresh 요청 자체 또는 credential이 유효하지 않은 terminal 오류로
  취급한다.
- 서버가 refresh token rotation을 도입하면 refresh 응답과 저장 계약을 확장해야 한다.

## Result

- 유효한 access/refresh token은 네트워크 요청 없이 복원한다.
- 만료된 access token은 라우팅 전에 single-flight로 한 번 갱신한다.
- refresh 성공 시 기존 refresh token을 다시 쓰지 않고 access token만 교체한다.
- recoverable 오류에서는 SecureStore token을 삭제하지 않고 재시도 화면을 표시한다.
- terminal 오류와 불완전 session만 logout 경로로 정리한다.
