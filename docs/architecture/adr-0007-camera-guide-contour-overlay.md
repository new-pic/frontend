# ADR-0007: 서버 contour 기반 촬영 가이드 윤곽선

## Decision

배경 제거 이미지를 Preview 위에 렌더링하지 않고,
`background-removal` 응답의 normalized `contours`를
`react-native-svg` Path로 그린다.

서버 contour는 source image normalized coordinate로 보관하고 다음
순서로만 화면 좌표에 투영한다.

```text
BackgroundRemoval DTO
        ↓
FeedGuideContourAdapter
        ↓
SourceNormalizedContour[]
        ↓
Source-to-Preview cover projection
        ↓
SVG outline
```

## Context

촬영 가이드는 배경 제거 PNG의 인물을 화면에 합성하는 기능이 아니라,
선택한 피드의 인물 외곽선을 카메라 위에 안내선으로 표시하는 기능이다.

서버 응답은 이미지 크기와 함께 다음 정보를 제공한다.

- `imageWidth`, `imageHeight`
- `contours[].contourIndex`
- `contours[].closed`
- `contours[].areaRatio`
- normalized `contours[].points`

Target DWPose와 실시간 MediaPipe Pose는 최종 촬영 canvas를 기준으로
비교한다. 반면 contour는 비교 입력이 아니라 Preview 전용 표현이므로
실제 Preview layout을 직접 목적지 canvas로 사용한다. Source와 Preview
비율이 다르면 한 번의 center-cover crop을 적용한다.

## Alternatives

### 배경 제거 PNG 직접 렌더링

구현은 단순하지만 인물 이미지가 카메라를 가리고, 윤곽선 안내라는 제품
의미와 다르다.

### 배경 제거 PNG alpha를 클라이언트에서 분석

서버 contour가 없는 경우 사용할 수 있지만 이미지 decode와 pixel
접근이 필요하고 JS/native 비용과 플랫폼별 복잡도가 증가한다.

### 서버 contour를 하나의 복합 Path로 결합

SVG 노드 수를 줄일 수 있지만 contour별 검증, 디버깅, 향후 스타일
적용이 어려워 현재 규모에는 과하다.

### Capture canvas를 경유해 Preview로 투영

Pose와 좌표 변환 단계를 공유할 수 있지만 sensor-native PhotoOutput
해상도와 output orientation이 Preview 방향과 다르게 해석되면 cover가
중복 적용되어 윤곽선이 Preview보다 크게 렌더링될 수 있다. Preview
전용 표현이 PhotoOutput lifecycle에 결합되는 문제도 있다.

## Reason

서버가 이미 계산한 contour를 사용하면 이미지 pixel 변환이 없고,
기존 `react-native-svg` dependency만으로 iOS와 Android를 동일하게
지원할 수 있다. 각 contour를 독립된 Path로 유지하면 여러 인물과
분리된 외곽선을 그대로 표현할 수 있다.

윤곽선을 source canvas에서 실제 Preview layout으로 한 번만 투영하기
때문에 stroke 두께가 source image 크기나 4:3/16:9 crop에 따라
달라지지 않는다. Source와 Preview 비율이 같으면 각 점은
`x * previewWidth`, `y * previewHeight`로 정확히 대응한다.

## Trade-off

얻는 것:

- 카메라를 가리지 않는 윤곽선 가이드
- PhotoOutput orientation과 독립적인 Preview 전용 좌표 계약
- warning 상태에서 geometry 변경 없이 stroke 색만 변경
- 순수 함수 기반 좌표 및 Path 테스트

포기하는 것:

- 배경 제거 PNG 원본 색상 표시
- contour와 Pose가 하나의 Source → Capture → Preview 함수를 공유하는 구조
- 매우 많은 contour를 하나의 native SVG node로 합치는 미세 최적화

## Result

- API adapter가 크기와 normalized contour contract를 검증한다.
- 기본 상태는 흰색, `MISALIGNED`는 빨간색 윤곽선을 표시한다.
- 검은색 보조 stroke로 밝은 카메라 배경에서도 선을 구분한다.
- contour projection은 `captureSize`를 참조하지 않고 Preview `onLayout`
  크기만 목적지 canvas로 사용한다.
- `576 x 1024` source와 같은 비율의 Preview에서 normalized point가
  Preview 픽셀 좌표로 직접 대응하는 단위 테스트를 추가했다.
- 가이드 변경은 SVG 데이터만 바꾸며 CameraSession, FrameOutput,
  MediaPipe, RTC lifecycle을 재시작하지 않는다.

실제 기기에서는 다음을 추가 검증한다.

- 4:3 / 16:9의 외곽선과 촬영 결과 일치
- 전면 카메라 자동 mirror 일치
- 다중 인물 contour 표시
- contour가 매우 많을 때 렌더링 비용
