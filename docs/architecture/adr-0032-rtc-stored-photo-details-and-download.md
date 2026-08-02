# ADR-0032: RTC 임시 촬영 사진의 상세 정보와 저장 경계

## Decision

공용 `PhotoGalleryModal`은 현재 사진을 기준으로 UI를 확장할 수 있는
render slot만 제공한다.

- `renderHeaderRight`: 현재 사진에 대한 header action
- `renderImageOverlay`: 사진 위 상태 표시
- `renderFooterDetails`: 사진별 상세 정보

RTC 임시 촬영 사진 feature가 이 slot을 조합해 다음 동작을 소유한다.

- `expiresAt`이 10분 이하로 남으면 `곧 만료될 이미지` badge 표시
- `createdAt`을 기기 시간대의 한국어 절대 시각으로 표시
- 현재 보고 있는 사진을 휴대폰 사진 보관함에 저장

원격 이미지의 다운로드와 Media Library 저장은 `shared/lib/media`의
adapter로 격리한다. 원격 파일은 cache에 내려받아 저장하고, 성공과
실패 여부와 관계없이 임시 파일 정리를 시도한다. 기존 RTC 공유 결과
저장 화면도 동일한 adapter를 재사용한다.

## Context

프로필의 최근 촬영 사진은 서버에서 `createdAt`, `expiresAt`,
`imageUrl`을 포함해 전달되지만, 기존 상세 갤러리는 이미지와 현재
순번만 표시했다. 임시 사진이 만료되기 전에 사용자가 상태를 인지하고
현재 사진을 기기에 보관할 수 있는 흐름이 필요했다.

공용 갤러리에 RTC DTO와 만료 정책을 직접 넣으면 다른 사진 갤러리의
재사용성이 낮아진다. 반대로 프로필 전용 갤러리를 새로 만들면 swipe,
safe area, 현재 index 관리가 중복된다.

## Alternatives

### Option A: 공용 갤러리에 현재 사진 기반 render slot 추가

공용 갤러리는 현재 사진 context만 제공하고 RTC feature가 badge,
시간, 다운로드를 렌더링한다. 갤러리 동작을 재사용하면서 도메인
의존성을 만들지 않는다.

### Option B: 현재 index를 외부에서 완전히 제어

호출부가 `activeIndex`와 swipe lifecycle을 소유해 모든 상세 UI를
구성할 수 있다. 자유도는 높지만 기존 내부 index 상태와 API를 크게
바꿔 모든 갤러리 호출부의 회귀 위험이 증가한다.

### Option C: RTC 촬영 사진 전용 갤러리 구현

RTC 요구사항을 자유롭게 구현할 수 있지만 공용 갤러리의 paging,
safe area, 선택 UI를 복제해야 하고 두 갤러리를 함께 유지해야 한다.

## Reason

Option A를 선택했다. 공용 컴포넌트는 `현재 사진이 무엇인지`만 알고,
만료 정책과 저장 use case는 RTC feature에 남길 수 있기 때문이다.
외부 라이브러리는 shared adapter 뒤에 격리되어 Expo API가 변경되어도
호출 화면의 수정 범위가 작다.

```text
RtcStoredPhoto API DTO
  ↓
RTC photo query / active-photo filter
  ↓
ProfileRtcPhotoPage
  ├─ createdAt → RTC formatter → gallery footer
  ├─ expiresAt → RTC expiry policy → image badge
  └─ download action
       ↓
     RTC save use case
       ↓
     shared media adapter
       ├─ expo-file-system cache download
       └─ expo-media-library save
```

상태 소유권은 다음처럼 분리한다.

- gallery의 현재 index: `PhotoGalleryModal`
- 저장 진행 상태와 permission 요청: RTC save hook
- 만료 임박/만료 전환 timer: 현재 badge instance
- 다운로드 임시 파일 lifecycle: shared media adapter

## Trade-off

얻은 것:

- 기존 갤러리의 swipe와 safe area 동작 재사용
- RTC 도메인이 shared UI로 유출되지 않음
- 현재 swipe된 사진을 기준으로 시간, badge, 다운로드가 함께 변경됨
- 10분 경계와 만료 시점에만 동작하는 one-shot timer
- 원격/로컬 이미지 저장 구현의 단일화
- 한 번에 하나의 저장 요청만 허용해 중복 터치 방지

제한:

- `createdAt`은 서버 시각을 기기의 현재 시간대로 변환해 보여준다.
- 사용자가 저장을 반복하면 같은 사진이 사진 보관함에 중복될 수 있다.
- 서버 URL이 이미 만료됐거나 네트워크가 끊기면 다운로드가 실패한다.
- 사진 보관함 추가 권한을 거부하면 저장할 수 없다.

## Result

- 공용 갤러리에 세 개의 generic render slot을 추가했다.
- RTC 임시 사진에 만료 임박 badge와 `createdAt` 촬영 시각을 연결했다.
- 현재 사진 다운로드와 권한/실패/만료 안내를 연결했다.
- RTC 공유 결과의 기존 중복 다운로드 구현을 공용 adapter로 교체했다.
- RTC 사진, 공용 갤러리, 프로필 흐름 단위 테스트와 TypeScript 검사를
  통과했다.
- iOS와 Android Expo export를 모두 통과했다.
- 실제 기기에서 권한 허용/거부와 사진 앱 저장 결과는 별도 확인이
  필요하다.
