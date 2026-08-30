# ADR-0040: RTC Room, runtime Session과 Stored Photo Entity 경계

## Decision

기존 `entities/rtc` Aggregate를 하나의 기술 이름으로 유지하지 않고 실제
identity와 lifecycle에 따라 다음 경계로 분리한다.

```text
entities/rtc-room
  - 방 생성·조회·입장·퇴장·종료 API 계약
  - `room-state-schema`: 방, 호스트, 참가자와 SSE 이벤트
  - `room-command-schema`: 생성·입장·종료 요청과 종료 결과
  - 방 Query Key와 SSE adapter
  - 방 종료 결과 RPC payload 계약

entities/rtc-session
  - 메모리 기반 Host/Viewer session identity
  - LiveKit connection과 token 계약
  - Host 인증 header 조합
  - VisionCamera → LiveKit video publisher adapter

entities/rtc-stored-photo
  - 서버에 영속된 RTC 사진과 목록
  - 사용자별 Stored Photo Query Key

features/rtc/reactions
  - Reaction emoji 응답 계약
  - Reaction 전용 Query Key와 Socket lifecycle
```

`rtc-room`은 서버의 방 상태와 방 lifecycle을, `rtc-session`은 현재 앱
프로세스에만 존재하는 연결 자격과 media lifecycle을 소유한다. Stored Photo는
방 종료 후에도 조회되고 별도의 만료 시간을 가지므로 기존처럼 독립 Entity로
유지한다. Reaction은 현재 해당 Feature 밖의 소비자가 없으므로 작은 Entity를
추가하지 않고 Feature 내부 계약으로 둔다.

```text
RTC API / SSE
  ↓
entities/rtc-room
  ↓
host-controls / join-room
  ↓
entities/rtc-session
  ↓
LiveKit / VisionCamera adapter
  ↓
Camera UI

Stored Photo API
  ↓
entities/rtc-stored-photo
  ↓
사진 탐색·저장 Feature
  ↓
Profile Preview / Photo Page
```

## Context

기존 `entities/rtc`에는 방 응답과 SSE event뿐 아니라 Host/Viewer session,
LiveKit token과 connection, 영상 publisher, Reaction emoji 응답이 함께 있었다.
따라서 `rtc`가 서버 Room Entity인지, 클라이언트 연결 lifecycle인지, RTC라는
외부 기술의 adapter인지 이름만으로 판단하기 어려웠다.

이 책임들은 실패와 수명도 다르다. SSE 또는 Room 조회 실패는 방 상태를
갱신하지 못한 것이지만 LiveKit publisher 실패는 media 송출 실패다. Stored
Photo 조회 실패는 이미 끝난 방의 사진 목록 실패이며 현재 Room session을
무효화해서는 안 된다.

## Alternatives

### 기존 `entities/rtc` 유지

import 변경이 없고 전체 RTC public API를 한 곳에서 찾을 수 있다. 반면 Room,
runtime session과 외부 media adapter의 경계가 계속 숨겨지고 Slice가 새로운 RTC
기능의 기본 수집 지점이 된다.

### 책임을 그대로 둔 채 `rtc`를 `rtc-room`으로 이름만 변경

폴더 이름은 `rtc-stored-photo`와 대칭이지만 LiveKit connection과 publisher까지
Room Entity인 것처럼 표현한다. 실제 책임을 바꾸지 않은 이름 변경이므로 잘못된
명확성을 만든다.

### identity와 lifecycle을 기준으로 Slice 분리

파일 이동과 public API 변경 비용이 있지만 Room cache, runtime connection과
영속 사진이 각자 독립적으로 진화할 수 있다. 같은 이유로 Feature 전용 Reaction
계약도 Entity Aggregate에서 제거할 수 있다.

## Reason

세 번째 안을 선택했다. FSD Slice는 사용하는 기술이 아니라 변경 이유와 domain
identity를 표현해야 한다. Room, 현재 프로세스의 연결 Session, 서버에 저장된
Photo는 서로 다른 상태 소유자와 lifecycle을 가지므로 하나의 Aggregate로 묶을
근거보다 분리할 근거가 크다.

LiveKit과 VisionCamera를 연결하는 publisher는 외부 라이브러리 세부사항을
격리하는 adapter다. 현재 Host와 Viewer의 런타임 연결 모델과 함께 사용되므로
`rtc-session` 경계에 유지하되 `rtc-room`에서는 해당 라이브러리를 알지 못하게
한다.

## Trade-off

얻는 것:

- Slice 이름만으로 Room, runtime Session과 Stored Photo 책임을 구분한다.
- Room schema와 Query cache가 LiveKit 구현 변경의 영향을 받지 않는다.
- Stored Photo 실패와 현재 Room/connection 실패를 독립적으로 처리한다.
- Reaction Feature가 독자적인 Query Key와 응답 계약을 소유한다.
- 새 RTC 기능을 추가할 때 기술 이름이 아니라 실제 lifecycle을 기준으로
  위치를 선택할 수 있다.

포기하거나 제한된 것:

- Host/Viewer use case는 Room 계약과 Session 상태가 모두 필요해 두 Entity를
  명시적으로 조합한다.
- `rtc-session`의 publisher는 현재 VisionCamera와 LiveKit에 결합되어 있다.
  다른 transport로 교체할 때 interface는 유지할 수 있지만 adapter 구현 이동은
  추가 검토가 필요하다.
- Query Key namespace가 `rtc-room`, `rtc-reactions`로 구체화되어 기존 메모리
  cache와 호환되지 않지만 앱 재실행 간 Query cache를 영속하지 않으므로 사용자
  데이터 migration은 필요하지 않다.

## Result

- 방 관련 API, schema, SSE와 Query Key는 `entities/rtc-room`에서만 export한다.
- Host/Viewer session, LiveKit connection과 publisher는
  `entities/rtc-session`에서만 export한다.
- `entities/rtc-stored-photo`의 독립 Query와 만료 lifecycle은 유지한다.
- Reaction emoji 계약과 Query Key는 `features/rtc/reactions` 내부로 이동했다.
- 기존 endpoint, 요청 payload, RTC store 전이와 Camera/LiveKit lifecycle은
  변경하지 않았다.
