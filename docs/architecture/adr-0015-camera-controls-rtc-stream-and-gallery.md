# ADR-0015: 카메라 제어, RTC 방 스트림, 촬영 사진 갤러리

## Decision

카메라 비율과 사진 플래시는 VisionCamera를 소유하는 `capture-photo`
feature가 계속 관리하고, Header에는 설정 BottomSheet를 여는 trigger만
노출한다.

RTC 방의 참여자와 상태는 `expo/fetch` SSE transport에서 서버 event를
검증한 뒤 기존 TanStack Query room cache에 병합한다. Camera UI의 방
종료 동작은 서버 mutation을 직접 호출하지 않고 controlled command를
통해 LiveKit host lifecycle의 기존 종료 절차를 실행한다.

촬영 사진 목록은 CameraPage가 소유하는 Safe Area 전체 화면 Layer로
제공한다. 사진 상세만 `SlidePageView` 기반 단일 native Modal로 열고,
선택 화면에서는 이미지 본문 터치와 선택 check 터치를 분리한다. Native
Modal은 route와 별도 view root를 만들 수 있으므로 공용 `PhotoGalleryModal`
자체에 `SafeAreaProvider` 경계를 두고 상·하단 inset을 계산한다.

가이드 trigger는 Header action row에 넣지 않고 Camera Preview 콘텐츠의
우측 상단에 absolute로 배치한다.

## Context

카메라 Header에 참여, 공유, 플래시 설정이 각각 노출돼 촬영 화면이
복잡했다. 비율 설정은 Preview 내부, 플래시는 Header에 있어 같은 촬영
설정의 UI 책임도 분산돼 있었다.

RTC 참여자 조회는 QR 공유 준비 화면이 열려 있을 때만 2초 polling으로
동작해 실제 송출 중에는 참여자 목록이 갱신되지 않았다. 반면 안전한 방
종료 순서는 LiveKit host 내부에서 사진 선택, publisher 정리, 서버 종료,
참여자 RPC, room disconnect 순으로 관리되고 있었다.

촬영 썸네일에는 동작이 없었으며, 종료 및 결과 PhotoGrid는 이미지 터치를
선택에 사용해 상세 갤러리 열기와 같은 interaction을 추가하기 어려웠다.

## Alternatives

### Option A: CameraPage 중심 최소 변경

CameraPage로 촬영 설정을 올리고 polling 범위를 확대하며 LiveKit 종료를
imperative ref로 호출한다. 변경량은 작지만 Camera owner 밖으로 설정이
누출되고 Page가 transport와 native lifecycle까지 알게 된다.

### Option B: 기능 경계를 유지한 통합 구조

Camera 설정은 `capture-photo`, SSE transport와 schema는 `entities/rtc`,
구독 lifecycle과 RTC 메뉴는 `features/rtc`, 화면 조합은 CameraPage가
담당한다. 종료는 controlled command로 기존 LiveKit 절차를 재사용하고
사진 상세는 shared gallery로 분리한다.

### Option C: 전역 Camera/RTC UI 상태 머신

설정 시트, 메뉴, 방 상태와 갤러리 상태를 Zustand에 통합한다. 여러
화면에서 접근하기 쉽지만 현재 화면에만 필요한 transient state가
전역에 남고 TanStack Query 및 CameraView와 상태가 중복된다.

## Reason

Option B를 선택했다. VisionCamera가 계속 유일한 Camera owner이고,
SSE 연결 실패가 LiveKit 영상 송출에 영향을 주지 않으며, 서버 room
상태도 기존 Query Cache를 단일 source of truth로 유지할 수 있기
때문이다. VisionCamera FrameOutput과 LiveKit publisher의 핵심 lifecycle은
ADR-0022에서 별도로 기록한다.

설정 흐름은 다음과 같다.

```text
Header settings trigger
  ↓
CameraSettingsBottomSheet
  ↓
CameraView.captureSettings
  ↓
PhotoOutput / Preview
```

RTC 상태 흐름은 다음과 같다.

```text
GET /rtc/rooms/{roomId}/events
  ↓
SSE parser + RTC event schema
  ↓
TanStack Query room cache
  ↓
RTC camera dropdown
```

종료 흐름은 다음과 같다.

```text
RTC dropdown confirm
  ↓
end request command
  ↓
RtcHostLiveKitPage
  ↓
사진 선택 → publisher 정리 → 서버 종료
  ↓
참여자 결과 RPC → LiveKit disconnect
```

## Trade-off

얻은 것:

- Camera 설정 state와 native output lifecycle의 동일한 소유자
- SSE와 LiveKit 연결의 독립적인 실패 경계
- 참여자 5명 초과 시 스크롤 가능한 실시간 방 메뉴
- 상단과 BackHandler가 공유하는 하나의 방 종료 절차
- 촬영, 종료 선택, 결과 화면에서 재사용하는 사진 슬라이드
- PhotoGrid의 상세 열기와 다중 선택 interaction 분리

포기하거나 제한된 것:

- SSE stream coordinator와 종료 command 상태가 추가된다.
- 공유 준비 QR 화면은 이번 변경에서 기존 UI를 유지한다.
- SSE transport는 access token 갱신 interceptor를 거치지 않으므로
  인증 만료 시 재연결 전에 앱 인증 상태 복구가 필요하다.
- 실제 BottomSheet, VisionCamera output 재구성, LiveKit 송출 유지 여부는
  iOS/Android 실제 기기 검증이 필요하다.

## Result

- 플래시와 사진 비율을 하나의 실제 BottomSheet로 통합했다.
- 참여 및 공유 action을 하나의 RTC dropdown으로 통합하고, 송출 중에는
  SSE 참여자 목록과 방 종료 footer를 표시한다.
- 방 생성 및 종료 중 trigger는 spinner와 disabled 상태가 된다.
- 참여 form을 기존 absolute View에서 실제 BottomSheet로 전환했다.
- 가이드 trigger는 Preview 우측 상단에 별도 배치했다.
- 최근 촬영 사진, 종료 사진 선택, 결과 사진 선택에 공용 슬라이드
  갤러리를 연결했다.
- 촬영 사진 목록과 상세 native Modal의 중첩을 제거했다. 목록은 Camera
  session 내부의 전체 화면 Layer로 유지하고, 상세 사진은 흰색 여백의
  `contain` 방식과 Modal-local `SafeAreaProvider`를 사용하는 단일 Modal로
  표시한다.
- RTC event 병합, 재연결 지연, 메뉴 상태, 갤러리 index와 기존
  Camera/PhotoGrid/Feed SSE 회귀 단위 테스트를 통과했다.
- 전체 TypeScript 검사에서는 이번 변경과 무관한 기존
  `checkbox` 및 `spinner` 타입 오류가 남아 있다.
