# ADR-0033: 피드와 댓글 신고의 공통 lifecycle 및 API 경계

## Decision

피드와 댓글 신고는 `report-content` feature의 단일 form과 modal을
공유한다. 신고 대상은 `{ type: "feed" | "comment", id }`로 표현하고,
`entities/feed/api`의 report adapter와 query가 대상에 따라 endpoint를
선택하고 인증된 mutation을 실행한다.

- 피드: `POST /feed/{feedId}/reports`
- 댓글: `POST /feed/comments/{commentId}/reports`

피드 상세 pager가 현재 신고 대상을 소유하며 header와 comment item은
대상 ID만 전달한다. 본인 콘텐츠에는 신고 action을 노출하지 않는다.
게스트에게는 신고 action을 노출하되 선택하면 기존 `useMemberAccess`로
로그인을 유도하고, 로그인 전에는 신고 form을 열지 않는다.

신고 action menu의 React Native Modal을 먼저 닫고 짧은 dismiss 간격 후
native BottomSheet를 연다. 요청 중에는 중복 제출과 sheet dismiss를
막는다. 실패하면 입력을 유지하고, 성공하면 같은 sheet 안에서 접수
완료 상태를 표시한 뒤 사용자의 확인으로 닫는다.

## Context

App Review Guideline 1.2 대응을 위해 사용자가 다른 회원의 피드와 댓글을
신고할 수 있어야 한다. 백엔드는 피드와 댓글에 대해 동일한 사유 Enum과
선택 상세 설명 최대 500자를 받지만 endpoint와 응답의 대상 ID 필드는
서로 다르다.

기존 피드 상세 header는 본인 피드의 수정/삭제 menu만 제공하고, 타인
피드와 댓글에는 action 진입점이 없었다. 댓글 수만큼 form, modal,
mutation을 만들면 요청 lifecycle이 분산되고 렌더링 비용과 상태 정리
지점이 늘어난다. 반대로 backend DTO 차이를 공용 UI에 직접 노출하면
외부 API 변경이 presentation 계층까지 전파된다.

프로젝트의 공용 BottomSheet는 `@expo/ui/community/bottom-sheet`의 native
modal presentation을 사용한다. 기존 action menu의 React Native Modal과
동시에 presentation하면 특히 iOS에서 다음 modal이 열리지 않을 수 있어
두 presentation의 lifecycle을 순서대로 관리해야 한다.

## Alternatives

### Option A: 상세 pager가 단일 신고 feature를 소유

한 개의 target, form, mutation, modal을 공유하고 entity adapter만
endpoint를 구분한다. 상태와 오류 처리가 한곳에 모이고 다른 신고 대상도
같은 target union으로 확장할 수 있다.

### Option B: 피드와 댓글 신고 feature를 각각 구현

각 endpoint의 흐름은 단순하지만 form 검증, 사유 label, 오류 처리와
modal lifecycle이 중복된다. 댓글 item마다 mutation과 modal을 두면
댓글 수에 따라 불필요한 hook instance도 늘어난다.

### Option C: 신고 전용 route로 이동

keyboard와 긴 form layout은 관리하기 쉽지만 신고 대상 route parameter,
뒤로가기와 성공 복귀 lifecycle이 추가된다. 현재 2개 필드 신고 form에는
navigation 전환 비용이 더 크다.

## Reason

Option A를 선택했다. UI와 form lifecycle을 한 번만 구현하면서도 backend
endpoint 차이를 entity adapter 뒤에 격리할 수 있기 때문이다. 신고는
기존 피드나 댓글 데이터를 변경하지 않으므로 성공 후 query cache를
invalidate하지 않는다. 신고 API 실패도 조회, 좋아요, 픽과 댓글 작성
기능에 영향을 주지 않는다.

```text
Feed Header / Comment Item action
  ↓
Member Gate
  ↓
FeedDetailPager report target
  ↓
ReportContentModal
  ↓
Zod validation
  ↓
Content report API adapter
  ├─ feed target    → /feed/{id}/reports
  └─ comment target → /feed/comments/{id}/reports
  ↓
Success state / retained failure form
```

상태와 lifecycle 소유권은 다음과 같다.

- 현재 사용자 ID와 guest 여부: `useAuthStore`
- 현재 신고 대상: `FeedDetailPager`
- 사유, 상세 설명, 선택 목록 UI: `ReportContentModal`
- 요청 pending, success, error: 단일 React Query mutation
- 인증 header와 401 token refresh: `privateApiClient` interceptor
- endpoint 선택: `feed-report-adapter`
- 신고 요청 lifecycle: `feed-report-query`
- action menu와 BottomSheet presentation 순서: 공통 content action menu

## Trade-off

얻은 것:

- 피드와 댓글이 공유하는 일관된 신고 경험
- API Enum, trim, 선택 설명 500자 제한의 단일 검증 지점
- 실패 시 입력 보존과 요청 중 중복 제출 방지
- 댓글 수와 무관한 단일 mutation/modal instance
- 게스트에게 신고 기능을 발견 가능하게 유지하면서 서버의 일반 회원
  제한 준수
- API 경로 차이와 인증 처리를 UI에서 격리

제한:

- action menu를 닫은 뒤 신고 sheet가 열리기까지 짧은 지연이 있다.
- 신고 성공 여부는 서버 응답만 반영하며 콘텐츠를 즉시 숨기지 않는다.
- `409` 등 서버 오류 문구는 backend payload를 우선 표시한다.
- native sheet의 keyboard와 dismiss 체감은 iOS 및 Android 실제 기기에서
  최종 확인해야 한다.

## Result

- 피드와 댓글 신고 endpoint 및 공통 request schema를 연결했다.
- 본인 콘텐츠에는 기존 owner action만 유지하고 다른 회원 콘텐츠에는
  신고 action을 추가했다.
- 게스트 신고 action은 기존 회원 로그인 유도로 연결했다.
- 성공, 실패, pending, form reset lifecycle을 공통 신고 modal에 격리했다.
- 신고 domain 단위 테스트 6개, 기존 피드 상세 6개, 피드 좋아요 7개,
  피드 상세 navigation 4개 테스트와 TypeScript 검사를 통과했다.
- 실제 API 요청, keyboard, iOS/Android native presentation은 실제 기기
  검증이 필요하다.
