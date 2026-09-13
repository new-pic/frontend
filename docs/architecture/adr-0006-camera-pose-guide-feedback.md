# ADR-0006: Camera Pose Guide Feedback 정책

> Mask warning 렌더링 방식은 ADR-0007에서 수정되었다. 현재는 RGBA
> 이미지 tint가 아니라 동일한 SVG contour의 stroke 색을 변경한다.

## Decision

기존 `PoseSceneMatchResult`와 카메라 UI 사이에 공통
`PoseGuideAlignmentPolicy`를 둔다.

```text
PoseSceneMatchResult
 ↓
PoseGuideAlignmentPolicy
 ├─ elapsed-time EMA smoothing
 ├─ time-based enter/exit hysteresis
 ├─ no-pose grace
 ├─ no-frame timeout
 └─ feedback debounce / cooldown
 ↓
PoseGuideAlignmentSnapshot
 ├─ AlignmentState → CameraGuideOverlay
 └─ PoseFeedback → Message Mapper → Camera banner
```

`CameraPage`에서 한 번 조합되는 Guide controller가 기본 Camera와
RTC HOST Camera에 같은 snapshot을 제공한다. 전역 Toast 대신 Camera
Preview 내부의 lightweight banner를 사용한다.

## Context

Pose 추론 결과는 최대 10 FPS로 갱신되므로 raw score를 UI에 직접
연결하면 Mask 색과 메시지가 빠르게 흔들린다. Guide 변경이나 해제 시
이전 Guide의 smoothing, feedback, cooldown도 즉시 폐기해야 한다.

기본 Camera와 RTC HOST는 같은 VisionCamera instance를 사용한다.
Feedback 변화가 CameraSession, RTC FrameOutput, VideoTrack 또는
LiveKit Room lifecycle을 건드려서는 안 된다.

운영 DTO는 Mask를 배경 제거 이미지로 제공하며 기존 UI는 원본 색을
가진 투명 이미지로 렌더한다. 저장소에는 실제 운영 asset이 없어
pixel 단위 alpha 검사는 할 수 없었다. 따라서 단일 `tintColor`로
원본을 대체하지 않는 방식을 선택했다.

## Alternatives

### Raw PoseMatchResult를 Camera UI에 직접 연결

구현은 단순하지만 threshold 부근에서 Mask와 메시지가 깜빡이고 Pose
FPS만큼 Camera React tree가 갱신된다.

### Global Toast 사용

앱 공통 알림 체계를 재사용할 수 있지만 Camera 화면과 수명이 다르고,
같은 메시지가 Toast queue에 누적될 수 있다.

### Camera 전용 Alignment policy와 overlay banner 사용

Pose domain의 결과 의미는 유지하면서 UI 안정화 정책과 한국어 문구를
분리할 수 있다. 같은 CameraPage 조합을 기본/RTC HOST가 공유한다.

## Reason

세 번째 방식을 선택했다. PoseMatcher를 변경하지 않고 UI에 필요한
시간 정책만 독립적으로 테스트할 수 있으며, 카메라 촬영과 RTC
lifecycle에 영향을 주지 않는다.

Native latest-only Pose 결과는 callback으로 Guide controller에
전달하고 React용 raw frame state는 만들지 않는다. React snapshot은
Alignment 또는 표시할 feedback이 실제로 바뀔 때만 갱신한다.

## Feedback policy

- EMA: `alpha = 1 - exp(-elapsedMs / 280ms)`
- 마지막 frame 시각과 마지막 유효 score 시각을 분리해, no-pose frame이
  no-frame timeout은 갱신하되 EMA 경과 시간을 왜곡하지 않게 한다.
- 초기 관찰 유지: 200ms
- ALIGNED 진입 유지: matcher가 aligned이고 score `>= 85`인 상태 200ms
- ALIGNED 이탈 유지: matcher가 실패하거나 score `< 78`인 상태 200ms
- no-pose grace: 800ms
- no-frame timeout: 1,200ms
- feedback debounce: 350ms
- feedback minimum cooldown: 800ms

이 값들은 UI calibration 초기값이며 실제 기기의 전후면 카메라,
4:3/16:9, 1~4인 장면으로 다시 조정해야 한다.

여러 사람일 때 기존 matcher의 `worstMatch` assignment를 사용한다.
표시 대상은 현재 live center x를 기준으로 왼쪽/가운데/오른쪽으로
구분하며, label 변경도 동일한 debounce/cooldown을 통과한다.

## Mask warning

정상 RGBA Mask를 그대로 렌더하고 MISALIGNED에서만 같은 alpha를
사용하는 반투명 red tint layer를 겹친다. 원본 시각 품질과 투명
배경을 유지하면서 피사체 영역에만 warning 색을 더한다.

SEARCHING과 ALIGNED에서는 원본 Mask만 보인다.

## Lifecycle and failure isolation

- Guide identity 변경: Alignment policy state 전체 reset
- Guide 해제: snapshot 비활성화, Mask/Banner 즉시 제거
- Target 미준비 또는 Camera 비활성: tracking state 즉시 reset
- Mask가 표시되는 동안: Pose detector는 실행하되 Target 미준비
  frame은 matching 없이 폐기
- 한 프레임 NO_PERSON: 기존 UI 상태 유지
- 800ms 이상 NO_PERSON: SEARCHING 전환 후 안내 후보 생성
- detector idle/error: tracking state 즉시 reset
- 1,200ms 동안 새 frame 없음: timer가 stale alignment를 SEARCHING으로 reset
- unmount: no-frame timer 해제

## Trade-off

얻는 것:

- threshold 부근 Mask 깜빡임 방지
- feedback queue와 Pose FPS React render 방지
- Guide별 완전한 UI state 격리
- 기본 Camera/RTC HOST 공통 정책
- PoseFeedback과 한국어 UI 문구 분리

비용:

- feedback 변경은 debounce/cooldown만큼 늦게 보일 수 있음
- no-pose grace와 feedback cooldown은 Pose result가 들어올 때 평가됨
- no-frame timeout을 위해 Guide hook이 단일 timer를 관리함
- red tint opacity와 threshold는 실제 기기 calibration이 필요함

## Result

- Alignment/EMA/hysteresis/no-pose/rate-limit/message 단위 테스트 추가
- 전체 Camera/Pose/Guide 단위 테스트 53개 통과
- Android/iOS Expo production export 성공
- 전체 TypeScript 검사는 기존 shared checkbox/spinner 오류만 남음
- 실제 기기에서 Mask tint 품질과 1~4인 label 안정성 검증 필요
