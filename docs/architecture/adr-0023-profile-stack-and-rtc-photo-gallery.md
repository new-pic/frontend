# ADR-0023: Profile Stack과 RTC 촬영 사진 갤러리

## Decision

`profile` 탭이 프로필 하위 route를 직접 sibling tab으로 등록하지 않고,
`profile/_layout.tsx`의 Stack을 소유하도록 구성한다. 프로필 루트에서만
tab bar를 표시하고 수정, 피드 목록, 최근 촬영 사진 같은 하위 화면에서는
숨긴다.

최근 RTC 촬영 사진 페이지는 서버 사진 query와 만료 필터를 그대로
사용한다. 목록 item을 누르면 page가 선택 index만 소유하고 shared
`PhotoGalleryModal`을 열어 해당 사진부터 좌우로 탐색한다.

## Context

기존 `(tabs)/_layout.tsx`는 `profile`, `profile/edit`,
`profile/rtc-photos`, 프로필 피드 목록을 모두 별도 `Tabs.Screen`으로
등록했다. 따라서 프로필에서 최근 촬영 사진으로 `router.push`해도 Stack에
상세 화면이 쌓이지 않았다. 최근 사진 화면의 `router.back()`은 프로필로
pop하지 못하고 Tabs history 또는 초기 화면인 피드로 이동했다.

최근 촬영 사진 목록도 shared `PhotoGrid`를 렌더링했지만 item press가
연결되지 않아 큰 이미지와 전후 사진을 확인할 수 없었다. 카메라 촬영
목록과 RTC 종료 결과에는 이미 `PhotoGalleryModal` 기반의 동일한 탐색
경험이 존재했다.

## Alternatives

### Option A: Profile 내부 Stack과 shared gallery 재사용

프로필 route 폴더에 Stack layout을 추가하고 Tabs는 `profile` entry만
소유한다. 최근 사진 page는 `PhotoGrid`의 index를 `PhotoGalleryModal`에
전달한다.

### Option B: 기존 sibling tab과 `returnTo` 파라미터 유지

각 하위 화면 진입 시 origin 경로를 전달하고 뒤로 갈 때 `replace`한다.
수정 범위는 작지만 실제 navigation history가 아니며 모든 진입점이
`returnTo` 계약을 지켜야 한다.

### Option C: 최근 사진 전용 상세 route 추가

사진 ID로 독립 route를 만들면 deep link에는 유리하지만 만료되는 임시
사진의 query 복원과 목록 위치 동기화가 추가로 필요하다.

## Reason

Option A를 선택했다. 프로필 하위 화면은 하나의 탭이 소유하는 navigation
계층이라는 실제 화면 관계와 일치하고, origin 파라미터 없이 native Stack
history로 복귀할 수 있기 때문이다. 사진 상세는 독립 URL 요구가 없으므로
이미 검증된 shared modal을 재사용하는 것이 가장 단순하다.

```text
Tabs
  ↓
Profile Stack
  ├─ Profile index
  ├─ Edit
  ├─ Feed lists
  └─ RTC photos
       ↓ item press
     selectedIndex (page local state)
       ↓
     PhotoGalleryModal
```

서버 목록과 cursor는 React Query가, 만료 필터 lifecycle은
`browse-stored-photos` feature가, 현재 갤러리 index는 page가 소유한다.
shared gallery는 RTC entity나 query를 알지 않고 `id`와 `imageUrl`만 받는다.

## Trade-off

얻은 것:

- 프로필 하위 화면에서 이전 프로필 화면으로 돌아가는 실제 Stack history
- 프로필 하위 route가 늘어나도 Tabs layout이 비대해지지 않는 구조
- 카메라, 종료 결과, 프로필 최근 사진에서 동일한 슬라이드 갤러리 경험
- gallery를 닫아도 목록 query와 scroll lifecycle을 유지하는 modal 경계

포기하거나 제한된 것:

- 프로필 하위 화면에서 tab bar를 숨기기 위해 현재 pathname에 따른 parent
  tab style 갱신이 필요하다.
- 최근 사진 상세는 독립 deep link를 제공하지 않는다.
- 만료 시점과 갤러리 탐색이 겹치는 동작은 실제 기기 장시간 테스트가
  필요하다.

## Result

- `profile/_layout.tsx`에 header 없는 Stack을 추가하고 profile 하위
  `Tabs.Screen` 등록을 제거했다.
- 프로필 루트에서만 tab bar를 표시하도록 route style을 분리했다.
- 최근 촬영 사진 grid item을 누르면 선택한 index로 공용 gallery가 열린다.
- Profile route 및 gallery 계약 테스트와 iOS/Android Expo SDK 56 export를
  통과했다.
