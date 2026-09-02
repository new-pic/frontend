# ADR-0044: RTC 역할별 연결과 Session 종료 lifecycle

## Decision

Host와 Viewer의 LiveKit 연결 정보 및 명시적 종료 절차를 각 역할 feature가
소유한다. `entities/rtc-session` store에는 현재 프로세스의 Host/Viewer session
identity만 두고, 화면 연결에만 필요한 LiveKit URL/token은 전역 상태로 올리지
않는다.

```text
Host 종료 입력
(종료 메뉴 / 화면 뒤로가기 / Android back)
  ↓
host termination controller (single-flight)
  ↓ 사진 선택·업로드 준비
  ↓ publisher stop
  ↓ 서버 room end
  ↓ Viewer 결과 RPC
  ↓ LiveKit disconnect
  ↓ Host session clear
  ↓ 결과 화면
  ↓ 완료: Camera 유지 또는 이전 화면 이동

Viewer 나가기 입력
(대기 취소 / LiveKit 화면 닫기 / Android back)
  ↓
viewer exit controller (single-flight)
  ↓ 서버 participant leave
  ↓ LiveKit disconnect (연결된 경우)
  ↓ Viewer session clear
  ↓ Feed 이동
```

Host 종료 controller는 사진 준비, publisher 정리, 서버 종료, 결과 전달과 Room
정리의 실행 순서를 조정한다. Camera Workspace는 `finalize-session`의 사진 준비
command와 `host-controls`의 종료 API callback을 조합하고, LiveKit UI는
publisher/Room adapter를 주입한다. 종료 버튼과 화면
이탈은 같은 요청을 사용한다. 화면 이탈에서 시작된 종료도 사진 선택과 결과
전달을 생략하지 않으며, 결과 화면에서 `완료`를 선택한 뒤 이전 화면으로
이동한다.

Viewer exit controller는 LiveKit 연결 전후에 관계없이 서버 leave를 먼저
수행한다. 서버 leave가 실패하면 LiveKit 연결과 Viewer session을 유지해 같은
화면에서 재시도할 수 있다. 서버 leave 성공 후 로컬 disconnect가 실패한 경우는
서버 session을 되돌릴 수 없으므로 session 정리와 navigation을 계속하고,
component unmount cleanup에 마지막 disconnect를 맡긴다.

역할별 lifecycle UI도 사용하는 feature로 이동한다.

- `host-controls`: Host LiveKit publisher/Room, 공유 준비 Sheet
- `join-room`: Viewer SSE/token entry, LiveKit 구독, 대기 UI, exit controller
- `finalize-session`: 종료 사진 선택 UI와 업로드 파일 준비

Camera/Viewer/Result 화면 조합의 후속 책임 분리는 ADR-0045에서 다룬다.

## Context

기존 store는 Host/Viewer session과 `liveKitConnection`을 함께 보관했다. 하지만
Host는 Camera Page가 token 응답으로 별도의 `broadcastConnection`을 다시
만들었고, Viewer만 전역 connection을 실제 렌더링에 사용했다. 한 store의
필드가 역할별로 다르게 사용되어 연결 상태의 실제 소유자를 알기 어려웠고,
늦은 token 응답이 runtime 전역 상태를 변경할 수 있었다.

종료 흐름도 진입 위치에 따라 달랐다. Host의 종료 메뉴는 사진 저장, 서버 방
종료와 결과 RPC를 수행했지만 화면 뒤로가기는 component unmount cleanup만
실행했다. Viewer는 LiveKit 연결 전 취소에서는 서버 leave를 호출했지만 연결 후
나가기에서는 Room disconnect와 로컬 session clear만 수행했다. 그 결과 UI는
사라졌지만 서버에는 활성 Room 또는 participant가 남을 수 있었다.

## Alternatives

### 전역 RTC store에 모든 connection과 종료 상태 유지

페이지 간 연결 전달은 단순하지만 session identity, 일회성 token, Room 객체와
종료 진행 상태가 하나의 전역 수명으로 섞인다. Host/Viewer의 다른 연결 방식과
화면 unmount 시점을 store action이 알아야 한다.

### 각 UI event handler에서 필요한 cleanup 직접 수행

추가 abstraction은 적지만 종료 버튼, back handler와 연결 전후 화면마다 호출
순서가 다시 갈라진다. 새 종료 진입점이 추가될 때 서버 요청이나 cleanup 단계가
누락되기 쉽다.

### 역할별 local connection과 lifecycle controller 사용

연결 정보는 실제 연결 화면의 수명에 묶고, 여러 UI 진입점은 역할별 controller의
한 종료 명령으로 합친다. callback 경계가 추가되지만 서버 상태와 media cleanup의
순서를 한 곳에서 보장할 수 있다.

## Reason

세 번째 안을 선택했다. LiveKit token은 session identity가 아니라 특정 화면
연결을 위한 단기 자격이므로 소비하는 역할 feature가 소유하는 편이 수명과
일치한다. 반면 `roomId`, Host access token과 `participantId`는 여러 역할
use case가 공유하는 runtime session identity이므로 Entity store에 남긴다.

종료는 단순 UI callback이 아니라 서버와 media 상태를 함께 바꾸는 use case다.
역할별 controller가 single-flight와 순서를 소유하면 어떤 UI에서 시작하더라도
동일한 계약을 지킬 수 있고, API 실패 시 session을 지운 뒤 복구할 수 없는
상태를 피할 수 있다.

## Trade-off

얻는 것:

- Host/Viewer LiveKit token의 실제 소비자와 상태 소유자가 일치한다.
- 종료 버튼과 화면 이탈이 같은 사진 저장·서버 종료·cleanup 경로를 사용한다.
- Viewer 연결 전후의 나가기가 같은 서버 leave 정책을 사용한다.
- 중복 종료 입력은 controller의 진행 중 Promise를 재사용한다.
- 서버 종료 실패 시 runtime session을 유지해 재시도할 수 있다.
- lifecycle UI가 역할 feature public API를 통해 Workspace에 제공된다.

포기하거나 제한된 것:

- 앱 프로세스가 종료되면 LiveKit 연결 정보와 RTC session은 복원되지 않는다.
- Host 서버 종료 후 Viewer RPC가 실패하면 재시도 시 새 Room 연결이 필요하다.
- LiveKit disconnect 자체가 실패해도 서버 종료가 확정된 뒤에는 session 종료를
  되돌리지 않는다.
- 화면 조합 책임은 ADR-0045의 Camera/RTC Workspace가 담당한다.

## Result

- `useRtcStore`는 Host/Viewer session identity만 관리한다.
- 역할별 local connection은 공통 `url`, `token`만 표현하며 상태 소유 위치가
  Host/Viewer 역할을 결정한다.
- Host token 응답은 Camera 흐름의 local `broadcastConnection`으로만 전달된다.
- Viewer token 응답은 `useRtcViewerEntry`의 local connection이 되며 session
  epoch가 바뀐 뒤 완료된 응답은 무시한다.
- Host 종료 controller가 사진 선택, publisher stop, 서버 end, 결과 RPC와 Room
  disconnect를 직렬화한다.
- Host 뒤로가기는 종료 완료와 결과 확인 전에는 route를 제거하지 않는다.
- Viewer exit controller는 서버 leave 성공 뒤에만 LiveKit과 session을 정리한다.
- 서버 leave/end 실패 시 현재 화면과 session identity를 유지한다.
