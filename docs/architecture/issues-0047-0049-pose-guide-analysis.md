# Issues #47–#49: Pose Guide 파이프라인 재검증 및 개선 설계 초안

- 분석일: 2026-09-12
- 구현일: 2026-09-13
- 서버 계약 재확인일: 2026-09-27
- 기준 브랜치/커밋: `dev` / `9b8a253`
- 대상 이슈:
  - [#47 Camera Pose 좌표계 및 Capture Projection 재검증](https://github.com/new-pic/frontend/issues/47)
  - [#48 Pose Matching 및 다중 인물 정렬 판정 로직 재검증](https://github.com/new-pic/frontend/issues/48)
  - [#49 Pose Guide Alignment 및 사용자 Feedback 안정화 정책 재검증](https://github.com/new-pic/frontend/issues/49)
- 문서 상태: 권장안 47-B + 48-A + 49-B의 클라이언트 구현 및 자동 검증 완료.
  실제 기기 projection calibration과 #48의 5명 이상 서버 실패 계약 확인은 후속
  검증이 필요하다.

## 1. 결론 요약

세 이슈는 독립 작업이라기보다 하나의 연속 파이프라인이다.

```text
Issue #47                  Issue #48                 Issue #49
좌표 계약과 투영             비교·할당·점수             시간 안정화·UI 피드백

DWPose / MediaPipe
        ↓
Capture CommonPose ──────→ PoseSceneMatchResult ───→ AlignmentSnapshot
                                                        ↓
                                                  Camera Overlay/Banner
```

현재 구조는 모델별 adapter, capture 좌표, matcher, UI policy가 분리되어
있어 책임 배치는 대체로 적절하다. 다만 현재 상태로 세 이슈를 완료 처리하기는
어렵다.

| 이슈 | 현재 판정                           | 이유                                                                                                                                                                      |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #47  | 부분 완료                           | `PoseProjectionContext`와 명시적인 front/back mirror mode를 적용했다. FrameOutput 16:9 → PhotoOutput 4:3은 여전히 `center-cover` 모델이므로 실제 기기 crop 검증은 남는다. |
| #48  | 클라이언트 구현 완료·서버 계약 대기 | bbox/center/scale의 pairwise 공통 관절 계산과 target-relative body group coverage는 구현했다. 최대 4명 제한의 실제 서버 처리와 오류 계약은 문서로 검증되지 않았다.        |
| #49  | 구현 완료                           | elapsed-time EMA와 진입/이탈 hold를 적용하고 component 실패, detector idle/error, camera 비활성, frame stall에서 stale `ALIGNED`가 해제되도록 구현했다.                   |

우선순위가 높은 발견 사항은 다음과 같다.

| 우선순위 | 발견 사항                                                                             | 확인 수준                                                     | 영향                                          |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| P0       | Android 전면 카메라에서 FrameOutput과 PhotoOutput의 `auto` mirror 의미가 다를 수 있음 | 설치된 VisionCamera 5.0.11 소스에서 정적 확인, 기기 재현 필요 | 좌우 반전된 matching 및 잘못된 이동/팔 피드백 |
| P0       | `ALIGNED` 상태가 component 실패를 무시하고 유지될 수 있음                             | 순수 함수로 재현                                              | 잘못된 정렬 성공 표시                         |
| P1       | 16:9 FrameOutput → 4:3 capture 투영이 실제 crop metadata 없이 `cover`로 고정됨        | 코드 확인, 기기 측정 필요                                     | 4:3에서 위치·크기 점수의 구조적 편향          |
| P1       | target/live의 서로 다른 관절 집합으로 bbox/center/scale 계산                          | 순수 함수로 재현                                              | 가림을 `MOVE_CLOSER` 등으로 오안내            |
| P1       | target 인원이 5명 이상이면 detector는 4명으로 clamp되어 성공 불가능                   | 코드 확인                                                     | 영구적인 인원 불일치                          |
| P1       | detector stop/error/stall이 Alignment policy를 reset하지 않음                         | 코드 확인                                                     | 오래된 `ALIGNED`/feedback 표시                |
| P2       | Pose API 계약에 source 크기·orientation·schema/model version이 없음                   | 코드 확인                                                     | 서버 변경 또는 EXIF/CDN 차이를 조용히 오해석  |
| P2       | iOS/Android MediaPipe SDK 버전이 각각 0.10.21/0.10.35로 다름                          | build 설정 확인                                               | 플랫폼별 결과 차이와 ADR 문서 불일치          |

## 2. 분석 범위와 검증 결과

### 2.1 실행한 자동 검증

| 검증                                              | 결과             |
| ------------------------------------------------- | ---------------- |
| `pnpm test:pose-match`                            | 33/33 통과       |
| `pnpm test:camera-guide`                          | 28/28 통과       |
| `pnpm test:pose-detection`                        | 5/5 통과         |
| `pnpm test:camera-settings`                       | 11/11 통과       |
| `pnpm typecheck`                                  | 통과             |
| `pnpm lint`                                       | 오류 0, 경고 86  |
| `pnpm exec eslint src/features/camera/guide-feed` | 오류 0, 경고 2   |
| `CHOKIDAR_USEPOLLING=1 pnpm fsd:check`            | 위반 없음        |
| Expo production export                            | iOS/Android 통과 |

77개 관련 테스트가 현재 의도한 수학과 정책을 보존한다는 것을 확인했다. 그러나
테스트가 의도 자체의 타당성, 실제 카메라 output 간 crop, 전면 카메라 mirror를
증명하지는 않는다.

연결된 iPhone과 설치된 NewPic 개발 빌드는 확인했다. 사용자가 LAN 개발 서버 공개는
진행하지 않기로 결정했으므로, 이 환경에서 앱 연결과 end-to-end 좌표 비교는 하지
않는다. Android 기기, 운영 DWPose 응답 fixture, 촬영 결과 이미지를 이용한 비교도
남아 있다. 따라서 기기 의존 항목은 아래에서 `외부 검증 대기`로 구분한다.

### 2.2 확인한 외부 계약

- 프로젝트는 Expo SDK 56(`expo ~56.0.12`)이며 이미지 크기는 Expo 56의
  `Image.loadAsync()`가 반환하는 decoded `ImageRef.width/height`를 사용한다.
  [Expo SDK 56 Image 문서](https://docs.expo.dev/versions/v56.0.0/sdk/image/)
- MediaPipe Pose Landmarker의 image landmark `x/y`는 입력 이미지의 width/height로
  정규화되고, pose마다 33개 landmark와 visibility/presence를 제공한다.
  [MediaPipe iOS Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/ios),
  [MediaPipe Android Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/android)
- CameraX는 use case 사이 좌표 변환 시 단순 해상도 비율 외에 `cropRect`와
  transformation 정보를 사용하도록 별도 좌표 변환 절차를 제공한다.
  [CameraX transform output 문서](https://developer.android.com/media/camera/camerax/transform-output)
- VisionCamera 계약은 설치된 정확한 버전 `5.0.11`의 타입과 native 구현을
  기준으로 확인했다. Frame의 `orientation`/`isMirrored`는 pixel buffer에 이미
  반영됐는지가 아니라 목표 output과 현재 buffer 사이의 상대 metadata다.

DWPose의 `0, 5...16` mapping은 현재 ADR과 `dwpose_xy_score` 응답 계약에 따른
COCO body index 가정이다. frontend 저장소에는 실제 서버 추론 코드나 고정된
운영 응답 fixture가 없으므로, 서버가 같은 body layout과 upright source image를
계속 제공한다는 end-to-end 증명은 별도 backend 계약 또는 fixture가 필요하다.

## 3. 현재 구조(As-Is)

### 3.1 데이터 흐름

```text
Feed Pose API
  ↓ FeedPoseResponse (현재 compile-time interface)
DWPose response validator/adapter
  ↓ DWPoseSourcePose (source normalized)
Target capture projector
  ↓
CommonPose[] ───────────────────────────────────────────┐
                                                       │
VisionCamera FrameOutput                               │
  ↓ native PoseFrameInputAdapter                       │
upright, resized MediaPipe input                       │
  ↓ Pose Landmarker                                    │
MediaPipeInputPose (input normalized)                  │
  ↓ Live capture projector                             │
CommonPose[] ───────────────────────────────────────────┤
                                                       ↓
                                              Pose Matcher
                                                       ↓
                                           PoseSceneMatchResult
                                                       ↓
                                      PoseGuideAlignmentPolicy
                                                       ↓
                                    Overlay warning + Feedback banner
```

Preview contour는 matching 경로와 분리되어 있다.

```text
Background-removal contour (source normalized)
  ↓ direct source-to-preview cover
SVG Preview overlay
```

이 분리는 적절하다. Preview layout 변경이 pose score를 바꾸지 않고, contour가
PhotoOutput orientation lifecycle에 결합되지 않는다.

### 3.2 책임과 소유권

| 책임                                         | 현재 소유자                                                 | 평가                                                  |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Camera/Photo/Frame output과 runtime geometry | `features/camera/capture-photo`                             | 적절하나 geometry에 mirror/crop 계약이 부족함         |
| DWPose/MediaPipe 외부 형식 변환              | `features/camera/guide-feed/lib/pose-matching/*-adapter.ts` | 적절함                                                |
| 공통 좌표와 Pose domain type                 | `features/camera/guide-feed/model/pose-types.ts`            | 적절함                                                |
| 좌표 투영                                    | `lib/pose-matching/coordinate-transform.ts`                 | 계층은 적절하나 실제 output transform 입력이 부족함   |
| score와 assignment                           | `lib/pose-matching`                                         | 적절함. 순수 함수 유지 필요                           |
| Guide 선택·query·matching 조율               | `model/use-camera-guide-controller.ts`                      | 책임은 맞지만 파일 크기와 render-time ref 경고가 있음 |
| native detector lifecycle                    | model hook + native runtime adapter                         | AppState/runtime 분리가 적절함                        |
| UI 안정화 정책                               | `model/pose-guide-alignment-policy.ts`                      | 적절함. matcher와 UI 사이에 유지해야 함               |
| Camera/Guide/RTC 화면 조합                   | `widgets/camera/capture-workspace`                          | 적절함. pose 실패는 RTC에 전파되지 않음               |

### 3.3 상태와 lifecycle

- Guide selection/active target: `cameraGuideReducer`
- Camera output geometry: `CameraView` → `CameraCaptureWorkspace`
- 최신 native frame과 detector lifecycle: `nativePoseDetectionRuntime` 및
  `useLivePoseDetection`
- 최신 raw match: `useCameraGuideController`의 ref
- 사용자에게 공개되는 안정화 상태: `usePoseGuideAlignment`
- Camera, RTC, Pose sink는 같은 FrameOutput을 소비하지만 각 실패는 `try/catch`로
  격리된다.

교체 비용이 가장 큰 경계는 native frame preprocessing과 FrameOutput/PhotoOutput
사이 투영이다. 이 부분의 계약이 불명확하면 matcher threshold를 아무리 조정해도
정확도가 안정되지 않는다.

## 4. Issue #47 — 좌표계와 Capture Projection

### 4.1 현재 확인된 동작

1. DWPose source pixel은 pose 응답의 `imageUrl`을 decode한 width/height로 나눠
   `DWPoseSourcePose`로 만든다.
2. MediaPipe frame은 native에서 upright bitmap/pixel buffer로 실제 회전한 후
   추론하므로 JS에서 rotation을 다시 적용하지 않는다.
3. target과 live를 각각 capture canvas로 center-cover한 뒤 같은 `CommonPose`로
   비교한다.
4. cover crop 밖 좌표는 clamp하지 않고 matcher의 usable-point 단계에서 제외한다.
5. capture 크기는 `PhotoOutput.currentResolution`과 `outputOrientation`으로 만든다.
6. Preview contour와 reference image는 source → preview로 직접 투영한다.

이 구조는 좌표 타입 혼합과 이중 회전을 막는 데 효과적이다.

### 4.2 발견한 문제

#### A. FrameOutput → PhotoOutput 관계를 크기 기반 `cover`로 추정한다

FrameOutput은 항상 `HD_16_9`, PhotoOutput은 가이드에 따라 4:3 또는 16:9다.
현재 live projector는 MediaPipe input의 실제 size와 PhotoOutput size만 받아
`cover`를 적용한다. native camera가 어떤 sensor crop/viewport를 사용했는지,
crop origin이 어디인지, stabilization/기기별 output negotiation이 어땠는지는
전달되지 않는다.

16:9와 16:9는 비율이 같아 위험이 작지만, 16:9 Frame과 4:3 Photo는 단순
center-cover 가정이 실제 FOV와 반대 방향의 crop을 만들 가능성이 있다. 현재
단위 테스트는 cover 수학만 검증하고 native output의 동일 지점을 비교하지 않는다.

판정: **높은 위험의 검증 공백**. 실제 기기 marker test 전에는 현재 transform이
맞다고 확정할 수 없다.

#### B. Android 전면 카메라 mirror 계약이 출력별로 달라질 수 있다

앱은 모든 output에 기본 `mirrorMode="auto"`를 사용하고 live pose는
`frame.sourceFrame.isMirrored`일 때만 x를 반전한다.

설치된 VisionCamera 5.0.11 Android 구현에서는:

- FrameOutput의 `AUTO`는 `frame.isMirrored = false`로 전달한다.
- Preview는 CameraX의 auto/front mirror 설정을 사용한다.
- PhotoOutput의 `AUTO`는 front camera일 때 저장 파일을 mirror한다.

따라서 Android front에서 MediaPipe가 본 unmirrored buffer와 Preview/Photo가
보여주는 mirrored 결과가 달라도 app projector는 이를 보정하지 않을 수 있다.
iOS는 buffer connection 동작이 달라 플랫폼 간 결과도 다를 수 있다.

판정: **정적 계약상 불일치 후보**. front/back × iOS/Android 저장 사진과
landmark를 함께 찍는 검증이 필요하다.

#### C. 서버 Pose 좌표 계약이 충분히 versioned되지 않았다

현재 응답은 `keypointFormat: "dwpose_xy_score"`만으로 body layout을 식별하며,
source width/height, orientation 정규화 여부, mirrored 여부, model/schema version은
없다. 클라이언트가 CDN의 `imageUrl`을 다시 decode해 크기를 추론하므로 다음
경우에 취약하다.

- 서버 분석 이후 image variant가 교체됨
- EXIF orientation을 서버와 Expo Image가 다르게 해석함
- backend가 landmark layout/model을 변경하지만 기존 format 문자열을 유지함

이 실패는 API boundary에서 즉시 드러나지 않고 나쁜 score로 나타날 가능성이 크다.

#### D. reference/outline/pose image identity가 하나의 계약으로 묶이지 않았다

reference는 selection의 `detailImageUrl`, pose는 pose 응답의 `imageUrl`, outline은
background-removal 응답의 크기를 사용한다. 서로 다른 variant여도 content identity,
orientation, aspect가 같다는 명시적 보장이 없다. 각 기능의 partial failure 격리는
좋지만, 성공한 세 데이터가 실제로 같은 source를 가리키는지 확인할 수 없다.

### 4.3 설계안

#### 안 47-A — 현재 cover projector 유지 + 계약 보강

구조:

- 현재 `coordinate-transform.ts` 유지
- front/back별 mirror를 명시적 product policy로 계산
- Pose API에 source 크기/orientation/schema version 추가
- device matrix와 golden fixture 테스트 추가

장점:

- 변경량과 runtime 비용이 가장 작다.
- 현재 순수 함수와 테스트 대부분을 유지한다.

단점:

- output 간 실제 crop이 center-cover가 아니면 근본 문제는 남는다.
- 기기별 예외가 projector 조건문으로 늘어날 수 있다.

#### 안 47-B — 명시적 `ProjectionContext`와 platform transform adapter 도입

구조:

```text
VisionCamera/CameraX/AVFoundation metadata
  ↓ PlatformProjectionAdapter
ProjectionContext
  - frame input rect
  - capture output rect
  - orientation
  - explicit mirror policy
  - transform version
  ↓
TargetProjector / LiveProjector
  ↓
Capture CommonPose
```

`guide-feed` domain은 platform type을 모르고 `ProjectionContext` port만 사용한다.
처음에는 검증된 center transform을 context로 표현할 수 있고, 필요하면 native
crop matrix로 교체한다.

장점:

- 외부 camera library와 domain의 경계가 명확하다.
- 실제 crop/mirror 정보를 기록하고 테스트할 수 있다.
- VisionCamera나 native 구현 교체 시 adapter만 바꿀 수 있다.

단점:

- native metadata 전달과 양 플랫폼 구현 비용이 든다.
- matrix가 기기별로 정확한지 golden/device test가 필수다.

성능:

- frame당 landmark 13개에 affine transform을 적용하는 비용은 매우 작다.
- metadata 획득 방식에 따라 native 구현 복잡도는 증가한다.

#### 안 47-C — Pose FrameOutput 비율을 PhotoOutput과 동일하게 구성

구조:

- 4:3 촬영이면 pose 입력도 4:3 output을 사용한다.
- 같은 비율에서는 scale만으로 capture space를 맞춘다.

장점:

- 좌표 투영이 가장 단순해진다.
- 4:3/16:9 수학적 crop 오차가 줄어든다.

단점:

- 현재 RTC가 같은 16:9 FrameOutput을 공유하므로 RTC 화면 비율 또는 output 구성이
  영향을 받는다.
- Pose 전용 두 번째 FrameOutput을 두면 camera output 수와 메모리/대역폭이 늘어난다.
- 비율 변경 시 session 재구성 비용과 frame 공백이 커질 수 있다.

### 4.4 추천

**47-B를 목표 구조로 추천하되, 먼저 47-A 수준의 명시적 mirror 정책과 기기 측정을
선행**하는 단계적 접근이 적합하다. 측정 결과 4:3 FOV 차이가 허용 범위 안이면
context 내부 구현은 단순하게 유지할 수 있고, 차이가 크면 native crop transform을
추가할 수 있다. RTC와 공유하는 FrameOutput을 즉시 분리하는 47-C는 측정 없이
선택하기에는 비용과 영향 범위가 크다.

## 5. Issue #48 — Pose Matching과 다중 인물 Assignment

### 5.1 현재 확인된 동작

- confidence 0.5 미만 또는 capture 밖 joint는 제외한다.
- body center는 shoulder/hip 중 유효한 점을 평균하고 부족하면 bbox center를 쓴다.
- scale은 usable joint bbox 면적 비율의 제곱근과 log error를 사용한다.
- pose는 center/body scale로 정규화한 공통 joint error를 신체 그룹별로 집계한다.
- overall은 position 0.3, scale 0.2, pose 0.5다.
- person, position, scale, pose, joint group에 별도 threshold를 적용한다.
- 4명 이하는 모든 순열을 탐색해 최소 assignment cost를 구한다. 최대 4명에서
  24개 순열이므로 성능 문제는 사실상 없다.
- scene score는 평균이 아니라 가장 낮은 assignment overall score다.

### 5.2 발견한 문제

#### A. geometry가 pairwise 공통 joint가 아닌 각 pose의 개별 usable joint로 계산된다

target은 다리가 보이고 live는 다리 confidence가 낮은 같은 자세를 넣으면 현재
matcher는 비교 가능한 관절이 9개이므로 LOW_CONFIDENCE가 아니라 scale mismatch로
판정한다. 분석 중 순수 함수로 다음 결과를 재현했다.

```text
aligned: false
feedback: MOVE_CLOSER
sceneScore: 89.29
scaleScore: 46.47
comparableJointCount: 9
```

실제 원인은 거리가 아니라 live bbox에서 무릎/발목이 빠진 것이다. target/live
bbox, center, body scale을 같은 공통 관절 집합으로 계산하지 않으면 confidence
변화를 구도 변화로 오해한다.

#### B. 전체 comparable count만 있고 신체 그룹 coverage 정책이 없다

`minimumComparableJoints = 6`만 만족하면 존재하는 group score만 검사한다. 어떤
그룹이 joint 2개 미만이면 그 그룹은 `groupsAligned` 검사에서 빠진다. 이는 두 가지
제품 의미 중 하나를 선택해야 하는 문제다.

- 상반신 피드도 유효한 가이드라면 target이 요구하는 관절만 비교해야 한다.
- 전신 따라 찍기가 목표라면 torso/팔/다리별 최소 coverage가 필요하다.

현재 구현은 두 정책을 명시하지 않은 채 결과적으로 일부 그룹 누락을 허용한다.

#### C. 5명 이상 target은 성공할 수 없다

target Pose 배열은 인원 제한 없이 받아들이지만 MediaPipe `numPoses`는 4로 clamp된다.
5명 이상의 DWPose 결과가 들어오면 live count가 target count와 같아질 수 없으므로
항상 `PERSON_COUNT_MISMATCH`다.

#### D. assignment는 frame 간 identity를 기억하지 않는다

현재 완전탐색은 매 frame의 전역 최소 cost를 정확히 구한다. 그러나 비슷한 두 사람이
교차하거나 대칭 자세를 취하면 target↔live assignment가 frame마다 바뀔 수 있다.
scene aligned 판정에는 큰 문제가 없을 수 있지만, "왼쪽 사람" 같은 worst-person
feedback은 debounce 이전에 후보가 흔들릴 수 있다.

### 5.3 설계안

#### 안 48-A — Pairwise 공통 관절 geometry + 명시적 coverage gate

구조:

1. target/live 모두 usable한 joint intersection을 먼저 계산한다.
2. center, bbox, scale, pose를 가능한 한 같은 support set으로 계산한다.
3. target pose에서 요구하는 body group과 pairwise coverage를 별도 `PoseValidity`로
   산출한다.
4. validity를 통과한 pair만 score/assignment 후보가 된다.

장점:

- confidence/가림이 position·scale 오류로 변환되는 문제를 직접 해결한다.
- 결정적 순수 함수와 현재 완전탐색 assignment를 유지한다.
- "왜 비교 불가인가"를 UI에 구체적으로 전달할 수 있다.

단점:

- target eligibility와 그룹별 최소 관절 수를 제품 정책으로 정해야 한다.
- 공통 joint가 줄면 score 분산이 커질 수 있다.

#### 안 48-B — Confidence-weighted soft score와 coverage penalty

구조:

- joint를 hard filter하지 않고 target/live confidence의 결합값으로 가중한다.
- coverage 비율이 낮으면 overall score에 연속적인 penalty를 준다.

장점:

- confidence 0.5 근처의 불연속을 줄인다.
- landmark 품질 변화를 부드럽게 반영한다.

단점:

- DWPose visibility와 MediaPipe min(visibility, presence)가 같은 확률 의미인지
  보장되지 않는다.
- 파라미터가 늘고 설명 가능성이 낮아진다.
- 실제 데이터셋 없이 조정하면 hard threshold보다 오히려 불안정할 수 있다.

#### 안 48-C — Stateful assignment stabilization 추가

구조:

- 48-A 또는 48-B 위에 이전 frame assignment와 center trajectory를 유지한다.
- assignment 전환에 작은 switch cost를 부여한다.

장점:

- 여러 사람의 identity와 개별 feedback label이 안정된다.

단점:

- matcher가 순수 함수에서 stateful tracker로 확장된다.
- guide/camera/detector lifecycle과 reset 계약이 늘어난다.
- 현재 최대 4명의 전역 scene 판정만 필요하다면 과도할 수 있다.

### 5.4 추천

**48-A를 우선 추천**한다. 현재 확인된 오판정을 가장 작은 개념 추가로 해결하고,
기존 assignment 성능과 설명 가능성을 유지한다. 48-B는 실제 confidence 분포를
수집한 뒤 검토할 수 있고, 48-C는 다중 인물 feedback label 흔들림이 device test에서
실제로 확인될 때 추가하는 편이 낫다.

### 5.5 결정 기록 — 최대 판정 인원

Decision:
Pose Guide의 판정 가능 인원을 최대 4명으로 제한하고, DWPose가 5명 이상을 검출하면
서버가 생성 단계에서 지원 불가 오류를 반환한다. 해당 피드는 생성하거나 저장하지
않으며, 생성 후 Guide만 비활성화하는 부분 성공 상태를 허용하지 않는다.

Context:
DWPose는 5명 이상을 반환할 수 있지만 현재 live MediaPipe detector는 최대 4명이고,
assignment도 최대 4명을 전제로 한다. 이 차이를 허용하면 클라이언트는 성공할 수 없는
Guide에 대해 계속 `PERSON_COUNT_MISMATCH`를 반환한다.

Alternatives:
대표 4명을 자동 선택하거나, detector 상한을 높이고 assignment를 다인원 알고리즘으로
교체하는 방안을 검토했다.

Reason:
자동 선택은 사용자가 의도한 인물을 조용히 제외할 수 있다. 완전한 5명 이상 지원은
실시간 추론 성능, 인물 identity, 가림 정책까지 함께 설계해야 하므로 현재 범위를 넘는다.

Trade-off:
판정 가능 범위가 4명으로 명확하고 안정적으로 유지되는 대신 5명 이상 단체 Guide를
지원하지 않는다.

Result:
백엔드 담당자로부터 최대 4명으로 변경했다는 전달을 받았다. 그러나 현재 Swagger에는
최대 4명 제한, 5명 이상 처리 방식, 고정 error code, 임시 Feed·이미지 정리 정책이
명시되어 있지 않다. 서버 계약 확인 전까지 클라이언트 domain error 매핑과 UI 표현은
구현하지 않는다.

## 6. Issue #49 — Alignment와 Feedback 안정화

### 6.1 현재 확인된 동작

- raw scene score에 EMA alpha 0.3을 적용한다.
- 초기 3 sample은 `SEARCHING`으로 둔다.
- `ALIGNED → MISALIGNED`는 smoothed score 78 미만,
  `MISALIGNED → ALIGNED`는 raw matcher aligned이면서 85 이상이다.
- NO_PERSON/LOW_CONFIDENCE는 800ms grace 뒤 `SEARCHING`으로 바뀐다.
- feedback은 350ms debounce와 800ms cooldown을 거친다.
- Guide identity/target readiness 변경 시 policy state를 reset한다.
- React state는 공개 snapshot이 바뀔 때만 갱신해 10 FPS 전체 render를 피한다.

### 6.2 발견한 문제

#### A. ALIGNED 이탈 조건이 raw/component validity를 보지 않는다

`ALIGNED` 상태에서 이탈 조건은 오직 `smoothedOverallScore < 78`이다. matcher가
position/scale/pose/group 최소값 때문에 `aligned=false`를 계속 반환해도 overall이
80이면 상태는 무기한 `ALIGNED`다.

분석 중 기본 EMA로 ALIGNED 진입 후 `sceneScore=80`, `aligned=false`를 20회 연속
입력했을 때 다음 결과를 재현했다.

```text
alignmentState: ALIGNED
smoothedOverallScore: 80.008
feedback: null
```

Hysteresis는 일시적 실패를 흡수해야 하지만, 지속적인 hard constraint 실패를
영구히 무시해서는 안 된다.

#### B. detector lifecycle이 policy lifecycle에 완전히 전달되지 않는다

policy reset identity는 `guideId`와 `targetReady`뿐이다. Camera가 정지하거나
AppState가 background가 되거나 native detector가 error/stall 상태가 되어도 둘이
같으면 기존 Alignment snapshot이 남는다. 한편 no-pose grace도 새 observation이
들어올 때만 진행되므로 frame 자체가 멈추면 timeout이 평가되지 않는다.

#### C. sample 기반 EMA와 stable count가 실제 FPS에 따라 다른 시간을 의미한다

최대 10 FPS지만 busy drop, 저사양 기기, 다중 인원에 따라 effective FPS가 달라질 수
있다. alpha 0.3과 3 sample은 10 FPS와 4 FPS에서 사용자 체감 시간이 다르다.

#### D. calibration 값을 검증할 관측 도구가 없다

threshold가 한 파일에 모여 있는 점은 좋지만, 현재는 실제 분포를 기록하는
calibration fixture/로그 포맷/측정 기준이 없다. 숫자를 바꾸더라도 개선 여부를
회귀 검증하기 어렵다.

### 6.3 설계안

#### 안 49-A — 현재 policy에 hard-failure streak와 lifecycle reset 추가

구조:

- `result.aligned=false` 또는 validity failure의 연속 횟수를 센다.
- 짧은 grace 이후에는 overall EMA와 무관하게 MISALIGNED로 전환한다.
- detector `idle/error` 및 camera inactive에서 SEARCHING/reset한다.

장점:

- 변경량이 작고 현재 테스트 구조를 유지한다.
- ALIGNED latch와 stale snapshot을 직접 막는다.

단점:

- sample count가 실제 시간과 동일하지 않은 문제는 남는다.
- score hysteresis, hard-failure streak, no-pose grace가 서로 다른 규칙으로 늘어난다.

#### 안 49-B — 시간 기반 Alignment state machine으로 재정의

구조:

```text
PoseObservation
  - validity
  - matcherAligned
  - overall/components
  - observedAt(monotonic)
  ↓
AlignmentStateMachine
  - time-aware EMA
  - enter/exit hold duration
  - no-frame/no-pose timeout
  - detector lifecycle event
  ↓
Presentation snapshot
```

`alpha = 1 - exp(-deltaTime / timeConstant)` 방식으로 effective FPS와 무관한 EMA를
사용하고, `minimumStableSamples` 대신 `alignedHoldMs/misalignedHoldMs`를 사용한다.
raw hard constraint와 score threshold를 별도 입력으로 유지한다.

장점:

- FPS가 달라도 같은 사용자 시간을 제공한다.
- frame stall과 detector 상태를 명시적 event로 처리한다.
- 상태 전이 이유를 로그와 테스트로 설명하기 쉽다.

단점:

- policy state와 테스트가 현재보다 복잡해진다.
- monotonic clock adapter와 lifecycle event 연결이 필요하다.

#### 안 49-C — native/tracker 단계에서 landmark smoothing 후 matcher 실행

구조:

- 각 landmark/사람 trajectory를 먼저 안정화하고 matcher에는 smoothing된 pose를 준다.

장점:

- score뿐 아니라 joint 자체의 jitter를 줄일 수 있다.
- 다중 인물 tracking과 함께 구현하면 assignment 안정성도 높아진다.

단점:

- person identity tracker가 선행돼야 한다.
- 지연과 state/reset 복잡도가 가장 크다.
- 현재 확인된 ALIGNED latch는 별도로 고쳐야 한다.

### 6.4 추천

**49-B를 추천**한다. 현재 정책이 이미 timestamp를 받는 순수 함수이므로 계층을
바꾸지 않고 시간 의미를 명시할 수 있다. 단, 범위를 작게 시작하려면 49-A로
ALIGNED latch와 detector reset을 먼저 막은 뒤 calibration 단계에서 49-B로
확장할 수 있다.

## 7. 분석 중 발견한 추가 개선 사항

### 7.1 API runtime validation과 versioned coordinate contract

`useReadFeedPose`는 `response.data`를 `FeedPoseResponse`로 type annotation만 하며
runtime parse하지 않는다. 내부 DWPose adapter가 많은 필드를 검증하지만 outer
`feedId`, `imageUrl`, `poseUpdatedAt` 및 source identity/geometry는 API boundary에서
검증되지 않는다.

권장 경계:

```text
unknown HTTP response
  ↓ FeedPoseResponseSchema (entity/API adapter)
VersionedPoseSource
  ↓ DWPose adapter (guide feature)
DWPoseSourcePose
```

### 7.2 MediaPipe SDK 버전 통일과 ADR 수정

- iOS podspec: `MediaPipeTasksVision 0.10.21`
- Android Gradle: `tasks-vision 0.10.35`
- ADR-0003 Result: `MediaPipe Tasks Vision 0.10.35`라고 단일 버전처럼 기록

플랫폼별 버전을 의도적으로 다르게 유지한다면 이유와 결과 차이를 기록해야 하고,
그렇지 않다면 호환 가능한 동일 버전으로 통일할 필요가 있다. 이 변경은 native
의존성 변경이므로 별도 smoke test와 build 검증이 필요하다.

### 7.3 사용되지 않는 이전 target/projection 코드 정리

다음 구현은 production에서 참조되지 않고 테스트 또는 export만 남아 있다.

- `feed-pose-target-preparer.ts`
- `feed-pose-target.ts`
- `projectSourceCanvasToPreviewRect`
- `capturePointToPreview` / `capturePoseToPreview`

과거 ADR-0005의 source → capture → preview 경로와 현재 ADR-0007의 direct
source → preview 경로가 코드에 함께 남아 있어 새 변경자가 잘못된 API를 재사용할
수 있다. 최종 projection 설계 확정 후 삭제하거나 `legacy/test helper`가 아닌
명확한 역할로 재배치하는 것이 좋다.

### 7.4 React Compiler lint 경고

초기 분석에서는 Guide feature에 render 중 ref read/write 등을 포함한 경고가
12개 있었다. raw matching snapshot을 제거하고 ref 갱신을 lifecycle 경계로 옮겨
현재는 effect 동기화 관련 2개만 남았다. 10 FPS frame을 React state로 올리지 않는
event pipeline은 유지했다.

- outline adapter 성공 시 이전 오류를 해제하는 effect
- detector 시작/정지와 React snapshot을 동기화하는 effect

둘 다 각 lifecycle owner 안에 있어 책임 위반은 아니다. 다만 향후 해당 controller를
정리할 때 reducer event 또는 external-store adapter로 바꾸면 동기 setState 경고도
없앨 수 있다.

### 7.5 FSD 검사 실행 안정성

기본 `pnpm fsd:check`는 현재 실행 환경에서 file watcher 제한(`EMFILE`)으로
실패했지만 `CHOKIDAR_USEPOLLING=1 pnpm fsd:check`로 재실행했을 때 위반 없이
통과했다. 구조 문제는 아니며, 동일한 제한이 있는 CI라면 polling 환경 변수를
검사 job에만 적용하면 된다.

### 7.6 시간 기준 상태의 의미 분리

49-B 최초 구현은 `마지막 frame 시각`과 `마지막 유효 score 시각`을 한 필드로
공유했다. 짧은 `NO_PERSON` frame은 detector가 살아 있다는 근거이므로 no-frame
timeout은 갱신해야 하지만, score가 없으므로 EMA의 이전 score 시각을 갱신하면 안
된다. 두 시각을 분리하고 회귀 테스트를 추가했다.

### 7.7 그룹 최소 관절 수 설정 일관성

required group 판정은 `minimumComparableJointsPerGroup`을 사용했지만 그룹 score
계산에는 `2`가 하드코딩되어 있었다. 기본값에서는 같아 드러나지 않지만 설정을
바꾸면 eligibility와 scoring이 서로 다른 정책을 사용할 수 있다. 그룹 score도 같은
설정값을 사용하도록 수정하고 회귀 테스트를 추가했다.

### 7.8 생성 단계 인원 제한 오류의 클라이언트 경계

현재 `/feed` 생성 요청이 즉시 실패하면 `shared/api`의 `ApiRequestError`가 HTTP
status와 payload를 보존하고, `save-feed`가 서버 message를 실패 배지에 표시한다.
하지만 이 실패 배지는 누르면 동일 이미지를 재시도하므로, 5명 이상처럼 입력을
바꾸기 전에는 성공할 수 없는 오류에 맞지 않는다.

또한 생성 요청이 먼저 job을 반환한 뒤 비동기 DWPose 단계에서 실패한다면 현재
status/SSE DTO는 `FAILED`만 전달하고 failure code/message를 잃는다. 따라서 이
오류의 분류와 retry 가능 여부는 Camera Guide가 아니라 `features/feed/save-feed`
model이 소유해야 한다. `shared/api`는 transport payload 보존까지만 담당한다.

검토할 실제 계약은 다음 두 가지다.

1. 동기 거절: `/feed`가 domain code를 포함한 4xx를 반환하고 job/feed를 만들지 않는다.
2. 비동기 거절: job은 만들되 `FAILED` status/SSE에 domain code/message를 포함하고
   feed는 저장하지 않는다.

현재 비동기 publishing pipeline을 유지할 수 있는 2번이 구조 변화가 적다. 어느
방식이든 안정적인 error code와 `retryable=false` 의미가 정해져야 client가 동일
이미지 자동 재시도를 막고 이미지 교체 안내를 할 수 있다. 서버 구현이 아직 없으므로
클라이언트는 payload를 추측해 선행 구현하지 않고 계약 확정까지 대기한다.

## 8. 추천 통합 구조

세 이슈를 함께 개선한다면 다음 경계를 추천한다.

```text
External inputs
  ├─ Feed Pose API
  └─ VisionCamera/MediaPipe
          ↓
Versioned source adapters
          ↓
ProjectionContext adapter
          ↓
Capture CommonPose
          ↓
PoseValidity (pairwise coverage / eligibility)
          ↓
Stateless Matcher + exact Assignment
          ↓
Raw Match Observation
          ↓
Time-based Alignment State Machine
          ↓
Presentation Mapper
          ↓
Camera Overlay / Feedback Banner
```

### 계층별 책임

- `entities/feed`: unknown HTTP 응답 parse와 versioned pose source DTO
- `features/camera/capture-photo`: 실제 output geometry와 명시적 mirror policy 소유
- `modules/vision-camera-pose`: pixel rotation, crop/mirror metadata 추출, MediaPipe SDK
- `features/camera/guide-feed/lib`: model adapter, projection, validity, matcher 순수 계산
- `features/camera/guide-feed/model`: guide/detector/alignment lifecycle
- `widgets/camera/capture-workspace`: snapshot을 화면에 조합하며 domain 판정은 하지 않음

### 실패 영향

- Pose API/schema/projection 실패: 해당 Guide matching만 SEARCHING/Unavailable,
  Camera와 RTC는 유지
- MediaPipe error/stall: Alignment는 SEARCHING으로 만료, Camera와 RTC는 유지
- Matcher invalid coverage: 잘못된 이동 지시 대신 촬영 범위/가림 안내
- UI banner 실패: matcher와 detector lifecycle에는 영향 없음

### 향후 교체가 어려운 부분

1. 서버 DWPose source contract와 기존 저장 데이터
2. front camera mirror에 대한 제품 정책과 이미 저장된 피드의 의미
3. RTC와 Pose가 공유하는 16:9 FrameOutput
4. 실제 사용자 데이터로 calibration한 score/시간 threshold

따라서 이 네 항목은 구현 전에 합의하고 ADR에 남겨야 한다.

## 9. 구현 전 검증 계획

### 9.1 좌표 golden test

front/back, 4:3/16:9 각각에서 화면의 알려진 5~9개 지점에 marker를 두고 다음을
같이 저장한다.

- Frame input size, source crop, orientation, mirror metadata
- MediaPipe normalized landmark
- PhotoOutput resolution/orientation/mirror
- 최종 저장 사진에서 같은 marker의 normalized 위치

허용 projection 오차는 제품이 선택해야 한다. 예를 들어 capture 짧은 변 대비
평균 1~2%, 최대 3% 같은 기준을 먼저 정한 뒤 `cover` 가정을 채택할지 판단한다.

### 9.2 Matcher fixture matrix

- 1~4명, 배열 순서 변경, 교차 이동
- 상반신/전신 target
- 한쪽 팔/다리 가림, capture 경계 밖 joint
- target/live confidence 비대칭
- 5명 이상 target eligibility
- 동일 구도에서 front mirror on/off

### 9.3 Alignment timeline test

- threshold 위아래를 오가는 sequence
- overall은 높지만 position/scale/group hard constraint가 지속 실패하는 sequence
- 10 FPS/5 FPS/불규칙 FPS에 같은 시간 패턴 입력
- NO_PERSON, detector error, frame stall, AppState background/foreground
- guide 교체와 camera output 재구성 중 stale observation

### 9.4 실제 기기 matrix

최소 범위:

- iOS 1대 + Android 1대
- front/back
- 4:3/16:9
- 1명/2명/4명
- 카메라 전환, 앱 background 복귀, RTC 송출 중 Guide 사용

## 10. ADR 갱신 대상

결정 후 다음 문서를 현재 구현 결과에 맞게 갱신한다.

- ADR-0003: 플랫폼별 MediaPipe 버전, mirror/crop metadata와 detector lifecycle
- ADR-0004: pairwise validity/coverage와 projection context
- ADR-0005: 실제 Guide controller 데이터 흐름과 제거할 legacy helper
- ADR-0006: ALIGNED 이탈 조건, detector lifecycle, time-based policy
- ADR-0007: front mirror에서 contour/reference presentation 정책

새 통합 결정을 별도 ADR로 기록하고 위 문서에는 대체 관계를 표시하는 방식도
가능하다.

## 11. 설계안 종합 비교

| 기준               | 보수적 보강(47-A + 48-A + 49-A) | 권장 구조(47-B + 48-A + 49-B)                   | 고급 추적(47-B/C + 48-B/C + 49-C) |
| ------------------ | ------------------------------- | ----------------------------------------------- | --------------------------------- |
| 정확도 개선        | 중간                            | 높음                                            | 잠재적으로 가장 높음              |
| 구현 복잡도        | 낮음~중간                       | 중간                                            | 높음                              |
| runtime 성능       | 현재와 유사                     | landmark affine 계산은 미미, metadata 비용 소폭 | tracking/추가 output에 따라 증가  |
| 유지보수성         | 단기 좋음, 조건 누적 위험       | 경계가 명시되어 장기 좋음                       | 전문 지식과 calibration 비용 큼   |
| 확장성             | 새 camera/model에서 제한        | adapter 교체로 대응 가능                        | 다중 인물 identity까지 확장 가능  |
| RTC 영향           | 낮음                            | 낮음~중간                                       | 47-C 선택 시 높음                 |
| 실제 데이터 필요성 | 필수                            | 필수                                            | 매우 높음                         |

현재 단계에서는 **권장 구조를 목표로 하되, 기기 측정 → 확정 bug 수정 → matcher
validity → alignment state machine 순서로 작게 구현**하는 것이 가장 균형이 좋다.

## 12. 구현 결과

- 47-B: session 단위 `PoseProjectionContext`를 추가해 capture size,
  `center-cover` crop 모델, 최종 capture mirror 정책을 target/live projector가
  공유한다. 실제 input→capture 상대 반전은 Frame metadata를 사용한다.
- 47-B: VisionCamera `mirrorMode`를 front=`on`, back=`off`로 명시하고 runtime
  geometry가 동일한 mirror 계약을 전달한다.
- 48-A: bbox, center, body scale, pose normalization을 target/live 공통 관절
  집합에서 계산한다.
- 48-A: target에 joint 2개 이상이 있는 신체 그룹만 required group으로 보고,
  live 공통 coverage가 부족하면 `LOW_CONFIDENCE`를 반환한다.
- 48-A: required group과 group score가 동일한 최소 관절 수 설정을 사용한다.
- 49-B: 280ms time constant EMA와 200ms enter/exit hold를 적용했다. matcher의
  component 실패도 exit candidate가 되므로 높은 overall score가 실패를 가리지 않는다.
- 49-B: Camera 비활성 및 detector idle/error에서는 즉시 reset하고, 1,200ms frame
  stall은 no-frame timer로 reset한다.
- 49-B: 마지막 frame과 마지막 유효 score 시각을 분리해 짧은 no-pose 구간이
  no-frame 감시는 갱신하되 EMA 경과 시간은 덮어쓰지 않게 했다.
- 사용되지 않던 raw matching snapshot ref를 제거하고 render-time ref 접근을 effect
  경계로 옮겨 Pose Guide 영역의 React Compiler 경고를 줄였다.

자동 검증 결과는 Pose Matching 33/33, Camera Guide 28/28, Pose Detection 5/5,
Camera Settings 11/11이며 TypeScript와 FSD 검사는 통과했다. FSD 검사는 현재
환경의 native watcher 제한을 피하기 위해 polling mode로 실행했다. Expo iOS/Android
production export도 모두 통과했다.

## 13. 책임 경계 재검토 결과

| 책임                                                       | 소유 위치                          | 판정                   |
| ---------------------------------------------------------- | ---------------------------------- | ---------------------- |
| Camera output 크기·비율·front/back mirror 정책             | `features/camera/capture-photo`    | 적합                   |
| VisionCamera Frame metadata와 MediaPipe native 수명        | `modules/vision-camera-pose`       | 적합                   |
| DWPose/MediaPipe → CommonPose adapter, projection, matcher | `features/camera/guide-feed/lib`   | 적합                   |
| Guide 선택·target 준비·detector/alignment 수명             | `features/camera/guide-feed/model` | 적합                   |
| Camera와 Guide feature 조합 및 geometry 전달               | `widgets/camera/capture-workspace` | 적합                   |
| Overlay/banner 표현                                        | `features/camera/guide-feed/ui`    | 적합                   |
| 5명 이상 생성 실패 분류·retry 정책                         | `features/feed/save-feed/model`    | 계약 확정 후 구현 필요 |

`capture-photo`와 `guide-feed`가 서로 직접 import하지 않고 widget이 두 public API를
조립한다. `CameraRuntimeGeometry` 전체를 Guide가 소유하지 않고 필요한 subset만
`CameraGuideGeometry`로 받으므로 feature 간 상태 소유권도 섞이지 않았다.

`captureMirrorX`는 Camera가 결정한 최종 output 정책이고, frame의 `isMirrored`는
VisionCamera가 계산한 현재 buffer→output 상대 변환이다. 같은 mirror 상태를 중복
소유하는 것이 아니라 서로 다른 단계의 계약이다. iOS buffer가 이미 mirrored인
경우 상대 변환이 false가 되어 이중 반전을 피한다.

Alignment 순수 정책은 점수/시간 전이만, hook은 timer와 React lifecycle만,
controller는 detector lifecycle 연결만 담당한다. RTC와 Pose Frame sink도 각각
독립 try/catch라 Pose 실패가 촬영이나 RTC를 중단시키지 않는다.

Steiger FSD 검사도 위반 없이 통과했다. 따라서 현재 구현에서 기존 책임 정리를
어긴 부분은 발견하지 못했다. 이번 재검토에서 발견한 두 내부 의미 혼합은 각각
시간 필드 분리와 설정 단일화로 수정했다.

[확정된 사항]

1. Pose Guide 판정 인원은 최대 4명으로 제한한다.
2. DWPose가 5명 이상을 검출하면 임의로 4명을 선택하지 않고 서버가 지원 불가 오류를
   반환한다.
3. 이 오류는 생성 단계에서 전체 요청을 실패시키며 해당 피드를 저장하지 않는다.
4. #47은 `PoseProjectionContext`를 도입하는 47-B를 선택한다.
5. 전면 카메라는 기존 selfie 동작을 명시화해 Preview와 저장 사진을 모두 mirror한다.
6. #48은 pairwise 공통 관절과 target-relative group coverage를 적용하는 48-A를
   선택한다.
7. #49는 FPS 독립적인 시간 기반 상태 머신인 49-B를 선택한다.
8. 이 환경에서 Expo 개발 서버를 LAN에 공개하는 실제 iPhone 검증은 진행하지 않는다.
9. 백엔드 담당자로부터 최대 4명 변경을 전달받았지만 Swagger 계약으로 확인되기 전에는
   클라이언트 error code를 추측해 구현하지 않는다.

[결정이 필요한 사항]

1. 향후 별도 실제 기기 검증에서 16:9 FrameOutput → 4:3 PhotoOutput 좌표 오차를
   측정한 뒤 현재
   `center-cover` adapter를 유지할지 native crop transform을 추가할지 결정해야 한다.
2. 5명 이상에서 DWPose 결과를 4명으로 자르는지, 비동기 job `FAILED`로 종료하는지,
   그리고 고정 error code/message와 임시 Feed·이미지 정리 정책을 확인해야 한다.
3. backend Pose 응답에 source width/height, orientation/mirror, body layout,
   schema/model version을 추가할 수 있는지 협의가 필요하다.
4. 좌표 오차, ALIGNED 진입/이탈 시간, feedback 지연에 대한 실제 기기 합격 기준을
   함께 정해야 한다.
