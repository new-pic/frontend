# ADR-0014: PhotoGrid 피드 상세 탐색

## Decision

프로필의 피드 목록은 출처가 포함된 공통 피드 상세 Route로
이동하고, 카메라 가이드 목록은 CameraPage 내부의 전체 화면
Viewer에서 동일한 `FeedDetailPager`를 재사용한다.

## Context

`PhotoGrid`를 사용하는 목록마다 loading과 클릭 동작이 달랐고,
기존 피드 상세 페이지는 공개 피드 query만 사용했다. 카메라에서
상세 Route로 이동하면 CameraPage의 focus와 RTC FrameOutput
lifecycle에도 영향을 줄 수 있었다.

## Alternatives

- 모든 목록에서 공통 상세 Route로 이동
- 피드 배열과 선택 위치를 전역 Store에 복사
- 프로필은 상세 Route, 카메라는 세션 내부 Viewer 사용

## Reason

서버 목록과 pagination은 TanStack Query cache가 계속 소유하게
하면서 CameraPage를 navigation stack에서 이탈시키지 않기
위해서다. Route에는 피드 객체 대신 출처, ID, index와 pagination
조건만 전달한다.

## Trade-off

카메라 전용 Viewer shell이 추가되고 `FeedDetailPager`의 뒤로 가기와
가이드 선택 action을 외부에서 주입해야 한다. 대신 서버 데이터의
전역 중복, stale state와 카메라 세션 재구성을 피한다.

## Result

- 프로필의 내가 올린/저장한/찜한 피드는 각 query 순서로 상세
  슬라이드를 탐색한다.
- 카메라 가이드 목록은 CameraPage를 유지한 채 상세를 열고 현재
  슬라이드를 가이드로 선택한다.
- 실제 기기에서 Camera/RTC 유지 여부와 상세 전환 동작을 검증해야
  한다.
