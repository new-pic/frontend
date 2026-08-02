# Camera capture settings

## Decision

`capture-photo` feature가 현재 사진 비율과 photo flash 상태를
소유한다.

- 사진 비율 domain 값은 `"4:3" | "16:9"`로 유지한다.
- portrait Preview에는 각각 `3 / 4`, `9 / 16`을 적용한다.
- PhotoOutput target은 각각 `CommonResolutions.UHD_4_3`,
  `CommonResolutions.UHD_16_9`을 사용한다.
- Preview는 선택한 촬영 프레임을 채우도록 `cover`로 렌더링한다.
- 비율 변경 시 PhotoOutput과 CameraSession 재구성을 허용한다.
- 재구성 중에도 LiveKit Room과 publish된 WebRTC track은 유지한다.
- Flash는 torch와 분리된 capture-time 설정으로 전달한다.
- `device.hasFlash`가 `false`이면 선택값과 실제 capture 값을
  `off`로 제한한다.

## Context

사용자가 Camera Preview에서 본 프레임, PhotoOutput이 요청하는
해상도, 실제 촬영 사진의 비율을 최대한 일치시켜야 한다.

동시에 기존 FrameOutput을 사용하는 RTC 송출을 유지해야 한다.
VisionCamera v5에서는 PhotoOutput target이 바뀌면 CameraSession이
재구성되므로 잠깐의 frame 공백은 피할 수 없지만, RTC signaling과
publish된 track을 종료할 필요는 없다.

## Alternatives

### CameraPage가 설정 소유

RTC 상태와 설정을 한 위치에서 조정하기 쉽지만 CameraPage가
촬영 설정과 RTC orchestration을 함께 책임지게 된다.

### 전역 camera settings store

향후 여러 consumer가 구독하기 쉽지만 현재 설정 수와 CameraSession
lifecycle에 비해 복잡하고, 여러 Camera 화면이 생길 때 상태 소유권이
불명확해진다.

### 고정 4:3 PhotoOutput 후 16:9 후처리 crop

비율 변경 시 CameraSession 재구성을 피할 수 있지만 선택한 비율과
PhotoOutput target이 달라진다. 촬영 설정의 의미가 불명확해지고
추가 이미지 처리와 임시 파일 lifecycle이 필요하다.

### 4:3/16:9 PhotoOutput 동시 연결

선택 시 output 교체를 피할 가능성은 있지만 VisionCamera 공식 사용
패턴이 아니고, 여러 PhotoOutput을 동시에 연결할 때 플랫폼별 camera
resource와 resolution negotiation을 보장하기 어렵다.

## Reason

촬영 설정은 `capture-photo`의 책임이며 RTC는 해당 설정의 consumer가
아니다. 설정 상태와 VisionCamera 변환을 feature 안에 두면 UI와 외부
camera API의 경계가 명확하고 순수 함수 테스트가 가능하다.

PhotoOutput target을 실제 선택값과 일치시키는 것이 frame 공백을
완전히 제거하는 것보다 설계 일관성이 높다. RTC Room과 track
lifecycle을 CameraSession 재구성과 분리하면 사용자는 RTC 중에도
비율과 flash를 조정할 수 있다.

## Trade-off

얻는 것:

- 선택 비율, Preview frame, PhotoOutput target의 일관성
- Flash 미지원 기기에서 안전한 capture
- 향후 Pose 좌표 변환이 재사용할 수 있는 명시적인 aspect ratio type
- RTC signaling과 track publication 유지

포기하는 것:

- 비율 변경 순간의 완전한 무중단 FrameOutput
- 모든 기기에서 target pixel size가 정확히 선택된다는 보장

VisionCamera는 여러 output과 기기 capability를 함께 협상하므로 실제
해상도는 `PhotoOutput.currentResolution`으로 검증한다.

## Result

- 4:3과 16:9 target/portrait Preview 매핑 단위 테스트 통과
- 실제 해상도의 portrait/landscape 방향 독립 검증 테스트 통과
- Flash 지원 여부에 따른 effective mode와 순환 테스트 통과
- 기존 Pose matching 테스트 통과
- 변경 코드에 대한 TypeScript 오류 없음
- 전체 TypeScript 검사는 기존 shared checkbox/spinner 오류 때문에
  아직 clean하지 않음
- RTC 중 재구성 시간, 상대방 화면의 frame 공백, 실제 촬영 파일 크기는
  iOS/Android 실제 기기에서 측정 예정
