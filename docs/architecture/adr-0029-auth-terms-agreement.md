# ADR-0029: 로그인 이용약관 동의 상태와 세션 경계

## Decision

이용약관 동의 상태는 `useAuthStore`가 소유한다. 로그인 전 상태는
메모리에서 관리하고, 별도의 SecureStore key로 영속화하지 않는다.
SecureStore에 access token이 존재하면 서버가 이전 로그인에서 동의를
확인한 세션으로 간주해 `termsAgreed`를 `true`로 복원한다.
활성 token이 있는 동안에는 이 상태를 `false`로 변경할 수 없고,
로그아웃이 token과 동의 상태를 함께 초기화한다.

Apple, Google과 Guest 로그인 요청 및 응답의 `termsAgreed`는 entity Zod
schema에서 검증한다. 응답이 동의 완료 상태가 아니면 auth store가
토큰 저장을 거부한다.

`setSession()`은 Access Token과 Refresh Token이 모두 SecureStore에 저장된
뒤에만 전달받은 새 runtime Session을 활성화한다. 둘 중 하나라도 저장에
실패하면 두 인증 key의 삭제를 모두 시도하고 원래 저장 오류를 호출자에게
반환한다.

```text
setSession으로 새 Runtime Session 활성화
  ⇒ Access Token persisted
  AND Refresh Token persisted
```

SecureStore의 인증 key 이름은 `AUTH_SESSION_STORAGE_KEYS`가 단일 소유한다.
Session 저장·삭제뿐 아니라 Refresh Token 조회도 이 상수를 사용한다.

Welcome UI는 미동의 사용자가 진입하면 약관 BottomSheet를 자동으로 열어,
링크를 누르지 않아도 계정 정보, 사진 및 작성 콘텐츠의 처리 목적과 상세
정책에서 확인할 항목을 볼 수 있도록 한다. 전체 이용약관 및 개인정보
처리방침은 외부 문서로 연결하되, 문서를 연 행위와 동의는 분리한다.
BottomSheet의 체크박스는 로컬 임시 상태만 변경하고, 사용자가
`동의하고 계속`을 선택할 때만 auth store의 동의 상태를 갱신한다.

약관은 닫을 수 있으며 Welcome 하단의 약관 보기 Action으로 다시 열 수 있다.
동의 전 로그인 버튼을 누르면 BottomSheet를 다시 표시하고 요청을 시작하지
않는다. 로그인 use-case도 같은 조건을 다시 검사한다.

## Context

기존 로그인 흐름은 Google 요청의 `idToken`, Guest 요청의 `deviceId`,
응답의 access/refresh token만 처리했다. 서버 DTO에 boolean
`termsAgreed`가 추가되면서 다음 경계가 필요해졌다.

- 각 로그인 요청에서 동의 상태 전송
- 각 로그인 응답에서 서버가 확정한 동의 상태 검증
- 로그인 전 UI 상태와 로그인 후 세션 상태의 일관성
- 기존 토큰 보유 사용자의 하위 호환
- 로그아웃과 토큰 갱신 lifecycle에서 동의 상태 유지 및 초기화
- 별도 key에 저장되는 두 token 중 하나만 남는 부분 영속 상태 방지

SecureStore는 Access Token과 Refresh Token을 서로 다른 key에 저장하므로 두
`setItemAsync()`는 하나의 transaction이 아니다. Access Token 저장 후 Refresh
Token 저장이 실패하면 별도 보상 작업이 없을 때 다음 앱 실행에서 불완전한
Session을 복원할 수 있다. 반대로 token 저장이 끝나기 전에 Zustand 상태를
갱신하면 영속화되지 않은 runtime Session이 활성화될 수 있다.

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

### Session 저장 실패 처리 대안

첫 번째 token 저장 성공을 그대로 두고 오류만 반환하면 다음 실행에서
부분 Session을 복원할 수 있다. 두 token을 저장하기 전에 runtime state를 먼저
활성화하면 SecureStore 실패 후 메모리와 영속 상태가 달라진다.

현재 구현은 두 write가 모두 성공한 뒤 runtime state를 commit하고, 하나라도
실패하면 두 key를 삭제하는 보상 rollback을 선택한다. SecureStore가 다중 key
transaction을 제공하지 않으므로 완전한 원자성은 아니지만, runtime Session이
부분 영속 상태를 정상 Session으로 취급하지 않도록 실패 경계를 유지한다.

## Reason

Option A를 선택했다. 프로젝트의 세션 진실 공급원인 SecureStore
token과 동의 상태를 하나의 불변식으로 유지하면서도 로그인 전
사용자 입력은 auth store에서 모든 인증 흐름이 공유할 수 있기
때문이다.

Session 저장은 transaction을 지원하지 않는 두 SecureStore write를 순차
실행하되 runtime state update를 commit 지점으로 사용한다. 두 write가 모두
성공하기 전에는 runtime Session을 변경하지 않는다. 저장 오류가 발생하면
`clearPersistedAuthSession()`으로 두 key 모두 삭제를 시도한 뒤 원래 오류를
다시 throw한다. Rollback 삭제에 실패한 key는 token 값이나 원본 오류를
노출하지 않고 key 이름만 경고로 기록한다.

요청과 응답은 모두 Zod로 검증한다. TypeScript 타입만 사용하는
방식은 서버 필드가 누락되거나 boolean이 아닌 값을 반환하는 경우를
런타임에서 차단할 수 없기 때문이다.

```text
Welcome Entry (when terms are not agreed)
  ↓ auto-present BottomSheet
Legal Summary + optional full document link
  ↓ explicit checkbox (local draft)
Agree and Continue
  ↓
AuthStore.termsAgreed
  ↓
Social Login Use Case Guard
  ↓
Apple, Google or Guest Request Schema
  ↓
Auth API
  ↓
Login Response Schema
  ↓
AuthStore.setSession Guard
  ↓
Decode Session identity from Access Token
  ↓
Persist Access Token
  ↓
Persist Refresh Token
  ├─ failure → clear both keys → throw
  └─ success
      ↓
Activate Runtime Session
```

## Trade-off

얻은 것:

- Welcome UI와 use-case에서 동의 전 로그인을 이중 차단
- 링크 접근 여부와 명시적 동의 상태 분리
- 진입 시 BottomSheet가 자동으로 열려 링크 없이 주요 데이터 처리 대상과
  목적 확인 가능
- 약관 안내를 중앙 로그인 레이아웃에서 분리해 기존 배치 유지
- BottomSheet 내부 스크롤로 작은 화면에서도 전체 안내와 동의 Action에 접근
- 체크만 하고 시트를 닫은 경우 동의로 확정되지 않는 명시적 제출 구조
- 서버 DTO의 요청과 응답을 런타임에서 검증
- 기존 token 보유 사용자를 별도 마이그레이션 없이 동의 완료로 처리
- Guest에서 Google 계정 연결 시 기존 세션 동의를 재사용
- 활성 세션에서 token과 동의 상태의 불변식 유지
- 두 token이 모두 영속화된 뒤에만 runtime Session 활성화
- 일부 token 저장 실패 시 두 인증 key rollback
- Session 저장·삭제·refresh 조회가 같은 storage key 상수 사용
- 로그아웃 시 token과 메모리 동의 상태를 함께 초기화

제한:

- 로그인하지 않은 사용자가 체크한 상태는 앱 재시작 후 유지되지 않는다.
- 기존 token 보유자는 약관 버전과 관계없이 동의 완료로 간주한다.
- 향후 약관 버전별 재동의가 필요하면 서버의 agreement version과
  별도 migration 정책이 필요하다.
- 현재 공개 문서는 이용약관과 개인정보 처리방침을 하나의 URL로 제공한다.
  문서가 분리되면 각 목적에 맞는 링크를 별도로 노출해야 한다.
- SecureStore가 저장과 rollback 삭제 모두 실패하면 일부 token이 기기에 남을
  수 있다. 이 경우 runtime Session은 새 값으로 활성화하지 않고 실패 key만
  경고로 남긴다.
- 기존 Guest 또는 Member runtime Session이 있는 상태에서 새 Session 저장이
  실패하면 새 값으로 교체하지 않고 기존 runtime 상태를 유지한다. Rollback은
  영속 token key를 정리하므로 다음 앱 실행에서는 해당 기존 Session을 복원하지
  않는다.

## Result

- Welcome 진입 시 데이터 처리 핵심 안내, 전체 문서 링크와 공용 Gluestack
  Checkbox를 담은 BottomSheet가 자동으로 표시된다.
- 중앙 로그인 영역에서는 약관 Card를 제거하고 하단 재진입 Action만 남겨
  기존 로그인 배치를 보존했다.
- 약관 BottomSheet는 작은 화면에서도 안내와 동의 Action에 접근할 수 있도록
  내부 스크롤을 사용한다.
- 전체 문서를 열어보는 동작은 동의 상태를 변경하지 않으며 체크박스의
  선택 후 `동의하고 계속`을 누른 경우에만 동의로 처리한다.
- Apple, Google과 Guest 요청 body에 `termsAgreed`가 포함된다.
- 각 로그인 응답의 `termsAgreed`를 검증하고 false 세션의 token
  저장을 차단한다.
- 저장된 access token은 동의 완료 상태로 복원되고 로그아웃 시
  동의 상태가 초기화된다.
- Access Token과 Refresh Token 저장이 모두 성공한 경우에만 runtime Session을
  활성화하고 일부 저장 실패 시 두 인증 key를 rollback하도록 보완했다.
- Refresh Token 조회의 직접 문자열을 제거하고
  `AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN`을 사용하도록 통일했다.
- 공용 Checkbox를 NativeWind v5 변환 경계에 맞춰 수정했다.
- 약관 및 소셜 로그인 회귀 테스트 12개를 현재 Session 상태 계약에 맞게
  갱신하고 통과했다.
- 공용 BottomSheet 테스트 4개는 기존 구현 시점에 통과했다.
- TypeScript 검사(`pnpm exec tsc --noEmit`)를 통과했다.
- iOS Metro export를 완료해 BottomSheet, Card와 CheckboxLabel이 실제
  bundle에서 해석되는 것을 확인했다.
- 저장소에 ESLint 9 설정 파일이 없어 lint는 실행하지 못했다.
- 실제 기기에서의 자동 표시, 작은 화면 스크롤, 시트 재진입과 외부 문서
  이동은 수동으로 실행하지 않았다.
