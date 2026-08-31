# ADR-0038: Session identity와 Query cache lifecycle

## Decision

인증 Session의 안정적인 identity는 Access Token이 아니라 Access Token에서
decode한 `userId`로 정의한다. Access Token은 refresh 과정에서 교체될 수 있지만
같은 계정의 `userId`는 유지되기 때문이다.

HTTP request에 `userId`가 없더라도 현재 사용자에 귀속되는 응답을 저장하는
React Query leaf key에는 `userId`를 포함한다. Query key는 request parameter의
복사본이 아니라 응답을 유일하게 결정하는 identity를 표현한다.

Session이 아직 없을 때 Query key는 임의의 문자열 identity를 만들지 않고
`null`을 그대로 포함한다. Query key는 비세션 상태를 표현할 뿐 요청 권한을
제어하지 않는다. 선언형 Query는 `enabled`로 자동 실행을 막고, 사용자 귀속
`queryFn`은 `userId`를 다시 확인하고 회원 전용 Query는 Guest 여부도 확인해
수동 `refetch()`나 잘못된 명령형 호출도 HTTP 요청 전에 실패시킨다.

현재 사용자 프로필인 `GET /users/me`는 Guest에게도 서버가 생성한 닉네임을
반환하는 사용자 Session Query이므로 Guest 여부로 차단하지 않는다. 차단 사용자
목록과 차단·해제도 Guest Session에 허용한다. 반면 프로필 수정과 회원 탈퇴처럼
Member에게만 허용된 endpoint는 Guest guard를 유지한다. Guest 여부는 cache
identity가 아니라 endpoint 접근 정책이다.

각 Entity의 `model` segment가 Query key factory를 소유한다. 하나의 Entity
안에서도 변경 이유가 다른 조회군은 factory module과 namespace를 나누되,
동일 자원을 나타내는 root identity는 공유한다. 여러 실제 Query를 선택하기
위한 prefix key는 복수형 함수로, 단일 cache entry를 식별하는 leaf key는
단수형 함수로 정의한다. Leaf factory는 문자열을 중복하지 않고 반드시 자신의
prefix factory에서 파생한다.

```text
userFeedQueryKeys.savedFeedLists()
  = ["feed", "me", "saved-feeds"]

userFeedQueryKeys.savedFeedList(userId, params)
  = [...savedFeedLists(), userId, params]
```

`userFeedQueryKeys`는 현재 사용자 기준 Feed collection을 구분하는 namespace다.
별도의 `user` cache root를 만들지 않고 `feedQueryKeys.all`에서 파생하므로 Feed
전체 cache invalidation과 사용자별 collection identity를 함께 보존한다.

현재 코드에서 `userId`가 포함된 사용자 귀속 Query는 다음과 같다.

| 사용자 데이터      | 실제 endpoint               | Query key identity    |
| ------------------ | --------------------------- | --------------------- |
| 내 프로필          | `GET /users/me`             | `userId`              |
| 내가 작성한 피드   | `GET /users/me/feeds`       | `userId` + pagination |
| 좋아요한 피드      | `GET /users/me/liked-feeds` | `userId` + pagination |
| 저장한 가이드 피드 | `GET /users/me/references`  | `userId` + pagination |
| 차단한 사용자      | `GET /users/me/blocks`      | `userId` + pagination |
| 내 RTC 촬영 사진   | `GET /users/me/photos`      | `userId` + pagination |

세션 전환에 따른 전체 cache 초기화는 App Root의
`SessionIdentityQueryCacheCoordinator`가 담당한다. Coordinator는
`useAuthStore`의 `userId` 변화를 구독하고 이전 값과 다르면
`QueryClient.clear()`를 실행한다.

상태 시스템의 책임은 다음과 같이 분리한다.

- Auth Store: 인증 상태, Session identity, SecureStore 영속화와 복원
- React Query: 서버 상태 Query/Mutation cache
- App Root: Auth Store의 identity 전환과 Query cache lifecycle 조합
- Feature/Page: 로그인, 로그아웃, 계정 연결, 회원 탈퇴와 navigation 흐름

Auth Store와 개별 인증 Feature는 `QueryClient`를 직접 참조하지 않는다.
회원 탈퇴 Feature도 서버 요청 성공 후 `logout()`과 navigation만 수행하며,
cache 제거는 `userId` 전환을 관찰하는 App coordinator에 위임한다.

## Context

`/users/me` 계열 endpoint는 URL이나 request parameter에 사용자 ID가 없어도
Authorization header의 Session에 따라 서로 다른 결과를 반환한다. Pagination
parameter만 Query key에 사용하면 같은 앱 실행 중 Member A의 응답과 Member B의
응답이 동일한 cache entry를 공유할 수 있다.

Access Token 자체를 key에 넣으면 같은 사용자가 token을 refresh할 때마다 새
cache가 생성된다. 이는 데이터 소유자는 변하지 않았는데 transport credential이
바뀌었다는 이유만으로 cache identity가 달라지는 문제를 만든다.

기존 cache cleanup은 Session 종료 경로마다 달랐다. 회원 탈퇴 Feature는
`QueryClient.clear()`를 직접 호출했지만 일반 로그아웃과 refresh 실패는 같은
책임을 소유하지 않았다. 로그인·계정 연결·Session 복원 경로가 늘어날수록 각
Feature가 cache 정리를 기억해야 했고, 누락 시 이전 사용자의 서버 상태가 남을
수 있었다.

Auth Store에는 과거 게스트 계정 연결을 위해 `isLoggedIn`이 별도 저장되어
있었다. 당시에는 guest Access Token을 보존하면서 인증 진입 화면을 표시해야
했으므로 token 존재 여부와 화면 진입 의도를 분리할 상태가 필요했다. 현재는
`authEntryIntent=LINK_GUEST_ACCOUNT`가 이 UI/navigation 의도를 명시적으로
담당한다. 일반 인증 여부는 `Boolean(accessToken)`으로 파생할 수 있으므로
`isLoggedIn`을 함께 저장하면 다음처럼 모순되는 상태가 가능했다.

```text
accessToken exists + isLoggedIn false
accessToken missing + isLoggedIn true
```

`userId`에도 과거 외부 `setUserId`가 있었지만, 현재 Access Token에서 사용자
ID를 decode할 수 있다. 외부 setter를 유지하면 token과 무관한 ID를 주입해
Session credential과 Session identity가 서로 달라질 수 있다.

## Alternatives

### Option A: 인증 경로마다 필요한 Query cache를 직접 제거

변경 지점에서 후처리가 명시적이지만 각 Feature가 Query cache 구조를 알아야
한다. 새로운 Session 전환 경로가 cache cleanup을 누락하기 쉽고 회원 탈퇴처럼
도메인 Feature가 React Query lifecycle에 결합된다.

### Option B: Auth Store가 QueryClient를 직접 소유

모든 `setSession()`과 `logout()`에서 cache를 정리할 수 있지만 인증 상태
저장소가 서버 상태 라이브러리에 의존한다. Provider 밖에서 Auth Store를
사용하거나 독립적으로 테스트하기 어려워진다.

### Option C: 사용자별 Query key와 App coordinator를 함께 적용

사용자 귀속 cache에는 `userId`를 명시하고, Session identity 전환의 전체
정리는 App composition boundary가 담당한다. 두 상태 시스템은 서로를 직접
참조하지 않으면서 App lifecycle에서만 조합된다.

### Option D: Access Token을 Query key identity로 사용

request credential과 cache 소유자가 직접 연결되지만 token refresh마다 동일
사용자의 cache가 분리된다. Token 값이 개발 도구의 Query key에 노출되는 것도
적절하지 않다.

## Reason

Option C를 선택했다. `userId`는 사용자 귀속 cache의 소유자를 명시하고,
App coordinator는 Query key에 사용자 identity가 포함되지 않은 cache와
mutation cache까지 Session 전환 시 제거하는 안전 경계를 제공한다.

인증 상태에서는 다음 invariant를 적용한다.

```text
Session identity = decode(accessToken).userId

Authenticated = Boolean(accessToken)

Auth entry navigation
  = Boolean(accessToken) + authEntryIntent
```

따라서 `userId` 상태 자체는 Query key와 사용자별 UI를 위해 유지하지만,
`setUserId`는 제거한다. `userId`는 `setSession()`과
`initializeAuthState()`에서 Access Token decode 결과로만 설정되고
`logout()`에서 token과 함께 `null`로 초기화된다.

`isLoggedIn`도 제거한다. 인증 여부는 Access Token에서 파생하고, guest token을
유지한 채 Welcome에 머물러야 하는 계정 연결 의도는 `authEntryIntent`가
담당한다. 이를 통해 Store에 서로 모순될 수 있는 파생 상태를 저장하지 않는다.

Session 전환별 cache 정책은 다음과 같다.

| 전환                        | `userId` 변화          | Query cache 결과 |
| --------------------------- | ---------------------- | ---------------- |
| Member A → logout           | `A → null`             | 전체 clear       |
| Guest → Member account link | `Guest ID → Member ID` | 전체 clear       |
| Member A → Member B         | `A → B`                | 전체 clear       |
| Access Token refresh        | `A → A`                | 유지             |

```text
Login / logout / account link / withdrawal / refresh failure
  ↓
AuthStore.setSession or AuthStore.logout
  ↓
userId transition
  ↓
App SessionIdentityQueryCacheCoordinator
  ↓ changed
QueryClient.clear
```

## Trade-off

얻은 것:

- 계정 전환 시 이전 사용자의 cache 노출 방지
- Session 변경 위치와 무관한 일관된 cache cleanup
- token refresh 시 동일 사용자 cache 재사용
- Auth Store와 React Query의 직접 결합 제거
- 비세션 상태를 `null`로 명시하고 실행 권한과 cache identity를 분리
- prefix/leaf factory 계층으로 cache 선택 범위와 실제 entry 구분
- `isLoggedIn` 제거로 파생 상태 불일치 가능성 축소
- `setUserId` 제거로 token과 사용자 identity의 불일치 방지
- collection prefix 기반 invalidation 유지

제한:

- `QueryClient.clear()`는 공개 데이터와 mutation cache도 제거하므로 Session
  전환 직후 필요한 데이터를 다시 요청한다.
- 일반 `GET /feed` 목록과 `GET /feed/{feedId}` 상세 응답에는 `isLiked`,
  `isPicked` 같은 사용자별 필드가 있지만 현재 leaf key에는 `userId`가 없다.
  Session 전환 시 App coordinator가 전체 cache를 제거해 사용자 간 재사용을
  막지만, key 자체만으로 응답 identity를 완전히 표현하지는 않는다.
- 댓글 응답은 차단 관계에 따라 달라질 수 있지만 현재 댓글 Query key에도
  `userId`가 없다. 이 cache도 Session 전환 시 전체 clear에 의존한다.
- lifecycle은 `userId` 전환을 기준으로 하므로 동일 사용자의 Access Token
  교체는 cache를 제거하지 않는다.
- App coordinator는 인증 초기화가 끝난 뒤 Query provider 내부에 mount된다.
  초기 Session 복원 시점에는 이전 runtime Query cache가 없다는 현재 App
  lifecycle을 전제로 한다.
- Auth Store의 FSD 위치는 변경하지 않았으며 ADR-0034의 보류 결정을 유지한다.

## Result

- `/users/me`, 내 피드, 좋아요 피드, 저장 피드, 차단 사용자와 내 RTC 사진의
  Query key에 `userId`를 포함했다.
- App Root에 Session identity coordinator를 추가했다.
- 회원 탈퇴 Feature의 직접 `QueryClient.clear()` 의존성을 제거했다.
- `isLoggedIn`과 `setUserId`를 Auth Store에서 제거했다.
- 인증 여부 소비자는 Access Token 존재 여부를 사용하고 계정 연결 진입은
  `authEntryIntent`로 유지했다.
- `userId`는 Session 설정과 복원 시 Access Token에서만 계산된다.
- HTTP endpoint, request body와 query parameter에는 `userId`를 추가하지 않았다.
- `anonymous` placeholder를 제거하고 비세션 Query identity는 `null`로
  표현한다.
- 사용자 귀속 Query는 `enabled`와 `queryFn` guard를 함께 적용한다.
- 현재 사용자 프로필 Query는 Guest Session에서도 활성화해 서버가 생성한
  닉네임을 표시한다.
- 차단 사용자 목록과 차단·해제는 Guest Session에서도 허용하고, 프로필 수정과
  회원 탈퇴처럼 Member 전용인 요청만 Guest를 차단한다.
- Query key factory는 Entity `model`에서 소유하고 prefix는 복수형 함수,
  leaf는 단수형 함수로 구성한다.
- 과거 `[["user"], "user", ...]` 형태의 중첩 root를 Entity 단일 root로
  정규화했다.
- 피드 상세의 `mine`, `saved`, `liked` collection Query는 `userId`가 있고
  Guest가 아닌 Session에서만 활성화하며, `public` source는 인증 상태와
  무관하게 유지했다.
