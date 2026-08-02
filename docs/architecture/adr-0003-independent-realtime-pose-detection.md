# ADR-0003: VisionCamera 실시간 Pose 검출 모듈

## Decision

VisionCamera를 유일한 Camera owner로 유지하고 RTC와 Pose를 각각
독립된 네이티브 모듈로 구성한다. 하나의 YUV FrameOutput을 두
모듈이 동기적으로 소비하며 Pose 결과는 ACK 기반 latest-only
스트림으로 JS에 전달한다.

Pose Landmarker Lite는 `LIVE_STREAM`, 최대 4명, 최대 10 FPS,
입력 긴 변 640px, segmentation mask 비활성 상태로 시작한다.

## Context

RTC 송출과 Pose 추론은 같은 카메라 프레임이 필요하지만 처리 시간,
실패 조건, lifecycle이 다르다. VisionCamera Frame은 callback
밖에서 retain할 수 없고 MediaPipe 추론은 비동기로 완료된다.

## Alternatives

- Pose를 RTC 네이티브 모듈 내부에 추가
- 공용 native dispatcher가 RTC와 Pose lifecycle을 함께 관리
- React Native/JS MediaPipe binding 또는 별도 카메라 사용
- RTC와 Pose가 독립된 FrameSink로 같은 FrameOutput 소비

## Reason

독립 FrameSink는 MediaPipe 초기화나 추론 실패가 WebRTC 송출에
전파되지 않으며 각 기능을 별도로 테스트하고 교체할 수 있다.
Pose는 선택한 프레임을 네이티브 소유 입력으로 복사한 뒤 원본
Frame 접근을 끝내므로 비동기 추론 중에도 VisionCamera Frame
lifetime을 침범하지 않는다.

latest-only 전달은 JS가 느릴 때 과거 자세 결과가 누적되는 것을
막고 현재 자세에 가까운 결과를 유지한다.

## Trade-off

Pose가 수락한 프레임에는 플랫폼별 YUV→RGB/BGRA 복사 비용이
발생한다. 이를 최대 10 FPS, 640px 입력, busy drop으로 제한한다.
독립 모듈이므로 Camera callback은 두 sink의 예외를 개별적으로
격리하고 마지막에 Frame을 한 번만 dispose해야 한다.

모델은 화면 lifecycle 동안 유지하고 Camera가 활성 상태이며
오버레이가 표시되는 동안에만 프레임을 수락한다. `numPoses`가
달라지면 Pose detector만 재생성하며 CameraSession과 RTC는
유지한다.

## Result

MediaPipe Tasks Vision 0.10.35와 Pose Landmarker Lite를 연결했다.
iOS `VisionCameraPose` 타깃 컴파일, Nitro TypeScript 타입 검사,
pose detection 단위 테스트를 통과했다. Android 공식 AAR의 API
시그니처는 검증했지만 작업 환경에 Android SDK가 없어 Android
타깃 컴파일과 실제 기기 추론 검증은 남아 있다.

실제 기기에서는 DEV debug 로그의 `poseCount`와 `landmarkCounts`로
1명, 2명, 3명 이상 결과를 확인하고, 평균 추론 시간, 수락/드롭
프레임, 발열과 배터리 사용량을 함께 기록한다. 이 측정 결과에 따라
10 FPS와 입력 긴 변 640px 초기값을 조정한다.
