# ADR-0035: 회원 탈퇴 요청과 로컬 세션 종료 흐름

## Decision

회원 탈퇴를 사용자 Entity의 API mutation과 사용자 Feature의 탈퇴
use-case로 분리한다.

- `entities/user`는 `DELETE /users/me` 요청만 소유한다.
- `features/user/delete-account`는 확인, 중복 요청 방지, 오류 표시,
  탈퇴 성공 후 세션 종료 및 화면 이동을 소유한다.
- SecureStore의 access token과 refresh token 삭제는 서로 독립적으로 시도하고,
  저장소 삭제 실패와 인메모리 인증 상태 초기화를 분리한다.
- 서버 탈퇴 완료 후에는 로컬 저장소 정리 오류가 발생해도 App coordinator의
  Query cache 제거와 인증 진입 화면 이동을 완료한다.
- `pages/profile`은 로그인한 비게스트 회원에게만 탈퇴 메뉴를 노출하고
  Feature를 조합한다.
- 서버가 이미 탈퇴 유예 중인 계정에 오류 응답을 반환하더라도 Entity API
  adapter에서 완료 상태로 정규화한다.

API가 즉시 영구 삭제가 아닌 30일 탈퇴 유예를 생성하므로 내부 mutation은
`requestAccountWithdrawal`로 명명하고, 사용자에게 표시되는 메뉴만
`회원 탈퇴`로 표현한다.

## Context

기존 프로필 페이지는 로그아웃 확인과 세션 종료를 직접 처리하고 있지만
회원 탈퇴는 다음 lifecycle을 추가로 가진다.

- 복구 기간과 데이터 삭제 시점을 설명하는 파괴적 작업 확인
- 인증된 회원만 호출할 수 있는 서버 mutation
- 서버 성공 이후 모든 로컬 인증 정보와 사용자별 cache 제거
- 실패 시 현재 세션과 화면을 보존하는 실패 경계

서버는 일반 회원을 `DELETION_PENDING` 상태로 변경하고 모든 로그인 세션을
종료한다. 계정과 작성 데이터는 30일 동안 유지되며 같은 계정으로 다시
인증하면 복구할 수 있다. 게스트와 최고 관리자 계정은 요청할 수 없다.

운영 API는 이미 `DELETION_PENDING`인 계정의 반복 요청을 200이 아닌 오류로
반환한다. 이 상태는 탈퇴 use-case의 목표가 이미 달성된 경우이므로 일반
실패처럼 현재 세션을 유지하면 서버 상태와 앱 상태가 어긋난다.

Expo SecureStore의 `deleteItemAsync`는 저장값을 삭제하지 못하면 Promise를
reject한다. 두 토큰을 순차 삭제한 뒤 AuthStore를 초기화하면 첫 번째 삭제
실패가 두 번째 삭제와 인메모리 상태 초기화를 모두 막는다. 또한 탈퇴
Feature가 `await logout()` 다음에 cache와 navigation을 정리하면 같은 예외가
서버에서 이미 종료된 계정을 현재 화면에 남기는 문제가 된다.

## Alternatives

### Option A: Profile Page에서 API와 후처리를 모두 수행

변경 파일은 가장 적지만 Page가 HTTP 요청, 확인창, 인증 상태, cache와
navigation까지 소유하게 된다. 탈퇴 정책이나 완료 흐름이 변경될 때 Page의
책임이 더 커진다.

### Option B: Entity mutation을 두고 Profile Page에서 후처리

HTTP 경계는 Entity로 이동하지만 확인과 탈퇴 lifecycle은 여전히 Page에
남는다. Page가 사용자 use-case를 조합하는 수준을 넘어 직접 구현한다.

### Option C: Entity mutation과 Delete Account Feature 분리

Entity는 서버 계약을, Feature는 사용자 행동과 성공 이후 lifecycle을
소유한다. 파일 수는 늘지만 기존 FSD 책임과 피드 삭제 Feature의 패턴에
일치한다.

## Reason

Option C를 선택했다. 서버 요청 실패와 성공 이후 로컬 상태 변경을 분리해
실패한 탈퇴 요청이 세션이나 cache를 제거하지 않게 만들 수 있고, Page에는
표시 조건과 UI 조합만 남길 수 있기 때문이다.

데이터 흐름은 다음과 같다.

```text
Profile Page member menu
  ↓
Delete Account Feature
  ↓ confirm
User Entity mutation
  ↓ privateApiClient
DELETE /users/me
  ↓ success or already DELETION_PENDING
AuthStore logout
  ├ SecureStore token deletions (independent, best effort)
  └ in-memory auth reset (always)
  ├ userId transition → App coordinator → QueryClient clear
  └ finally → Expo Router auth entry
```

상태와 lifecycle 소유권은 다음과 같다.

- 서버 요청 상태: React Query mutation
- 확인창 lifecycle: `useConfirm` 플랫폼 adapter
- 로컬 인증 정보: `useAuthStore`
- 서버 데이터 cache lifecycle: App Root의 session identity coordinator
- 탈퇴 후 navigation: Delete Account Feature
- 메뉴 표시 여부: Profile Page가 access token과 `!isGuest`로 결정

Axios와 API base URL은 `privateApiClient` 뒤에 격리되어 있다. SecureStore는
AuthStore의 `logout` 뒤에, 네이티브와 Web 확인창 차이는 `useConfirm` 뒤에
격리되어 있으므로 Feature는 각 외부 구현을 직접 알지 않는다.

## Trade-off

얻은 것:

- 탈퇴 API 실패 시 기존 세션과 cache 보존
- 이미 탈퇴 유예 중인 계정도 완료로 처리해 서버와 앱의 인증 상태 일치
- 서버 성공 이후 이전 계정 데이터가 메모리에 남지 않도록 전체 Query
  cache 제거
- 게스트와 미로그인 상태에서 탈퇴 진입 차단
- 30일 유예라는 서버 정책을 정확히 반영한 안내
- Page, Feature, Entity의 책임 분리

제한:

- 최고 관리자 역할은 현재 프론트엔드 `UserProfile`에 모델링되어 있지 않아
  서버의 400 응답으로 처리한다.
- 전체 Query cache 제거는 사용자와 무관한 cache도 함께 비우지만 계정 전환
  시 이전 사용자 데이터가 남지 않는 안전성을 우선한다.
- SecureStore 삭제가 실패한 key 이름은 경고로 남기지만 토큰 값이나 오류
  객체는 기록하지 않는다. 실패한 저장값은 기기에 남을 수 있으나 서버가
  탈퇴 요청 성공 시 세션을 무효화하며, 앱의 현재 인증 상태와 cache 정리는
  저장소 실패와 독립적으로 완료한다.
- 이미 탈퇴 유예 중인지 판별하는 공식 오류 코드가 없어 현재 서버의
  `탈퇴 유예 중` 메시지에 의존한다. 백엔드가 반복 DELETE를 200으로
  처리하거나 안정적인 error code를 제공하면 이 호환 처리를 제거할 수 있다.

## Result

- 회원 탈퇴 행을 로그아웃 아래에 추가하고 로그인한 비게스트 회원에게만
  표시했다.
- 요청 중 중복 실행을 막고 실패 시 API 오류를 표시하도록 구현했다.
- 성공 후 AuthStore 세션을 정리하고 인증 진입 화면으로 이동하도록 구성했다.
- AuthStore의 `userId` 변경을 App coordinator가 감지해 React Query cache를
  정리하도록 변경해 탈퇴 Feature의 직접 QueryClient 의존성을 제거했다.
- 이미 탈퇴 유예 중인 서버 응답을 Entity API adapter에서 완료로 정규화해
  같은 로컬 후처리를 실행하도록 보완했다.
- access token 또는 refresh token 중 하나의 SecureStore 삭제가 실패해도 두
  삭제를 모두 시도하고 AuthStore 상태를 초기화하도록 보완했다.
- 탈퇴 Feature의 인증 진입 화면 이동을 `finally` 경계에 두어 `logout` 예외가
  navigation을 막지 않도록 했다. Cache 정리는 App coordinator가 담당한다.
- TypeScript 검사(`pnpm exec tsc --noEmit`)를 통과했다.
- 프로필 흐름 테스트 11개(`pnpm test:profile-flow`)를 통과했다.
- 인증 저장소의 삭제 및 부분 저장 실패 회귀 테스트 5개
  (`pnpm test:auth-session`)를 통과했다.
- iOS Metro export(`expo export --platform ios`)를 완료해 새 Feature의 public
  API와 경로 별칭이 실제 bundle에서 해석되는 것을 확인했다.
- ESLint 9 실행 파일은 존재하지만 저장소에 `eslint.config.*`가 없어 lint
  규칙 검사는 시작되지 않았다. 설정 자동 생성이나 패키지 변경은 하지
  않았다.
- Steiger는 `--watch=false`에서도 `EMFILE: too many open files`로 종료되어
  이번 실행에서는 FSD 검사 결과를 얻지 못했다.
- 실제 기기의 확인창, 서버 탈퇴 요청과 로그인 화면 이동은 수동으로 실행하지
  않았다.
