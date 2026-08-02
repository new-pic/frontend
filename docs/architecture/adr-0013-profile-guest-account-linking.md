# ADR-0013: 프로필 게스트 계정 연결과 사용자 데이터 경계

## Decision

게스트가 프로필에서 계정 연결을 시작할 때 guest session을 유지하고,
Auth store에 범용 `LINK_GUEST_ACCOUNT` entry intent를 설정한다.
Root router는 이 intent 동안 access token이 있어도 Welcome을 유지한다.
소셜 로그인 성공으로 `setSession()`이 호출되면 intent를 `DEFAULT`로
복구하고 프로필로 돌아간다.

소셜 로그인 Query는 호출 시 받은 `isGuest` snapshot으로 요청 mode를
결정한다. 게스트 계정 연결은 `privateApiClient`, 신규 로그인은
`apiClient`를 사용한다. 이 mode는 Google 이외의 provider도 재사용할 수
있는 domain 값으로 분리한다.

프로필 Query key에는 `userId` identity를 포함하고, RTC 촬영 사진
미리보기는 Query 성공과 실제 표시 가능한 사진 존재 여부에서 visibility를
파생한다.

## Context

기존 `prepareGoogleLink()`는 `isLoggedIn`만 false로 만들고 guest token은
유지했다. Root router는 access token 존재 여부로 Welcome 이탈을
판단했으므로 게스트가 계정 연결 CTA를 눌러도 Welcome에서 즉시 앱으로
돌아갈 수 있었다.

게스트도 서버가 만든 닉네임을 갖지만 프로필 `/users/me` Query가
비활성화돼 이를 표시하지 못했다. 같은 Query key를 회원과 공유하면 계정
연결 직후 이전 profile cache가 노출될 수도 있었다.

RTC 사진 미리보기는 실제 사진 존재 여부를 알기 전에 loading card를
표시해 빈 앨범이 있는 것처럼 보였다.

## Alternatives

### `isLoggedIn`을 인증 화면 표시 상태로 재사용

변경량은 작지만 token이 존재하면서 로그인되지 않았다는 모순된 상태가
생긴다. 향후 다른 소셜 provider의 계정 연결과 일반 재인증을 구분하기
어렵다.

### 계정 연결 전에 guest logout

public 소셜 로그인 흐름은 단순해지지만 guest token을 잃어 서버가 기존
게스트 계정과 소셜 계정을 연결할 수 없다.

### 로그인 성공 시 사용자 Query 전체 제거

기존 key를 유지할 수 있지만 로그인 feature가 사용자 cache 종류를 모두
알아야 하고, 새로운 계정 전환 경로마다 reset 호출이 필요하다.

### SecureStore 실패 시 임시 deviceId 사용

게스트 진입은 계속할 수 있지만 같은 기기라는 계약이 깨져 서버에 중복
게스트가 생성될 수 있다.

## Reason

계정 연결 intent는 세션의 존재와 인증 화면의 목적을 분리한다. guest
token은 private 계정 연결 요청에 계속 사용되며 CTA와 intent는 특정 소셜
provider 이름을 포함하지 않는다.

사용자 identity가 포함된 Query key는 프로필 cache의 소유자를 명확히
한다. 사진 preview visibility는 별도 state로 복제하지 않고 Query 결과에서
계산해 loading/empty 상태와 UI가 어긋나지 않게 한다.

deviceId는 SecureStore에 저장된 값 또는 저장에 성공한 신규 값만
반환한다. 저장 실패 시 로그인 자체를 실패시켜 중복 게스트 생성을
방지한다.

```text
Guest Profile
  ↓ prepare account link
AuthEntryIntent.LINK_GUEST_ACCOUNT
  ↓
Welcome
  ↓ selected social provider
Social Login Request Mode
  ├─ Guest → authenticated account link
  └─ Anonymous → public login
  ↓
setSession
  ↓ reset intent
Profile
```

## Trade-off

얻는 것:

- guest session을 잃지 않는 명시적인 계정 연결 lifecycle
- Google 외 provider가 재사용할 수 있는 CTA와 request mode
- 사용자별 profile cache 분리
- 같은 deviceId를 보장할 수 없을 때 중복 생성을 피하는 fail-closed 정책
- 빈 앨범이나 loading skeleton을 보여주지 않는 preview

포기하거나 제한된 것:

- Auth store와 Root router가 entry intent를 함께 이해해야 한다.
- SecureStore 장애 중에는 게스트 로그인을 사용할 수 없다.
- 사진 Query 오류는 프로필 카드에서 숨겨지며 별도 오류 카드를 제공하지
  않는다.
- 실제 중복 게스트 방지는 backend가 deviceId unique/upsert 정책을
  구현해야 한다.

## Result

- 프로필의 게스트 CTA를 provider 중립적인 `계정 연결하기`로 제공한다.
- CTA는 `returnTo=/profile`로 Welcome을 열고 연결 완료 후 프로필로
  복귀한다.
- 게스트도 `/users/me`를 조회해 서버 닉네임을 표시한다.
- 프로필 이미지가 없으면 회색 배경과 흰색 사용자 아이콘을 표시한다.
- 도움말을 하단 목록으로 이동하고 세 번째 빠른 메뉴를 저장한 피드로
  교체한다.
- RTC 촬영 사진 preview는 실제 사진이 있을 때만 렌더링한다.
