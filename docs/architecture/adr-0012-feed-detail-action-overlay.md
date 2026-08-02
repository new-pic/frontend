# ADR-0012: 피드 상세 액션과 촬영 가이드 오버레이 소유권

## Decision

촬영 가이드 FAB는 각 `FeedDetailContent`가 아니라
`FeedDetailPager`가 하나만 소유한다. Pager의 `activePageIndex`에서 현재
Feed를 선택해 기존 `guideFeedId` route contract로 Camera를 연다.

뒤로 가기와 작성자 더보기 메뉴가 있는 Header도 슬라이드 item이 아니라
`FeedDetailPager`의 고정 sibling으로 둔다. 작성자 avatar와 nickname은
이미지 상단 왼쪽, 저장 action은 상단 오른쪽에 overlay하고 좋아요 action은
이미지 하단에 유지한다.

작성자 전용 수정·삭제 액션은 각각의 아이콘 버튼 대신 하나의 세로 점
트리거와 anchored menu로 제공한다. 메뉴는 기존 edit/delete feature의
headless action을 조합한다.

## Context

피드 상세는 인접 슬라이드 콘텐츠를 함께 유지한다. FAB가 슬라이드 내부에
있으면 활성 페이지가 바뀔 때마다 FAB가 생성·해제되고, 댓글 query가
갱신되는 콘텐츠 렌더링 경계에도 포함된다.

수정과 삭제는 버튼 UI에 동작이 직접 결합돼 있어 하나의 메뉴에서 기존
동작을 조합할 수 없었다. 큰 텍스트 FAB는 긴 댓글을 가리는 면적도 컸다.
Header가 슬라이드 안에 있으면 페이지를 넘길 때 뒤로 가기와 메뉴 trigger도
함께 이동해 화면 navigation control이 콘텐츠 lifecycle에 종속된다.

## Alternatives

### 슬라이드별 FAB를 유지하고 memo만 적용

변경량은 작지만 활성 슬라이드 변경 시 FAB lifecycle은 계속 슬라이드에
종속된다. 댓글 영역과 액션 오버레이의 책임도 분리되지 않는다.

### 페이지 단일 텍스트 캡슐 FAB

처음 보는 사용자에게 의미가 명확하지만 댓글을 가리는 가로 면적이 크다.

### 작성자 액션을 Bottom Sheet로 제공

작은 화면에서도 안정적이지만 두 개뿐인 근거리 액션을 위해 화면 문맥이
크게 전환되고, 사용자가 요청한 dropdown 상호작용과 다르다.

## Reason

Pager가 이미 활성 Feed 상태를 소유하므로 페이지 수준 FAB도 같은
계층에서 파생하는 것이 단일 책임에 맞다. 원형 카메라 FAB는 접근성
라벨로 의미를 유지하면서 화면 점유를 최소화한다.

Header도 현재 Feed만 입력으로 받는 Pager sibling으로 두면 navigation
control은 고정하고 작성자 권한에 따른 메뉴 내용만 활성 page에 맞춰 바꿀 수
있다. 작성자 정보와 저장 action은 이미지 문맥에 속하므로 콘텐츠 overlay가
소유하고, Header는 navigation과 owner menu만 책임진다.

작성자 메뉴는 화면의 trigger 위치를 측정해 표시하므로 헤더가 일부
스크롤된 상태에서도 메뉴가 trigger에 붙는다. 수정·삭제 동작을
headless action으로 분리해 메뉴 UI와 route/mutation lifecycle을
격리한다.

```text
Feed Query
  ↓
FeedDetailPager ── active Feed ── Camera Guide FAB
  ↓
FeedDetailContent
  ├─ Owner Actions Menu
  │    ├─ Edit action → Expo Router
  │    └─ Delete action → Confirm → Feed mutation
  ├─ Image action overlay
  └─ Caption / Comments
```

## Trade-off

얻는 것:

- 댓글 query 갱신과 분리된 하나의 FAB instance
- 활성 Feed ID만 교체하는 명확한 Camera navigation 흐름
- 작성자 액션을 추가할 수 있는 단일 메뉴 경계
- 더 작은 화면 점유와 safe area 기반 FAB 위치

포기하거나 제한된 것:

- 원형 아이콘은 텍스트 버튼보다 최초 의미 전달력이 낮다.
- anchored menu는 trigger 위치 측정과 닫힘 상태를 관리해야 한다.
- 인접 슬라이드의 콘텐츠 lifecycle은 기존 Pager 최적화 범위를 유지한다.

## Result

- FAB를 `FeedDetailPager`의 단일 sibling overlay로 이동했다.
- Header를 `SlidePageView` 밖 Pager sibling으로 이동해 페이지 전환 중에도
  뒤로 가기와 작성자 메뉴 위치를 고정했다.
- 56px 원형 camera action과 접근성 라벨을 적용했다.
- 댓글 하단 여백에 FAB 높이 절반과 bottom safe area를 포함했다.
- 작성자 피드에만 수정·삭제 dropdown을 노출했다.
- 좋아요 액션을 이미지 하단에 배치하고 밝은 색상과 하단 음영을 적용했다.
- 작성자 avatar/nickname과 저장 action을 이미지 상단 양쪽에 배치하고
  이미지 배경과 관계없이 보이도록 text/icon shadow를 적용했다.
- 피드 캡션에 최소 높이와 확장된 상하 패딩을 적용했다.
