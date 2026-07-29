# ADR-0005: Camera Guide 선택과 Pose Matching 연결

> 윤곽선 표시 방식은 ADR-0007에서 수정되었다. 이 문서의 `Mask Image`
> 표현은 현재 서버 contour 기반 SVG outline으로 대체되었다.

## Decision

공통 `camera-guide` feature controller를 `CameraPage`에서 한 번
조합하고 `CustomCamera`는 CameraSession, runtime geometry,
Preview overlay/control 합성 지점만 제공한다.

```text
Saved Feed
 ↓ GuideFeedBottomSheet
GuideFeedSelection
 ↓
Pose query / Mask query / Source image geometry
 ↓ latest-only reducer
ActiveCameraGuide
 ├─ Mask → Capture → Preview
 └─ DWPose → Target CommonPose[]

VisionCamera FrameOutput
 ↓ stable Pose frame sink
MediaPipe → Current CommonPose[]

Target + Current
 ↓
PoseSceneMatchResult
```

Guide 선택 여부와 무관하게 같은 Pose native sink를 FrameOutput에
전달한다. Target Pose가 준비되고 Camera가 실행 중일 때만 native
module이 frame을 받는다. 피드 변경은 detector를 재초기화하지 않고
Target만 교체한다.

## Context

기본 Camera와 RTC HOST는 `CameraPage`의 같은 VisionCamera를
공유한다. RTC HOST는 기존 FrameOutput을 LiveKit track으로
publish하며 별도 Camera owner를 만들지 않는다.

Guide 선택과 API 실패가 CameraSession, RTC VideoTrack, LiveKit
Room 수명에 영향을 주면 안 된다. Mask, Target Pose, 실시간 Pose는
모두 최종 촬영 canvas를 기준으로 정렬되어야 한다.

운영 API는 저장 피드를 cursor pagination으로 제공하며 Mask와 Pose는
서로 다른 endpoint다. Mask는 원본과 다른 pixel resolution으로
저장될 수 있으므로 동일 pixel size를 가정할 수 없다.

## Alternatives

### Guide 전체를 CustomCamera 내부에 포함

Camera geometry 접근은 간단하지만 API, 선택 상태, Pose Matching과
CameraSession 책임이 한 컴포넌트에 섞인다. Guide 실패 격리와
단위 테스트가 어려워진다.

### CameraPage에서 공통 Guide feature를 조합

Camera는 runtime geometry와 rendering slot만 제공하고 Guide
controller가 query, latest-only 상태, Pose 변환과 matching을
담당한다. 기본 Camera와 RTC HOST가 같은 조합을 재사용한다.

### Guide를 전역 Zustand store로 관리

화면 간 선택 유지에는 유리하지만 현재는 단일 CameraPage에서만
필요하다. query/native image lifecycle 정리가 복잡하고 화면 이탈
후 stale Guide가 남을 수 있다.

## Reason

CameraPage 조합 방식은 Camera와 RTC 수명을 그대로 유지하면서
Guide 오류를 독립적으로 처리한다. Guide controller와 reducer를
Camera 없이 테스트할 수 있고, 향후 Guide source가 바뀌어도
CameraSession 계층은 수정하지 않아도 된다.

## State ownership

- Camera: front/back, flash, zoom, aspect 적용, runtime geometry
- RTC: Room, participant, publisher, VideoTrack, connection
- Pose detection: latest MediaPipe frame, inference status/error
- Guide: requested selection, active Guide, Mask/Target query 상태
- Pose Matching: Target/Current CommonPose에서 파생한 최신 결과

`requested selection`과 `active Guide`를 분리한다. 새 피드가 준비되는
동안 기존 Guide를 유지하며 현재 request id와 feed id가 모두 맞는
결과만 active 상태에 반영한다.

## Coordinate contract

```text
Mask source pixels
 ↓ source cover
Capture normalized space
 ↓ preview cover
Preview layout

DWPose normalized
 ↓ source cover
Target CommonPose

MediaPipe normalized
 ↓ input cover + Frame mirror metadata
Current CommonPose
```

Mask render rect와 Pose point projection은 같은 resize geometry
함수를 사용한다. Preview presentation 좌표는 Pose Matching 입력으로
사용하지 않는다.

VisionCamera의 Preview, PhotoOutput, FrameOutput은 같은 `auto`
mirror mode를 사용한다. Target과 Mask는 capture output space에
유지하고 MediaPipe의 unmirrored pixel 좌표에 `Frame.isMirrored`
metadata를 적용한다.

## Lifecycle and failure isolation

- 저장 피드 목록 실패: BottomSheet 내부 retry
- Mask API/이미지 실패: Mask만 숨기고 Camera/Target Pose 유지
- Target Pose 실패 또는 없음: Matching 중단, Mask와 Camera 유지
- Guide 해제: Mask/Target/Matching 제거, Camera/RTC 유지
- CameraPage unmount: Pose callback과 detector release

Guide가 4:3/16:9를 바꾸면 PhotoOutput 재구성에 따른 짧은 frame
공백은 허용한다. Camera owner, FrameOutput sink 구조, RTC track,
LiveKit Room은 재생성하지 않는다.

## Trade-off

얻는 것:

- 기본 Camera와 RTC HOST의 Guide 로직 공유
- Camera/RTC와 Guide 실패 격리
- stale API response 차단
- Mask와 Pose의 단일 capture coordinate contract
- 선택한 피드 변경 시 MediaPipe detector 재사용

비용:

- Camera와 Guide 사이 runtime geometry 계약 추가
- 비율이 다른 Guide 선택 시 PhotoOutput 재구성에 따른 frame 공백
- score smoothing과 feedback UI는 후속 작업에서 별도 연결 필요

## Result

- 저장 피드 cursor pagination과 운영 Mask DTO 적용
- latest-only Guide reducer와 Mask/Target partial success 처리
- 기본 Camera/RTC HOST 공통 CameraPage에 Guide controller 연결
- stable Pose sink와 Target 준비 상태 기반 inference lifecycle 연결
- Mask source → Capture → Preview render rect 구현
- Guide/Pose/Camera/Pose detection 단위 테스트 44개 통과
- Android/iOS Expo production bundle 성공
- 변경 영역 TypeScript 오류 없음
- 실제 기기에서 Camera/RTC frame continuity와 front camera 좌표 검증 필요
