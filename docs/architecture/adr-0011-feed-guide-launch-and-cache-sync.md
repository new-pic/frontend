# ADR-0011: 피드 상세에서 촬영 가이드 시작 및 저장 목록 동기화

## Decision

피드 상세의 고정 FAB는 `guideFeedId`만 Camera route search param으로
전달한다. CameraPage는 feed entity를 통해 현재 Feed DTO를 읽고,
adapter로 `GuideFeedSelection`을 만든 뒤 기존
`useCameraGuideController.selectGuide()`에 한 번만 전달한다.

피드 저장/저장 취소가 성공하면 저장한 피드 Infinite Query를 reset하고,
Camera Guide Sheet가 사용하는 `take: 24` 첫 페이지를 즉시 prefetch한다.

## Context

피드 상세에는 `id`, `thumbnailUrl`, `detailImageUrl`이 있지만 Camera는
초기 가이드 route contract가 없었다. Camera 안에서는 저장한 피드
Bottom Sheet를 통해서만 가이드를 선택할 수 있었다.

피드 저장 mutation은 일반 Feed 목록의 `isPicked`, `pickCount`만
optimistic update했다. Camera가 사용하는
`GET /users/me/references` Query는 갱신하지 않았고 `staleTime`이 5분이라,
저장 직후 Guide Sheet에서 이전 목록이 보일 수 있었다.

## Alternatives

### FAB route에 Feed 이미지 URL까지 전달

추가 조회는 없지만 navigation contract가 Feed DTO와 이미지 URL 수명에
결합된다. 로그인 후 복귀와 deep link에도 긴 URL을 보존해야 한다.

### 전역 pending guide store 사용

즉시 전달할 수 있지만 화면 재생성, deep link, 뒤로 가기에서 임시 상태
정리 규칙이 필요하고 Camera의 local guide state와 중복된다.

### 저장 목록 targeted invalidation

서버 기준으로 갱신할 수 있지만 Sheet가 닫혀 Query가 disabled인 동안에는
즉시 fetch되지 않는다. Sheet가 열릴 때 이전 cache가 잠시 보일 수 있다.

### 저장 목록 InfiniteData 직접 수정

추가 요청 없이 즉시 보이지만 저장 API는 `{ picked, feedPostId }`만
반환한다. 완전한 Feed DTO와 새 cursor를 알 수 없어 page 경계에서
중복이나 누락을 만들 수 있다.

## Reason

`guideFeedId`는 가장 안정적인 route identifier이며 Camera 진입, 로그인
후 복귀, 같은 화면 instance에서 다른 피드로 재진입하는 경우를 같은
흐름으로 처리할 수 있다. Feed DTO와 Camera domain은 adapter 경계에서
분리된다.

저장 목록은 서버 정렬이 "최근 저장순"이고 cursor pagination을 사용한다.
따라서 클라이언트가 page를 재배치하지 않고 기존 pages를 버린 뒤 첫
페이지를 서버에서 다시 준비하는 것이 정확하다.

```text
Feed Detail
  ↓ guideFeedId
Camera route
  ↓
Feed Query
  ↓
FeedGuideSelectionAdapter
  ↓
Camera Guide Controller
```

```text
Feed Pick Mutation
  ↓ success
Saved Feed Cache Coordinator
  ↓ reset
Saved Feed first page prefetch
  ↓
Camera Guide Sheet
```

## Trade-off

얻는 것:

- Feed 이미지 URL과 분리된 작은 route contract
- `router.push`에 따른 Camera 뒤로 가기 시 Feed 상세 복귀
- 초기 가이드와 Bottom Sheet 가이드가 공유하는 단일 controller
- disabled Query 상태와 무관하게 저장 직후 첫 페이지 준비
- cursor를 직접 조작하지 않는 서버 authoritative 목록

포기하거나 제한된 것:

- FAB로 Camera 진입할 때 Feed 상세 조회가 한 번 필요하다.
- 저장/저장 취소마다 저장 목록 첫 페이지 요청이 한 번 발생한다.
- 목록 prefetch 실패는 서버 저장 성공을 rollback하지 않는다. 이후
  Guide Sheet의 error/retry lifecycle로 복구한다.

## Result

- 활성 Feed 상세 페이지에 thumbnail과 gradient action을 포함한 FAB를
  고정 배치했다.
- Camera는 `guideFeedId`의 Feed가 준비되면 가이드를 한 번만 선택한다.
- 사용자가 로딩 중 다른 가이드를 고르면 늦은 초기 응답이 덮어쓰지 않는다.
- 초기 Feed 조회가 실패해도 Camera는 유지되고 기존 가이드 재시도
  control을 통해 다시 요청한다.
- 로그인 후 Camera 복귀 경로에도 `guideFeedId`를 보존한다.
- 저장 목록 reset 및 첫 페이지 prefetch, route contract, Feed adapter
  단위 테스트를 추가했다.

### Contour overlay 확인

2026-07-29 실제 공개 API 응답을 확인한 결과, 최신 contour 일부는 원본
프레임 경계에 붙어 있었고 한 폐곡선에는 normalized 거리 약 `0.999`의
직선 segment가 포함돼 있었다. 현재 client projection은 서버 points를
Source → Capture → Preview로 선형 투영하고 `closed: true`일 때 `Z`만
추가하므로 스크린샷의 긴 선은 client 좌표 변환에서 새로 생성된 점이
아니다. 같은 샘플의 실제 WebP와 contour `imageWidth/imageHeight` 비율도
일치해 width/height 반전 문제는 아니었다.

경계 contour를 client에서 숨기거나 분할하면 실제로 화면 밖에서 잘린
사람의 윤곽도 잃을 수 있다. 따라서 이번 결정에서는 임의 threshold를
추가하지 않고, 서버 contour 단순화 정책 개선 또는 별도 client 품질
정책 선택이 필요하다고 기록한다.
