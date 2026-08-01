# ADR-0021: 카메라 Stage 제어와 가이드 presentation 경계

## Decision

VisionCamera를 소유하는 `capture-photo` feature가 카메라 기기별 raw zoom과
표시 배율을 계산하고, 비율에 따라 높이가 변하는 Preview가 아니라 고정된
Camera Stage에 줌과 가이드 trigger를 배치한다. 4:3에서는 Header를 흰색
inline 영역에 두고 Preview를 상단 정렬하며, 16:9에서만 Header를 Preview
위에 overlay한다.

가이드 선택은 저장 피드 목록의 item을 누르면 즉시 선택되는 흐름으로
단순화한다. 목록은 프로젝트의 shared `BottomSheetModal`을 사용하고,
선택 후 같은 sheet를 닫는다.

RTC 참여 form과 촬영 사진 목록은 각각 기존 BottomSheet 및 PhotoGrid/
PhotoGallery 경계를 유지한다. 실시간 공유는 RTC 방 생성 mutation 전에
공용 confirm을 거친다.

## Context

Preview의 높이는 4:3과 16:9에서 달라지므로 Preview 내부 bottom offset에
배치한 줌 controller의 화면 위치도 함께 움직였다. 카메라 전환 직후에는
이전 device의 표시 범위가 남고 `onStarted`만으로는 새 session controller
값을 항상 다시 적용하지 못해 후면의 0.5x가 누락될 수 있었다.

가이드 목록의 grid item press는 이미 상세 슬라이드 열기로 연결돼 있었지만,
native BottomSheet와 React Native Modal을 연속 표시해 선택과 재개방이
동작하지 않는 경우가 있었다. 상세 확인 단계를 제거하면 이 presentation
전환 자체가 필요 없고, 가이드 선택까지의 interaction도 짧아진다. 참여
시트와 최근 사진 목록도 기능은 존재했으나 다른 목록 화면의 여백과 헤더
규칙이 일치하지 않았다.

## Alternatives

### Option A: 기존 책임 경계 안에서 국소 보정

`capture-photo`에 순수 zoom/chrome adapter를 두고 Camera Stage slot을
추가한다. 가이드 BottomSheet는 shared 컴포넌트를 유지하고 item을
`GuideFeedSelection`으로 변환한 뒤 즉시 CameraPage에 전달한다.

### Option B: 모든 카메라 제어 상태를 CameraPage로 승격

배치 변경은 단순하지만 CameraPage가 VisionCamera controller와 raw zoom을
알게 되고 Camera owner 밖에 native session 상태가 중복된다.

### Option C: 카메라 UI 전역 store 도입

화면 간 상태 공유는 쉬워지지만 현재 camera route에서만 필요한 sheet,
modal, zoom transient state가 전역에 남고 native lifecycle과 동기화할
지점이 늘어난다.

## Reason

Option A를 선택했다. VisionCamera를 유일한 Camera owner로 유지하면서도
비율 변경은 Preview geometry에만, 줌과 가이드 위치는 Camera Stage에만
영향을 주도록 책임을 분리할 수 있기 때문이다. RTC FrameOutput과 Pose
frame sink에는 변경이 필요하지 않다.

```text
CameraDevice capability
  ↓
camera-zoom adapter
  ↓
CameraController session 값으로 보정
  ↓
Camera Stage ZoomControls

Saved feed grid press in shared BottomSheet
  ↓
Feed DTO → GuideFeedSelection adapter
  ↓
cameraGuide.selectGuide
  ↓
BottomSheet close
```

상태는 Camera raw zoom과 capture 설정은 `CameraView`, 가이드 sheet open
상태는 CameraPage, RTC form 입력은 `RtcJoinForm`이 소유한다. native
CameraSession lifecycle은 계속 VisionCamera가 관리한다.

## Trade-off

얻은 것:

- 4:3과 16:9에서 동일한 Camera Stage 기준 줌 위치
- 전후면 전환마다 1x 초기화 후 새 device/controller 범위 재계산
- 가이드 선택 과정의 native modal presentation 충돌 제거
- 한 번의 item tap으로 가이드를 선택하는 짧은 interaction
- 프로필 grid와 일관된 촬영 사진 목록 및 safe area
- 사용자의 명시적 확인 이후에만 RTC 방 생성

포기하거나 제한된 것:

- iOS 18 미만에서 displayable zoom multiplier를 얻지 못하면 ultra-wide를
  0.5x로 표시하는 fallback이 필요하다.
- 4:3 Preview 아래에는 흰색 여백이 남지만 줌 controller는 Stage 하단에
  고정해 16:9와 같은 화면 높이를 유지한다.
- native camera와 BottomSheet의 최종 체감은 iOS/Android 실제 기기에서
  추가 확인해야 한다.

## Result

- raw/display zoom 계산을 순수 함수로 분리하고 후면 virtual camera와
  전면 camera 전환 단위 테스트를 추가했다.
- `onConfigured`와 `onStarted` 모두에서 실제 CameraController 범위를
  적용하도록 보정했다.
- 4:3 inline Header와 16:9 overlay Header를 분리하고, overlay 아이콘은
  투명 배경·흰색·그림자로 표시한다.
- 가이드 상세 RN Modal과 presentation reducer를 제거하고 shared
  BottomSheet item tap을 곧바로 가이드 선택에 연결했다.
- 가이드 선택값이 버튼 이미지에 즉시 사용되는 reducer 테스트를 추가했다.
- RTC 참여 form은 공용 Input을 사용하고 상단 정렬, keyboard 및 bottom
  safe area를 적용했다.
- 촬영 사진 Modal은 프로필 PhotoGrid 화면과 같은 중앙 제목 header 및
  전체 화면 safe area 구조를 사용한다.
- 관련 camera, guide, RTC, gallery 테스트와 iOS/Android Expo export를
  통과했다.
- 전체 TypeScript 검사는 이번 변경과 무관한 기존 `checkbox`, `spinner`
  타입 오류만 남아 있다.
