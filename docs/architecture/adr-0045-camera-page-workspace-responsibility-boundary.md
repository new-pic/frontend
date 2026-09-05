# ADR-0045: Camera Page와 RTC Workspace 책임 경계

## Decision

Camera route의 화면 조합을 Page, Widget, Feature, Entity/adapter 책임으로
분리한다.

- `pages/camera`는 route parameter 정규화, route로 전달된 초기 가이드 조회,
  focus, navigation, route remove guard와 Camera/Result scene 선택만 담당한다.
- `widgets/camera/capture-workspace`는 Camera, Guide, Host control, 촬영 사진
  layer와 종료 overlay를 하나의 촬영 작업 영역으로 조합한다.
- `widgets/rtc/session-workspace`는 Viewer Waiting/LiveKit/Result 및 공용 RTC
  결과 화면을 조합한다.
- `features/rtc/host-controls`는 방 생성, Host token, local connection, room
  event와 종료 요청 상태를 소유한다.
- `features/rtc/join-room`은 Viewer entry/exit, local connection, SSE/RPC 종료
  결과 경합과 Viewer session 정리를 소유한다.
- `features/rtc/finalize-session`은 종료 사진 선택 요청과 업로드 파일 준비를
  소유한다.
- `features/photo/save-images-to-library`는 사진 보관함 권한 요청과 다중 사진
  저장의 부분 성공 정책을 소유한다.
- RTC Room/Session/Stored Photo 데이터와 VisionCamera/LiveKit/MediaLibrary
  adapter는 기존 Entity 또는 Shared 기술 경계에 유지한다.

```text
Camera route params / focus / navigation
  ↓
CameraPage
  ↓ props + route guard command
CameraCaptureWorkspace
  ├─ capture-photo / guide-feed
  ├─ captured photos → save-images-to-library
  ├─ host-controls
  └─ finalize-session
       ↓
RTC Room / Session / Stored Photo entities
       ↓
VisionCamera / LiveKit / MediaLibrary adapters

Viewer route lifecycle
  ↓
RtcViewerPage
  ↓
join-room session controller
  ↓ presentation state + commands
RtcViewerWorkspace
  ├─ Waiting
  ├─ LiveKit
  └─ Result → save-images-to-library
```

Widget은 sheet open 여부, gallery index, overlay 조합, 카메라와 가이드의 표시
상태처럼 화면 조립을 위한 transient state만 갖는다. 서버 mutation 순서,
session cleanup, SSE/RPC 경합, 종료 사진 preparation과 권한·저장 정책은 각
use case Feature가 갖는다. Widget 전용 API segment는 만들지 않는다.

## Context

기존 `CameraPage`는 route parameter와 navigation뿐 아니라 VisionCamera 표시
상태, 가이드, Host room 생성/token/end mutation, 종료 사진 Promise, 결과 변환,
RTC sheet와 gallery까지 함께 관리했다. `RtcViewerPage`도 route guard와 함께
Viewer SSE entry, RPC/SSE 결과 중복 방지, fallback timer, leave와 session
cleanup을 직접 수행했다.

이 구조에서는 화면 배치 변경이 RTC lifecycle 코드를 건드리고, API 실패 정책과
navigation이 한 컴포넌트 안에서 섞였다. 반대로 모든 상태를 하나의 Widget model로
옮기면 Page의 크기만 줄 뿐 비즈니스 책임이 presentation layer에 남는다.

ADR-0044에서 Host/Viewer의 local LiveKit connection과 종료 controller는 이미
역할별 Feature로 분리됐다. 이번 결정은 그 경계를 유지하면서 화면 조합 책임만
상위 Widget으로 옮기는 후속 결정이다.

## Alternatives

### Page 파일만 여러 컴포넌트로 분리

변경량은 작지만 서버 mutation과 session lifecycle이 계속 Page에 남는다. 파일
크기는 줄어도 FSD layer 책임과 테스트 경계는 달라지지 않는다.

### Widget에 Camera/Host/Viewer/Result coordinator 통합

Page는 가장 얇아지지만 Widget이 API, native lifecycle과 종료 상태 전이를 모두
소유하는 새로운 거대 controller가 된다. Host와 Viewer의 서로 다른 실패 및
cleanup 계약도 다시 결합된다.

### 역할별 Feature controller와 화면별 Workspace 사용

Page는 route orchestration, Widget은 presentation composition, Feature는 use
case lifecycle을 담당한다. 연결용 props와 command interface가 늘지만 수정
이유에 따라 변경 위치를 구분할 수 있고 ADR-0044의 역할별 경계를 유지한다.

## Reason

세 번째 안을 선택했다. Camera 화면은 Camera, Guide, RTC Host와 Gallery 등 여러
Feature를 조합하므로 Widget 책임에 맞지만, 방 생성이나 종료 사진 preparation은
UI 조립 규칙이 아니라 실패와 재시도 정책을 가진 use case다. 따라서 Widget은
Feature controller의 상태와 command를 화면에 연결하고 핵심 상태 전이는
Feature에 남긴다.

Page와 Workspace 사이에는 전체 controller를 공유하지 않는다. Camera Page는
Workspace가 공개한 `requestExit` command와 `isExitBlocked` snapshot만 사용해
route remove/hardware back을 연결한다. Viewer Page도 join-room controller의
상태를 navigation과 Alert에 연결할 뿐 결과 경합이나 session clear를 직접
구현하지 않는다.

Camera Result 장면에서도 Capture Workspace component는 숨긴 상태로 유지하고
Camera active만 끈다. 이로써 기존처럼 사용자가 고른 Guide state는 결과 확인 뒤
Camera로 돌아올 때 유지되며, VisionCamera와 Host connection은 Feature 정책에
따라 비활성화·정리된다.

## Trade-off

얻는 것:

- Page 변경 이유가 route/focus/navigation으로 제한된다.
- Host/Viewer API와 session cleanup을 역할별 Feature에서 찾을 수 있다.
- Widget layout 변경이 서버 mutation 및 SSE/RPC 경합 구현과 분리된다.
- Viewer RPC 우선 결과, SSE 1초 fallback과 pre-LiveKit 종료 정책을 한
  controller에서 유지한다.
- 다중 사진 저장이 권한, single-flight와 부분 성공을 명시적으로 표현한다.
- RTC 방 생성 여부와 관계없이 촬영 사진 layer가 같은 다중 사진 저장 Feature를
  사용한다.
- Widget API나 전역 Camera/RTC 상태 머신을 추가하지 않는다.

포기하거나 제한된 것:

- Page route guard와 Workspace command를 연결하는 imperative handle이 하나
  필요하다.
- Camera Workspace는 여러 Feature의 화면을 조합하므로 UI 파일 자체는 여전히
  비교적 크다. 핵심 lifecycle을 갖지 않는 단순 JSX 분할은 필요할 때 별도로
  수행한다.
- Camera/Result 전환에서 상태를 보존하기 위해 Workspace를 숨겨 유지하므로,
  `isFocused` 입력으로 native Camera 활성 상태를 명시적으로 차단해야 한다.
- Steiger의 `insignificant-slice`는 소비자 수만으로 독립 실패 경계를 판단하므로
  Camera/RTC Workspace와 photo-save Feature에 목적이 명확한 예외가 필요하다.

## Result

- `CameraPage`는 route/focus/guard/scene orchestration만 남았다.
- `RtcViewerPage`는 Viewer controller를 route navigation과 hardware back에
  연결한다.
- Host room/token/end query는 `host-controls` Feature API에 유지되고, room 결과
  photo query는 소비 use case인 `join-room` Feature API로 이동했다.
- 내 RTC 사진 cache reset은 Host와 Viewer가 공통으로 사용하는 Entity query
  operation으로 이동했다.
- Host 종료 순서는 기존 `RtcHostLiveKit`과
  `useRtcHostTerminationController`가 계속 직렬화한다.
- Viewer SSE/RPC 결과 경합과 session cleanup은
  `useRtcViewerSessionController`가 담당한다.
- 일반 촬영 사진은 Capture Workspace의 사진 layer에서 선택할 수 있고,
  `save-images-to-library` Feature가 로컬 파일 저장과 권한·부분 실패 정책을
  처리한다.
- TypeScript, Host/Viewer RTC 회귀 테스트와 Steiger 검사는 통과했다.
- 실제 기기에서 Camera capture, Host/Viewer 연결, 종료 결과와 Media Library
  권한 dialog는 이번 작업에서 실행하지 않았으며 별도 수동 검증이 필요하다.
