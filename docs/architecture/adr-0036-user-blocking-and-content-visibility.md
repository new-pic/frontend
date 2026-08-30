# ADR-0036: 사용자 차단과 콘텐츠 가시성 동기화

## Decision

게시글·댓글 신고와 사용자 차단을 서로 다른 use case로 유지한다. 신고 성공은
신고 접수 상태만 표시하고 피드·댓글 cache를 변경하지 않는다. 사용자가
더보기 메뉴에서 `작성자 차단하기`를 선택해 차단 API가 성공한 경우에만
해당 사용자의 피드와 댓글을 모든 로드된 React Query cache에서 제거한다.

백엔드를 차단 관계의 source of truth로 사용한다. 프론트는 차단 직후 UI를
동기화하기 위한 cache 제거를 수행하고, 관련 query를 다시 조회해 서버의
차단 결과와 일치시킨다. 댓글 조회도 access token을 전달하도록
`privateApiClient` 경계를 사용한다.

피드 작성자를 차단하면 현재 상세 화면을 닫고 이전 피드 목록으로 돌아간다.
댓글 작성자를 차단하면 현재 피드에 머물면서 해당 작성자의 댓글만 제거한다.

프로필에는 일반 회원에게만 `차단한 사용자` 진입점을 제공한다. 별도 프로필
Stack 화면에서 cursor pagination 목록을 조회하고 각 사용자 행에서 차단을
해제할 수 있다.

## Context

App Review에서 사용자 생성 콘텐츠를 제공하는 앱에 사용자 차단 기능이
필요하다는 지적을 받았다. 기존 앱에는 피드와 댓글 신고만 있었으며 신고와
차단의 화면 동기화 책임이 구분되지 않았다.

서버는 다음 API를 제공한다.

- `GET /users/me/blocks`: 차단 사용자 목록
- `POST /users/{userId}/block`: 사용자 차단
- `DELETE /users/{userId}/block`: 사용자 차단 해제

기존 댓글 조회는 인증 header가 없는 `apiClient`를 사용하고 있었다. 차단
관계는 현재 요청 사용자를 알아야 적용할 수 있으므로 댓글 조회를 인증된
API client로 변경할 필요가 있다.

피드 데이터는 public 목록뿐 아니라 내 피드, 좋아요, 저장 목록과 상세
cache에도 존재한다. 댓글도 피드와 정렬 조건마다 별도 infinite query에
저장된다. 특정 화면의 query key만 갱신하면 다른 화면에서 차단 콘텐츠가
다시 노출될 수 있다.

## Alternatives

### Option A: 서버 필터링과 차단 직후 cache 제거

서버가 이후 모든 조회에서 차단 관계를 적용하고, 프론트는 차단 성공 직후
이미 로드된 피드·댓글 cache만 제거한다. 서버와 프론트의 책임이 명확하고
새로고침 이후에도 같은 결과를 유지한다.

### Option B: 차단 목록을 프론트 전역 필터로 사용

차단 목록을 먼저 불러와 모든 피드·댓글 응답을 클라이언트에서 필터링한다.
서버 endpoint의 필터 적용 여부에는 덜 의존하지만, 목록 로딩 순서에 따른
노출 깜빡임과 pagination 왜곡이 발생할 수 있고 차단 정책이 중복된다.

### Option C: 차단 후 전체 query invalidation만 수행

구현은 단순하지만 재조회 전까지 차단 콘텐츠가 남고, 네트워크 실패 시 즉시
숨김 요구를 만족하지 못한다.

## Reason

Option A를 선택했다. 차단 관계와 장기적인 콘텐츠 가시성은 서버가 결정하고,
프론트는 사용자가 방금 수행한 차단 결과만 즉시 반영하는 것이 가장 일관된
경계이기 때문이다. 직접 cache 제거와 서버 재조회를 조합해 즉시성과 최종
일관성을 함께 확보한다.

```text
Feed / Comment action menu
  ↓
Member Gate
  ↓
Block confirmation
  ↓
User block API adapter
  ↓ success
Feed Entity cache transformation
  ├─ 작성자의 feed collection 항목 제거
  ├─ 작성자의 feed item cache 제거
  └─ 작성자의 comment collection 항목 제거
  ↓
Navigation
  ├─ feed author    → 이전 목록
  └─ comment author → 현재 feed 유지
  ↓
Server-backed query refresh

Profile entry
  ↓
Blocked users infinite query
  ↓
Unblock mutation
  ↓ success
Blocked-list cache removal + feed/comment refresh
```

책임과 상태 소유권은 다음과 같다.

- API path, pagination DTO, mutation 응답: `entities/user`
- 피드·댓글 cache 구조 판별과 순수 변환: `entities/feed`
- 확인창, mutation 순서, cache 동기화: `features/user/manage-user-block`
- 더보기 메뉴 조합과 상세 navigation: `widgets/feed/detail`
- 차단 목록 화면: `pages/profile/blocked-users`
- profile 진입점: `pages/profile/overview`
- 차단 목록과 요청 상태: React Query
- 회원/게스트 판별과 로그인 유도: 기존 member guard와 auth store

사용자 API Entity가 Feed Entity를 직접 import하지 않는다. 두 Entity에 걸친
cache 동기화는 Feature에서 조정해 도메인 간 방향을 유지한다.

## Trade-off

얻은 것:

- 신고와 차단의 독립된 사용자 의도 및 lifecycle
- 차단 직후 모든 로드된 목록에서 콘텐츠가 즉시 사라지는 경험
- 앱 재실행과 새로고침 후에도 서버 정책과 일치하는 가시성
- 차단·해제 실패 시 기존 화면과 cache를 보존
- 프로필에서 확인하고 되돌릴 수 있는 차단 관리 기능

제한:

- cache 구조 판별기는 현재 Feed/Comment 응답 형태에 의존한다.
- 차단 후 관련 query를 재조회하므로 일부 추가 네트워크 요청이 발생한다.
- 피드/댓글 신고 API에서 자동 차단을 제거하는 백엔드 변경이 함께 배포되어야
  신고 후 콘텐츠 유지 요구를 완전히 만족한다.
- 차단 관계가 적용된 댓글 응답을 받으려면 서버가 인증 header를 기준으로
  댓글을 필터링해야 한다.

## Result

- 피드와 댓글의 더보기 메뉴에 `작성자 차단하기`를 추가하고 기존 신고
  action과 독립적으로 동작하도록 연결했다.
- 차단 성공 후 모든 로드된 collection에서 작성자의 피드와 댓글을 제거하고
  작성자의 단일 feed item cache도 제거하도록 구현했다.
- 프로필에 회원 전용 차단 사용자 목록과 차단 해제 기능을 추가했다.
- 댓글 조회를 인증된 API client로 변경해 서버가 현재 사용자의 차단 관계를
  적용할 수 있도록 구성했다.
- 사용자 차단 테스트 9개, 신고 테스트 7개, 피드 상세 테스트 9개, 프로필
  테스트 11개, 피드 좋아요 테스트 7개, 피드 상세 navigation 테스트 4개와
  TypeScript 검사를 통과했다.
- 변경 소스 lint는 오류 없이 완료됐다. 기존 `feed-query.ts`의 배열 표기
  warning 2개는 이번 변경에서 새로 발생한 항목이 아니다.
- Steiger 전체 검사에서 저장소의 기존 위반은 남아 있지만 이번에 추가한
  파일에서는 새 위반이 검출되지 않았다.
- iOS Expo export를 완료해 새 profile route와 번들 생성을 확인했다.
- 실제 차단 API, 서버 필터링, iOS/Android 실제 기기 UI는 실행하지 않았다.
