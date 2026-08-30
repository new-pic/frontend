# ADR-0039: API와 Query Key를 사용 사례 및 Cache Identity로 배치

## Decision

서버 요청을 Entity에 일괄 배치하지 않고, 요청을 발생시키는 사용 사례와
cache identity의 공유 범위를 서로 독립적으로 판단한다.

- 한 Feature의 사용자 행동에만 필요한 query/mutation은 해당 Feature의
  `api`가 소유한다.
- 한 Page slice에서만 사용하는 조회는 해당 Page의 `api`가 소유한다.
- Widget 내부에서만 사용하는 조회는 해당 Widget의 `api`가 소유한다.
- 여러 상위 slice가 동일한 서버 자원을 공유하는 조회와 DTO/schema는
  Entity에 유지한다.
- Query Key root와 여러 기능이 invalidate하는 prefix는 Entity가 제공한다.
- Feature/Page/Widget 전용 조회의 leaf factory는 해당 소비 slice가
  소유하되 Entity prefix에서 파생한다.
- Mutation은 독립 cache identity가 없으므로 별도 Query Key를 만들지 않고,
  영향을 주는 Entity prefix 또는 shared resource key를 갱신한다.
- TanStack Query가 lifecycle을 관리하는 query/mutation hook과 외부에서
  재사용하는 query options factory는 소유 slice의 `...Query` module
  namespace를 통해 호출한다.

이 결정은 ADR-0034의 “서버 요청과 React Query lifecycle은 `api`에 둔다”는
세그먼트 원칙을 유지하면서, 해당 `api`가 어느 레이어에 속하는지를
구체화한다. ADR-0037의 “Feed collection query는 모두 Feed Entity가
소유한다”는 결정은 이 문서의 사용 사례 소유권 규칙으로 대체한다.

## Context

기존 구조에서는 주요 요청 hook이 `entities/feed`, `entities/user`,
`entities/rtc-room`, `entities/rtc-session`, `entities/rtc-stored-photo`의 경계가
분리되기 전에는 RTC 관련 API와 런타임 책임이 하나의 Slice에 집중되어 있었다.
이 때문에 다음과 같은 사용자 행동도 Entity가 직접 소유했다.

- 소셜 로그인과 회원 탈퇴
- 콘텐츠 신고와 사용자 차단
- 댓글 작성, 피드 생성·수정·삭제
- 피드 좋아요와 저장
- RTC 방 생성·종료·참여 및 token 발급
- Camera Guide 전용 pose/background-removal 조회

Feature의 model과 UI는 Entity mutation을 호출하는 얇은 wrapper가 되었고,
하나의 Entity query 파일이 여러 변경 이유와 실패 lifecycle을 함께
가졌다.

반대로 요청 hook을 호출 위치로만 옮기면서 Query Key root까지 각 slice에
독립적으로 만들면 동일한 Feed/User/RTC 서버 상태가 서로 다른 cache로
중복될 수 있다. 그러면 좋아요, 저장, 차단, 삭제 이후 한 화면만 갱신되고
다른 화면은 stale data를 유지할 수 있다.

따라서 코드 소유권과 cache identity를 분리해 판단해야 했다.

## Alternatives

### Option A: 모든 도메인 요청을 Entity에 유지

cache key와 invalidation을 찾기 쉽지만 Entity가 사용자 행동과 화면 전용
lifecycle까지 소유한다. Feature 단위 변경·삭제가 어렵고 대형 query 파일의
충돌 범위가 계속 커진다.

### Option B: 사용처별 API와 독립 root key를 함께 생성

각 slice의 응집도는 높지만 동일 서버 자원이 여러 cache identity로
분리된다. 같은 레이어 Feature 간 import가 금지되므로 다른 Feature의 key를
직접 invalidate할 수도 없다.

### Option C: 요청 hook은 사용 사례로 이동하고 Entity cache namespace 공유

API lifecycle은 Feature/Page/Widget이 소유한다. DTO/schema, 공유 resource
key와 invalidate prefix는 Entity에 남기고, 전용 조회 leaf만 소비 slice가
정의한다.

## Reason

Option C를 선택했다. FSD의 책임 기반 배치와 TanStack Query의 cache identity
요구를 동시에 만족하기 때문이다.

기본 데이터 흐름은 다음과 같다.

```text
Feature / Page / Widget UI
  ↓
소비 slice의 api hook
  ↓
Entity DTO·schema / Entity Query Key namespace
  ↓
Shared API client
  ↓
Backend
```

호출부에서는 API hook과 use-case hook을 다음과 같이 구분한다.

```ts
userBlockQuery.useBlockUserMutation(); // TanStack Query adapter
useBlockUser(); // Feature use-case hook
```

여기서 `Query`는 GET 요청만 의미하지 않는다. TanStack Query가 서버 상태의
요청·mutation lifecycle을 관리하는 API module이라는 프로젝트 convention을
나타낸다. Namespace는 API를 다시 Entity에 모으기 위한 전역 객체가 아니라,
각 Feature/Page/Widget이 소유한 `api` segment의 module facade다. 따라서 같은
slice 내부 소비자는 `../api`, 다른 slice 소비자는 해당 slice public API를
통해 namespace를 가져온다.

SSE transport, parser, request adapter와 일반 use-case hook은 TanStack Query
hook이 아니므로 이 namespace 규칙을 적용하지 않는다. Query cache identity를
정의하는 `feedQueryKeys`, `userQueryKeys` 등의 key factory 역시 API 호출
namespace와 별도 책임으로 유지한다.

Query Key는 파일 위치가 아니라 응답을 유일하게 결정하는 identity다.
따라서 Feature/Page 전용 leaf도 다음과 같이 공통 prefix를 사용한다.

```text
["feed"]
  ├─ ["list", params]                         browse-feed-detail
  ├─ ["me", "feeds", userId, params]        browse-feed-detail
  ├─ ["comments", feedId, params]            feed-detail Widget
  └─ ["camera-guide", "pose", feedId]       guide-feed Feature
```

`feedQueryKeys.lists()`, `userQueryKeys.blockLists()`와 같은 prefix는 여러
Feature가 invalidation 대상으로 사용하므로 Entity public API에 유지한다.
반면 `feedCollectionQueryKeys.publicList()`처럼 단일 사용 사례의 완전한 leaf는
해당 Feature가 소유한다.

호출이 한 Page에만 있어 보여도 다른 Feature가 동일 query options를
재사용하면 Page 전용으로 분류하지 않는다. 공개/내 피드/좋아요 목록은 피드
상세 탐색이 동일 infinite cache를 이어서 사용하므로
`browse-feed-detail` Feature가 소유한다. Profile과 Feed Page는 이 Feature의
public API를 소비한다. 이를 Profile Page `api`에 두면 Feed Detail Feature가
상위 Page를 import해야 하므로 FSD 의존 방향을 위반한다.

다음 조회는 실제 Page 전용이므로 Page `api`로 이동한다.

- Profile blocked-users Page: 차단 사용자 목록
- Camera Page: RTC 방 저장 사진

다음 상태는 여러 slice가 공유하므로 Entity에 유지한다.

- Feed 상세와 저장 피드 목록
- 현재 회원 프로필(`/users/me`)
- Profile Preview Widget과 전체 사진 Page가 공유하는 내 RTC 저장 사진
  (`/users/me/photos`)
- RTC room SSE event parser/구독
- Feed/User/RTC/RTC Stored Photo의 DTO, schema와 공유 key prefix

## Trade-off

얻은 것:

- 사용자 행동의 요청·실패·mutation lifecycle을 해당 Feature가 소유
- Page/Widget 전용 조회의 변경 범위 축소
- Entity query 파일의 과도한 책임 제거
- 동일 서버 자원의 Query Cache identity와 invalidation 호환성 유지
- Feature가 제거될 때 관련 endpoint 구현도 함께 제거 가능한 구조

제한:

- Query Key factory가 Entity와 소비 slice에 나뉘므로 root/prefix/leaf 규칙을
  이해해야 한다.
- 단일 호출 여부만으로 소유권을 판단할 수 없고 query options 재사용과
  invalidation 소비자를 함께 확인해야 한다.
- Entity에는 공유 조회와 cache 변환 함수가 계속 남는다.
- API module마다 작은 `api/index.ts` facade가 추가된다.
- 구조 테스트가 소스 파일 경로를 직접 읽는 경우 새 소유 경로로 함께
  갱신해야 한다.

## Result

- Feed 작성·수정·삭제, 댓글 작성, 좋아요, 저장, 신고와 AI processing 요청을
  각각의 Feed Feature `api`로 이동했다.
- 소셜 로그인, 회원 탈퇴, 프로필 수정과 사용자 차단 mutation을 각각의
  User/Profile Feature `api`로 이동했다.
- RTC host/viewer mutation과 feedback emoji 조회를 RTC Feature `api`로
  이동했다.
- Camera Guide 전용 Feed pose/background-removal 조회를 `guide-feed/api`로
  이동했다.
- Feed Detail 댓글 조회를 Widget `api`로 이동했다.
- 차단 목록은 Profile blocked-users Page `api`, RTC 방 저장 사진은 Camera
  Page `api`로 이동했다.
- 내 RTC 저장 사진 조회는 Profile Preview Widget과 전체 사진 Page가 같은
  cache를 공유하므로 `RtcStoredPhoto` Entity가 hook과 list leaf key를
  소유하도록 유지했다.
- 공개/내 피드/좋아요 목록은 Feed Detail과 infinite cache를 공유하므로
  `browse-feed-detail` Feature가 소유하도록 이동했다.
- Entity에는 공유 DTO/schema, Query Key prefix, Feed 상세·저장 목록,
  `/users/me`, RTC SSE 구독을 유지했다.
- 이동한 TanStack Query hook은 `feedCollectionQuery.useReadFeeds()`,
  `userBlockQuery.useBlockUserMutation()`처럼 소유 slice의 namespace를 통해
  호출하고, `useFeedDetailCollection()`, `useBlockUser()` 같은 use-case hook은
  직접 호출하도록 구분했다.
