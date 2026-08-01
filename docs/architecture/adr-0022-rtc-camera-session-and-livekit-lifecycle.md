# ADR-0022: RTC 카메라 세션과 LiveKit lifecycle

## Decision

RTC 호스트는 별도 카메라를 생성하지 않고 `capture-photo` feature가 소유하는
하나의 VisionCamera `FrameOutput`을 사용한다. Camera callback은 같은 YUV
Frame을 RTC와 Pose의 독립 native sink에 동기 전달하고, 두 sink 접근이 끝난
뒤 caller가 Frame을 정확히 한 번 해제한다.

RTC 영상 게시 책임은 `RtcVideoPublisher` interface 뒤에 격리한다. 현재
`VisionCameraVideoPublisher`는 native WebRTC track 생성, LiveKit publish,
RTC frame sink 활성화와 역순 cleanup을 소유한다. CameraPage와 LiveKit UI는
native track 구현을 직접 알지 않는다.

RTC session identity는 메모리 Zustand store가 소유한다. `hostSession`과
`viewerSession`은 상호배타적이며 LiveKit connection도 현재 role과 함께
보관한다. 방 access token과 LiveKit token은 앱 재시작 이후 복구하지 않고
현재 프로세스에만 유지한다.

```text
HOST

CameraPage focus
  ↓
VisionCamera (single camera owner)
  ↓ YUV FrameOutput
  ├─ RTC native frame sink
  │      ↓ native WebRTC MediaStreamTrack
  │      ↓ RtcVideoPublisher
  │      ↓ LiveKit local track publish
  └─ Pose native frame sink

VIEWER

Join code
  ↓ RTC join API → roomId + participantId
  ↓ viewer LiveKit token API
  ↓ LiveKitRoom subscribe-only connection
  ↓ remote camera track render
```

## Context

촬영자는 사진 Preview와 촬영 중인 같은 카메라 영상을 참여자에게 보내야
한다. LiveKit의 기본 camera capture나 `getUserMedia()`를 추가하면
VisionCamera와 별도 native CameraSession이 생겨 기기 자원 경합, 서로 다른
구도와 camera switch 불일치가 발생할 수 있다.

또한 Camera Frame, native WebRTC track, LiveKit Room은 서로 다른 수명을
가진다. 화면 blur나 종료 요청 중 진행 중이던 `connect()`가 늦게 완료될 수
있고, track release를 두 번 실행하면 native registry 소유권이 깨질 수 있다.
호스트와 참여자 token endpoint 및 identity도 서로 다르므로 role state를
명확히 분리해야 한다.

## Alternatives

### LiveKit 기본 camera capture 사용

LiveKit 통합은 단순하지만 VisionCamera 외에 두 번째 camera owner가 생긴다.
PhotoOutput, Preview, FrameOutput과 송출 영상의 기기·비율·lifecycle이 서로
달라질 수 있어 현재 제품 계약에 맞지 않는다.

### CameraPage가 Room, native track과 frame sink를 직접 관리

한 파일에서 전체 흐름을 볼 수 있지만 화면 조합 계층이 native track release,
LiveKit publish 순서와 오류 복구를 모두 알게 된다. publisher 교체와 lifecycle
단위 테스트도 어려워진다.

### VisionCamera FrameOutput과 publisher adapter 분리

VisionCamera는 Frame 소유권만 유지하고, RTC native module은 push capture와
WebRTC track을, publisher는 LiveKit publication lifecycle을 담당한다. 경계가
추가되지만 Camera, native RTC와 LiveKit 실패를 서로 격리할 수 있다.

## Reason

세 번째 구조를 선택했다. Camera owner를 하나로 유지하면서 RTC 구현 세부를
`RtcVideoPublisher`로 교체 가능하게 만들 수 있기 때문이다. Pose와 RTC는
같은 FrameOutput을 사용하지만 별도 sink이므로 한쪽의 throw가 다른 쪽 호출과
`frame.dispose()`를 막지 않는다.

호스트 publisher의 전이는 내부 promise queue로 직렬화한다. 시작은 raw track
생성 → LiveKit publish → frame 수신 활성화 순서이고, 종료는 frame 수신 차단
→ unpublish → raw track stop/release 순서다. track registry 소유권은 실제
release 호출 전에 소비해 cleanup 재진입에서도 두 번 해제하지 않는다.

`RtcHostLiveKitPage`는 connect와 cleanup promise를 single-flight로 유지하고
lifecycle epoch로 오래된 connect 완료를 무효화한다. Camera route가 focus를
잃으면 CameraSession과 host publisher/Room cleanup을 시작하며, 다시 활성화될
때만 새 연결 세대를 허용한다.

종료 흐름은 사용자가 사진을 확정한 후 publisher를 정리하고 서버 방 종료 및
참여자 결과 RPC를 수행한다. 중간 단계가 실패해도 `finally`에서 publisher와
Room disconnect를 재시도한다.

## Trade-off

얻는 것:

- Preview, PhotoOutput과 RTC가 공유하는 단일 VisionCamera owner
- RTC와 Pose native module의 독립된 실패 경계
- native track 구현과 LiveKit UI/domain 사이의 adapter 경계
- 중복 start/stop, 늦은 connect 완료와 이중 track release 방지
- 호스트/참여자 session과 token 요청 identity의 명확한 분리

포기하거나 제한된 것:

- YUV → WebRTC frame 변환과 native track module을 iOS/Android에서 직접
  유지해야 한다.
- RTC token과 session이 메모리 기반이라 앱 프로세스 종료 후 방을 자동
  복원하지 않는다.
- CameraSession 재구성 중에는 송출 Frame 공백이 생길 수 있지만 LiveKit
  signaling과 publish된 track 자체는 유지한다.
- RTC 영상 해상도와 FPS는 현재 `1280 x 720`, 30 FPS 초기값을 사용하며
  네트워크 적응 정책은 별도 calibration이 필요하다.

## Result

- CameraPage의 한 VisionCamera가 Preview, PhotoOutput, RTC/Pose FrameOutput을
  함께 제공한다.
- Frame callback은 각 native sink 오류를 격리하고 `finally`에서 Frame을
  정확히 한 번 해제한다.
- 호스트는 VisionCamera native track만 LiveKit에 publish하며 참여자는
  camera capture 없이 remote track만 구독한다.
- store setter가 host와 viewer session을 상호배타적으로 전환하고 role이
  일치하는 LiveKit connection만 함께 정리한다.
- 화면 blur, unmount와 방 종료가 같은 idempotent publisher cleanup 경로를
  재사용한다.
- 참여자 종료 결과는 권한이 있는 host RPC와 같은 `roomId`인지 검증한 뒤에만
  결과 화면으로 전달한다.
- 후속 참여자 SSE, 반응 Socket.IO, 임시 사진 앨범은 각각 ADR-0015,
  ADR-0008, ADR-0010의 독립 경계에서 이 lifecycle을 확장한다.
