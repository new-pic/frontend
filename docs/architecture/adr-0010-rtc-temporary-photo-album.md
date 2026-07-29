# ADR-0010: RTC 임시 촬영 앨범

## Decision

RTC 서버 저장 사진을 `RtcStoredPhoto` entity로 분리하고, 서버 목록은
React Query infinite query가 소유한다. RTC 종료 시 선택한
`SessionPhoto`를 파일로 준비한 뒤 서버의 방 종료 API에 함께 전달하고,
성공한 경우 내 사진 목록 query를 reset한다.

프로필의 자동 전환 Preview는 독립 widget으로, 전체 목록은 별도 page로
구성한다. 두 UI는 같은 query와 `expiresAt` 기반 가시성 feature를
사용한다.

## Context

앱에는 기기 사진, 피드 이미지, 촬영 세션의 로컬 사진, RTC 서버 저장
사진이 함께 존재한다. RTC 저장 사진에는 `roomId`, `createdAt`,
`expiresAt`이 있으며 보관 기준은 방 종료 시점이 아니라 서버가 계산한
방 생성 시점 기준이다.

현재 서버는 사진 전용 업로드 API 대신 다음 계약을 제공한다.

- `PATCH /api/rtc/rooms/{id}/end`: 최대 20개 이미지를 multipart로 받아
  사진 저장과 방 종료를 함께 처리
- `GET /api/users/me/photos`: `take`/`cursor` 기반 내 사진 목록
- `GET /api/rtc/rooms/{id}/photos`: 참여한 방의 사진 목록

## Alternatives

### Option A: 기존 User/RTC 모델에 사진 DTO 유지

파일 수는 적지만 서로 다른 두 entity가 같은 서버 사진을 중복 정의하게
된다. 프로필 앨범과 방 결과 화면의 계약이 다시 갈라질 가능성이 높다.

### Option B: 전용 RtcStoredPhoto entity와 UI별 feature/widget 분리

서버 DTO와 query key를 한곳에서 관리하면서 `SessionPhoto`와 타입을
명확히 구분할 수 있다. Preview의 timer 상태는 widget에, 페이지네이션은
React Query에 머무른다. 파일 수는 늘지만 경계와 확장 지점이 분명하다.

### Option C: 전역 앨범 store에서 사진과 timer 관리

페이지 밖에서도 쉽게 접근할 수 있지만 서버 cache와 상태가 이중화된다.
만료, cursor, 재조회 결과를 Zustand와 React Query 사이에서 동기화해야
하므로 이 기능의 요구보다 복잡하다.

## Reason

Option B를 선택했다. 서버 데이터는 React Query를 단일 source of truth로
유지하고, 사진 종류별 책임을 분리할 수 있기 때문이다. `roomId`를
버리지 않으므로 이후 세션별 묶음이나 방별 화면으로 확장할 수 있다.

데이터 흐름은 다음과 같다.

```text
VisionCamera
  ↓
SessionPhoto (local file URI)
  ↓
RTC finalize feature (Expo File 준비)
  ↓
PATCH /rtc/rooms/{roomId}/end
  ↓
RtcStoredPhoto query reset
  ↓
Profile Preview widget / Photo Grid page
```

조회 흐름은 다음과 같다.

```text
Server DTO
  ↓
RtcStoredPhoto schema
  ↓
React Query infinite pages
  ↓
expiresAt visibility feature
  ↓
Preview / Grid UI
```

## Trade-off

얻은 것:

- 로컬 `SessionPhoto`와 서버 `RtcStoredPhoto`의 명확한 경계
- `roomId`와 서버 `expiresAt` 보존
- Profile과 방 결과 화면에서 재사용하는 단일 cursor query 계약
- Preview timer, 만료 timer, 목록 cache의 분리된 lifecycle
- 서버 사진이 없을 때 Profile 영역을 숨기는 자연스러운 empty state

포기하거나 제한된 것:

- 현재 서버의 종료 API가 저장과 종료를 한 요청으로 묶으므로 클라이언트는
  서버 내부의 사진 저장 실패와 방 종료 실패를 따로 판별할 수 없다.
- 응답도 저장된 사진 목록만 제공하므로 개별 사진의 부분 실패 상태를
  만들어내지 않는다.
- 이번 단계에서는 `roomId`별 그룹 UI를 만들지 않는다.
- 서버가 thumbnail URL을 제공하지 않아 Grid도 원본 URL을 사용한다.
  대신 `expo-image` cache와 `FlatList` virtualization을 사용한다.

## Result

- RTC 종료 전에 선택한 로컬 파일을 준비하고, 준비 실패 시 영상 송출
  종료 전에 재선택할 수 있게 했다.
- 서버 요청이나 결과 RPC가 실패해도 publisher와 LiveKit room cleanup은
  `finally`에서 수행된다.
- 종료 성공 후 저장 사진이 있으면 infinite query를 reset해 다음 Profile
  진입에서 첫 페이지부터 최신 데이터를 받는다.
- Preview는 사진이 2장 이상일 때만 단일 timeout으로 전환하며 unmount 시
  정리된다.
- 화면에 남아 있는 사진은 가장 가까운 서버 `expiresAt` 시점에 제거하고
  관련 query를 invalidate한다.
- DTO, 만료 필터, 최근 만료 timer 계산, cursor page 중복 제거 단위
  테스트를 추가했다.
- 실제 기기에서 multipart 업로드, Profile 전환, 장시간 만료 동작은 별도
  검증 항목으로 남긴다.
