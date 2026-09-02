# ADR-0024: RTC 종료 중 CameraPage 차단 오버레이

## Decision

RTC 호스트 종료 처리 중 `ENDING_ROOM`과 `DELIVERING_RESULT` 단계에서만
Camera Capture Workspace 최상단에 full-screen blocking overlay를 표시한다. overlay는
모든 pointer 입력을 가로채고, 같은 조건에서 navigation remove와 Android
hardware back을 차단한다.

`PREPARING_PHOTOS`에서는 기존 종료 사진 선택 화면의 상호작용을 유지한다.
실패하면 상태를 `FAILED`로 바꾸어 overlay와 이탈 차단을 해제한 뒤 Alert에서
재시도를 제공한다.

## Context

RTC 종료는 사진 선택, 서버 저장 및 방 종료, 참여자 결과 RPC 전달 순서로
진행된다. 기존 CameraPage는 종료 상태를 알고 있었지만 RTC 메뉴 하나만
busy 처리했다. 서버 요청과 결과 전달 중에도 촬영, 설정, 가이드, 뒤로
가기 같은 다른 조작이 가능해 중복 요청이나 화면 focus 상실이 발생할 수
있었다.

별도 종료 route로 이동하면 CameraPage의 focus lifecycle에 묶인
VisionCamera와 LiveKit publisher가 정리될 수 있다. 특히 참여자 결과 RPC가
완료되기 전에 Room이 끊기면 서버 종료는 성공했지만 클라이언트 결과 전달은
실패한 부분 완료 상태가 된다.

## Alternatives

### Option A: CameraPage full-screen blocking overlay

현재 종료 state를 presentation 입력으로 사용하고 Camera와 LiveKit을
마운트한 채 입력만 차단한다.

### Option B: 같은 route의 종료 대기 scene

카메라 UI를 대기 화면으로 교체하되 lifecycle component를 별도 sibling으로
유지한다. 화면 의미는 분명하지만 조건부 렌더링에서 native owner를
unmount하지 않도록 구조를 더 크게 분리해야 한다.

### Option C: 별도 Expo Router 종료 route

독립 route로 이동하려면 RTC finalization coordinator와 Room ownership을
page 밖 root/store 계층으로 먼저 승격해야 한다. 현재 범위에서는 focus
변화에 따른 cleanup 위험이 크다.

## Reason

Option A를 선택했다. 종료 workflow와 native resource owner를 바꾸지 않고
가장 작은 presentation 경계로 중복 조작과 화면 이탈을 막을 수 있기
때문이다.

```text
HostRoomContent finalization workflow
  ↓ onFinalizationStateChange
host-controls finalizationState
  ├─ PREPARING_PHOTOS → 기존 사진 선택 화면
  ├─ ENDING_ROOM → blocking overlay
  ├─ DELIVERING_RESULT → blocking overlay
  ├─ FAILED → overlay 해제 + Alert retry
  └─ IDLE → 촬영 결과 화면 또는 기존 카메라
```

종료 workflow와 재시도용 완료 결과 cache는 Host termination controller가,
presentation state snapshot은 Host session controller가 소유하고 Camera
Workspace가 overlay에 전달한다. CameraPage는 `isExitBlocked`만 받아 route
guard를 연결한다. overlay는 LiveKit이나 서버 API를 알지 않고
`RtcHostFinalizationState`만 입력받는다. VisionCamera와
LiveKit lifecycle은 기존 owner가 계속 관리한다.

## Trade-off

얻은 것:

- 서버 종료와 참여자 결과 전달 중 모든 카메라 UI 입력 차단
- CameraSession과 LiveKit Room을 유지한 상태의 안전한 finalization
- 사진 선택 단계는 계속 조작할 수 있는 정확한 상태별 차단
- 실패 후에만 차단을 해제하고 동일 pipeline을 재시도하는 흐름
- 상태별 안내 문구를 갖는 접근 가능한 indeterminate loading UI

포기하거나 제한된 것:

- 종료 중 사용자가 임의 취소하거나 화면을 벗어날 수 없다.
- 서버가 세부 progress를 제공하지 않으므로 퍼센트 대신 spinner를 쓴다.
- 강제 앱 종료나 OS process termination 이후 finalization 복구는 현재
  지원하지 않는다.

## Result

- `isRtcFinalizationBlocking` type guard로 차단 상태를 두 단계로 제한했다.
- CameraPage가 `usePreventRemove`와 hardware BackHandler를 연결하고, Camera
  Workspace가 같은 상태에서 최상단 pointer overlay를 적용한다.
- overlay를 추가해도 Camera와 `RtcHostLiveKit`은 기존 component tree에
  계속 마운트된다.
- 상태 분류, navigation 차단, overlay pointer 계약 테스트와 iOS/Android
  Expo SDK 56 export를 통과했다.
