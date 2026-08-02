# ADR-0029: 로그인 이용약관 동의 상태와 세션 경계

## Decision

이용약관 동의 상태는 `useAuthStore`가 소유한다. 로그인 전 상태는
메모리에서 관리하고, 별도의 SecureStore key로 영속화하지 않는다.
SecureStore에 access token이 존재하면 서버가 이전 로그인에서 동의를
확인한 세션으로 간주해 `termsAgreed`를 `true`로 복원한다.
활성 token이 있는 동안에는 이 상태를 `false`로 변경할 수 없고,
로그아웃이 token과 동의 상태를 함께 초기화한다.

Google과 Guest 로그인 요청 및 응답의 `termsAgreed`는 entity Zod
schema에서 검증한다. 응답이 동의 완료 상태가 아니면 auth store가
토큰 저장을 거부한다.

Welcome UI는 동의 전 로그인 버튼을 누르면 안내 Alert를 표시하고
요청을 시작하지 않는다. 로그인 use-case도 같은 조건을 다시
검사한다. 이용약관 링크가 정상적으로 열린 경우에는 동의 상태를
`true`로 변경한다.

## Context

기존 로그인 흐름은 Google 요청의 `idToken`, Guest 요청의 `deviceId`,
응답의 access/refresh token만 처리했다. 서버 DTO에 boolean
`termsAgreed`가 추가되면서 다음 경계가 필요해졌다.

- 두 로그인 요청에서 동의 상태 전송
- 두 로그인 응답에서 서버가 확정한 동의 상태 검증
- 로그인 전 UI 상태와 로그인 후 세션 상태의 일관성
- 기존 토큰 보유 사용자의 하위 호환
- 로그아웃과 토큰 갱신 lifecycle에서 동의 상태 유지 및 초기화

## Alternatives

### Option A: auth store 상태와 토큰 기반 복원

로그인 전 동의는 Zustand 메모리에만 저장한다. 로그인 성공 후에는
토큰 존재를 동의가 완료된 세션의 증거로 사용한다.

### Option B: 동의 여부를 별도 SecureStore key로 저장

로그인 전 동의까지 앱 재실행 후 복원할 수 있지만 서버 응답, 토큰,
로컬 동의 key가 서로 달라질 수 있다. 로그아웃과 계정 연결에서
삭제하고 동기화할 상태도 늘어난다.

### Option C: Welcome 화면의 로컬 state로만 관리

구현은 간단하지만 UI 외부에서 로그인 use-case를 호출하면 동의
검사를 우회할 수 있고, Guest 계정 연결 및 토큰 복원과 상태를 공유할
수 없다.

## Reason

Option A를 선택했다. 프로젝트의 세션 진실 공급원인 SecureStore
token과 동의 상태를 하나의 불변식으로 유지하면서도 로그인 전
사용자 입력은 auth store에서 모든 인증 흐름이 공유할 수 있기
때문이다.

요청과 응답은 모두 Zod로 검증한다. TypeScript 타입만 사용하는
방식은 서버 필드가 누락되거나 boolean이 아닌 값을 반환하는 경우를
런타임에서 차단할 수 없기 때문이다.

```text
Welcome Checkbox / Terms Link
  ↓
AuthStore.termsAgreed
  ↓
Social Login Use Case Guard
  ↓
Google or Guest Request Schema
  ↓
Auth API
  ↓
Login Response Schema
  ↓
AuthStore.setSession Guard
  ↓
SecureStore Tokens
```

## Trade-off

얻은 것:

- UI Alert와 use-case에서 동의 전 로그인을 이중 차단
- 서버 DTO의 요청과 응답을 런타임에서 검증
- 기존 token 보유 사용자를 별도 마이그레이션 없이 동의 완료로 처리
- Guest에서 Google 계정 연결 시 기존 세션 동의를 재사용
- 활성 세션에서 token과 동의 상태의 불변식 유지
- 로그아웃 시 token과 메모리 동의 상태를 함께 초기화

제한:

- 로그인하지 않은 사용자가 체크한 상태는 앱 재시작 후 유지되지 않는다.
- 기존 token 보유자는 약관 버전과 관계없이 동의 완료로 간주한다.
- 향후 약관 버전별 재동의가 필요하면 서버의 agreement version과
  별도 migration 정책이 필요하다.

## Result

- Welcome 최하단에 공용 Gluestack Checkbox와 이용약관 링크를
  배치했다.
- 링크 열기에 성공하면 체크 상태가 활성화된다.
- Google과 Guest 요청 body에 `termsAgreed`가 포함된다.
- 두 로그인 응답의 `termsAgreed`를 검증하고 false 세션의 token
  저장을 차단한다.
- 저장된 access token은 동의 완료 상태로 복원되고 로그아웃 시
  동의 상태가 초기화된다.
- 공용 Checkbox를 NativeWind v5 변환 경계에 맞춰 수정했다.
