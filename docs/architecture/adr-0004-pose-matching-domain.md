# ADR-0004: Capture 좌표 기반 Pose Matching domain

## Decision

서버 DWPose와 실시간 MediaPipe를 직접 비교하지 않고 모델별
adapter와 capture projector를 거쳐 `CommonPose`로 변환한다.

```text
NormalizedPoseResult (source-image pixel x/y)
 ↓ Server result normalizer
NormalizedPosePerson[]
 + pose image decoded width/height
 ↓ DWPosePoseAdapter (x / width, y / height)
DWPoseSourcePose[]
 ↓ Target capture projector
CommonPose[]

DetectedPoseFrame
 ↓ MediaPipePoseAdapter
MediaPipeInputPose[]
 ↓ Live capture projector
CommonPose[]

Target CommonPose[] + Live CommonPose[]
 ↓ assignment / scoring / feedback
PoseSceneMatchResult
```

`CommonPose`는 최종 촬영 canvas의 좌상단이 원점이고 x는 오른쪽,
y는 아래쪽으로 증가하는 normalized coordinate를 사용한다.
cover crop으로 촬영 영역 밖에 놓인 좌표는 0...1로 clamp하지 않는다.

Preview 변환은 `CaptureNormalizedCoordinate -> PreviewCoordinate`로
별도 유지하며 matching 입력으로 사용하지 않는다.

## Context

DWPose와 MediaPipe는 joint index와 confidence 표현이 다르다.
서버 좌표는 upright source image 기준이고 native MediaPipe 입력은
VisionCamera Frame을 upright 이미지로 복사한 뒤 inference하므로
JS에서 Frame rotation을 다시 적용하면 이중 회전된다.

FrameOutput은 16:9이고 PhotoOutput은 Feed 비율에 따라 4:3 또는
16:9가 될 수 있다. 모델 좌표를 바로 비교하면 output 간 cover crop,
front-camera mirroring, 실제 capture 영역이 반영되지 않는다.

서버 `NormalizedPoseResult`는 `single_person`일 때 flat landmark
배열, `multi_person`일 때 `NormalizedPosePerson[]`을 저장한다.
사람의 배열 순서는 live 결과와 같은 identity를 의미하지 않는다.
여기서 `Normalized`는 저장 구조를 정규화했다는 의미이며,
`dwpose_xy_score`의 x/y는 pose `imageUrl` 원본의 pixel 좌표다.

## Alternatives

### Generic transform를 adapter 안에서 실행

변경량은 작지만 모델 해석과 좌표 투영이 결합된다. MediaPipe에
이미 적용된 rotation을 다시 적용하거나 source/capture size를
바꾸어 전달하는 오류가 타입에 드러나지 않는다.

### 모델별 coordinate type과 capture projector 분리

`DWPoseSourcePose`, `MediaPipeInputPose`, `CommonPose`를 구분한다.
모델 index/confidence 해석과 orientation/crop/mirror 변환을 각각
테스트할 수 있다.

### Preview 좌표에서 직접 비교

overlay를 그리기는 쉽지만 view 크기, cover crop, preview mirror에
domain 점수가 종속되고 실제 촬영 이미지의 구도와 달라질 수 있다.

### 서버에서 DWPose 좌표를 0...1로 변환

모든 클라이언트가 같은 normalized 응답을 받을 수 있지만 서버 수정과
기존 저장 데이터 변환이 필요하다.

### 값 범위로 pixel/normalized 좌표 자동 판별

변경량은 작지만 원점 부근 pixel 좌표가 0...1에 포함될 수 있어 좌표
계약을 잘못 판별한다. 잘못된 서버 응답도 조용히 통과시킨다.

## Reason

모델별 coordinate type을 분리하면 외부 모델 교체 시 adapter만
교체할 수 있고, capture geometry와 scoring은 그대로 유지할 수
있다. matching domain은 순수 함수로 유지되어 Camera, MediaPipe,
React lifecycle 없이 단위 테스트할 수 있다.

현재 최대 감지 인원은 4명이므로 assignment는 외부 dependency 없이
완전탐색한다. 최대 경우의 수는 `4! = 24`이며 작은 인원에서 전역
최소 cost를 보장한다.

따라 찍기 모드에서는 Feed image 비율과 가장 가까운 4:3/16:9를
자동 선택하고 고정한다. 새 Feed는 pose와 image geometry가 모두
준비되기 전까지 현재 target을 유지하며 latest request만 active
target으로 commit한다.

실제 서버 응답에서 DWPose 좌표가 source-image pixel 단위임을 확인해,
target image decode가 끝난 뒤 adapter에서 명시적으로 width/height를
나누는 방식을 선택했다. 값 범위 기반 자동 감지는 사용하지 않는다.

## Score

공통 error-to-score 함수는 Gaussian 형태다.

```text
score(error, tolerance)
= 100 * exp(-0.5 * (error / tolerance)^2)
```

### Position

유효한 양쪽 shoulder/hip의 평균을 body center로 사용하고 부족하면
bbox center로 대체한다.

```text
positionError = distance(liveCenter, targetCenter)
positionScore = score(positionError, positionTolerance)
```

### Scale

유효 joint bbox 면적의 제곱근 비율을 사용한다.

```text
scaleRatio = sqrt(liveBBoxArea / targetBBoxArea)
scaleError = abs(log(scaleRatio))
scaleScore = score(scaleError, scaleLogTolerance)
```

로그 비율은 확대와 축소를 대칭적으로 비교한다.

### Pose

각 pose의 joint를 body center와 body scale 기준 상대 좌표로 바꾼다.
body scale은 shoulder width, hip width, shoulder-to-hip 길이의
유효한 평균이다.

```text
relativeJoint = (joint - bodyCenter) / bodyScale
jointError = distance(liveRelativeJoint, targetRelativeJoint)
```

joint score를 TORSO, LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG으로
집계하고 group weight로 가중 평균한다.

### Overall

```text
overall =
  0.30 * positionScore +
  0.20 * scaleScore +
  0.50 * poseScore
```

한 component가 평균에 가려지지 않도록 overall, position, scale,
pose, joint group에 각각 최소 threshold를 적용한다.

scene alignment는 target/live 인원이 같고 모든 assignment가
person threshold를 통과할 때만 성공한다. scene score는 평균이
아니라 가장 낮은 사람의 overall score다.

모든 weight와 tolerance는 `pose-match-config.ts`에 모으며 실제
기기와 사용자 테스트로 조정할 calibration parameter다.

## Feedback

position mismatch는 center delta의 주축으로 `MOVE_LEFT`,
`MOVE_RIGHT`, `MOVE_UP`, `MOVE_DOWN`을 선택한다. scale mismatch는
`scaleRatio`로 `MOVE_CLOSER` 또는 `MOVE_FARTHER`를 선택한다.
pose mismatch는 가장 낮은 joint group으로 팔/다리/몸통 feedback을
선택한다.

비교 가능한 joint 수가 부족하면 자세 보정으로 오인하지 않고
`LOW_CONFIDENCE`를 반환한다. UI 문자열은 domain에 포함하지 않는다.

## Trade-off

얻는 것:

- 서버/MediaPipe 모델 교체가 adapter 경계에 격리됨
- capture와 preview 좌표 변환 분리
- 4:3/16:9, orientation, mirror, cover crop 순수 함수 테스트
- 다중 인물 순서가 달라도 전역 최소 assignment
- Feed 전환 실패나 stale completion이 현재 target을 지우지 않음
- 서버 pixel 좌표와 CommonPose normalized 계약 사이의 명시적 경계

포기하거나 남은 것:

- 4:3/16:9가 아닌 Feed는 가장 가까운 지원 비율로 근사
- 비율이 다르면 cover crop으로 원본 가장자리가 잘릴 수 있음
- targetResolution과 실제 output resolution이 다를 수 있으므로
  Camera 연결 시 `currentResolution`을 capture size로 전달해야 함
- score threshold는 실제 사용자 테스트 전까지 초기 calibration 값
- target pose 변환은 pose `imageUrl`의 decoded 크기가 준비된 뒤 시작됨

## Result

- 서버 single/multi storage shape와 per-person metadata 검증 구현
- 검증된 DWPose body index 0, 5...16 mapping 적용
- DWPose source pixel 좌표를 pose image width/height로 나누어 normalized
  source pose로 변환하고, 이미지 밖 예측 좌표는 clamp하지 않음
- MediaPipe app-domain `confidence` 연결
- 누락 visibility를 confidence 0으로 처리
- DWPose/MediaPipe adapter와 capture projector 분리
- Feed 비율 자동 선택과 latest-only target 준비 구현
- Pose Matching 29개, Camera 설정 12개, Pose detection 5개 테스트 통과
- 변경 영역 TypeScript 오류 없음
- 전체 TypeScript 검사는 기존 shared checkbox/spinner 오류가 남아 있음
- UI toast와 overlay 색상은 변경하지 않음
