# ADR-0014: PhotoGrid 상세 탐색과 카메라 가이드 선택

## Decision

프로필의 내가 올린/저장한/찜한 피드 목록은 출처가 포함된 공통 피드 상세
Route로 이동한다. 반면 카메라 가이드 목록은 상세 화면을 열지 않고 shared
BottomSheet의 item press를 즉시 `GuideFeedSelection`으로 변환해 현재
CameraPage에 적용한다.

공통 `/feed/[id]` 상세 Route는 특정 Feed 탭이 아니라 Root Stack이
소유한다. Feed 탭, 프로필의 내가 올린/저장한/찜한 피드 등 어느
화면에서 진입해도 상세 화면을 현재 화면 위에 push하고, 뒤로 가기는
실제 진입 화면의 navigation state로 복귀한다.

촬영 사진 PhotoGrid는 Feed가 아니므로 피드 상세 Route를 사용하지 않는다.
CameraPage의 전체 화면 사진 목록 Layer와 공용 `PhotoGalleryModal`을 통해
로컬 사진을 슬라이드로 탐색한다.

## Context

`PhotoGrid`를 사용하는 목록마다 loading과 클릭 동작이 달랐고,
기존 피드 상세 페이지는 공개 피드 query만 사용했다. 카메라에서
상세 Route로 이동하면 CameraPage의 focus와 RTC FrameOutput
lifecycle에도 영향을 줄 수 있었다.

초기 구현은 CameraPage 안에 `FeedDetailPager` 기반 가이드 상세 Viewer를
두었지만 BottomSheet item → 상세 RN Modal → 가이드 선택 → Modal 닫기 순서가
native presentation과 겹쳐 sheet 재개방 및 선택 상태 반영이 불안정했다.

## Alternatives

- 모든 Feed PhotoGrid에서 공통 상세 Route로 이동
- 피드 배열과 선택 위치를 전역 Store에 복사
- 프로필은 상세 Route, 카메라는 세션 내부 Viewer 사용
- 프로필은 상세 Route, 카메라 가이드 item은 즉시 선택

## Reason

프로필 목록은 상세 탐색이 목적이므로 서버 목록과 pagination을 TanStack
Query cache가 계속 소유하고 Route에는 피드 객체 대신 출처, ID, index와
pagination 조건만 전달한다.

카메라 가이드 목록의 목적은 상세 탐색이 아니라 target 선택이다. Feed DTO는
feature adapter에서 필요한 ID와 이미지 정보만 남기고, CameraPage의 local
guide controller로 단방향 전달한다. 이 방식은 Camera route를 유지하고
BottomSheet와 RN Modal을 연속 presentation하지 않는다.

## Trade-off

가이드 목록에서 Feed 캡션이나 댓글을 확인하는 중간 상세 단계는 제공하지
않는다. 대신 한 번의 tap으로 target을 선택하고 presentation 충돌, 서버
데이터의 전역 복제와 카메라 세션 재구성을 피한다. Feed 상세 확인이 필요한
일반 PhotoGrid는 계속 공통 상세 Route를 사용한다.

## Result

- 프로필의 내가 올린/저장한/찜한 피드는 각 query 순서로 상세
  슬라이드를 탐색한다.
- 공통 상세 Route를 Tabs 밖 Root Stack으로 이동해 뒤로 가기 시
  피드 목록으로 강제 전환되지 않고 실제 진입 화면으로 복귀한다.
- 초기 카메라 전용 Feed 상세 Viewer는 제거했다. 가이드 BottomSheet item을
  누르면 Feed adapter를 거쳐 즉시 현재 가이드로 선택하고 sheet를 닫는다.
- 촬영 사진은 Feed Route와 분리된 CameraPage Layer와 공용 사진 슬라이드를
  사용한다.
- 실제 기기에서 Camera/RTC 유지 여부와 상세 전환 동작을 검증해야
  한다.
