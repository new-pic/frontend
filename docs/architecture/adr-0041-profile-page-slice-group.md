# ADR-0041: Profile Page를 Slice group으로 분리

## Decision

`pages/profile`을 하나의 Page slice로 유지하지 않고, Profile 주제로 묶인
Page slice들의 Slice group으로 사용한다.

```text
pages/profile/
├── overview/
├── edit/
├── blocked-users/
├── rtc-photos/
└── feeds/
```

- `profile` group 루트에는 `index.ts`, segment 또는 공유 코드를 두지 않는다.
- 각 하위 Page slice는 독립된 public API를 제공한다.
- Expo Router route와 URL은 유지하고 App route가 필요한 Page public API를
  직접 import한다.
- 차단 목록 전용 query와 query key는 `blocked-users` Page slice가 소유한다.
- 내가 작성한 피드, 좋아요한 피드, 저장한 피드는 화면 구조와 상세 탐색
  lifecycle이 유사하므로 `feeds` Page slice가 함께 소유한다.
- 같은 Page layer의 형제 slice는 서로 import하지 않는다.

## Context

기존 `pages/profile`은 프로필 메인, 편집, 차단 사용자, RTC 저장 사진과 세
종류의 피드 목록을 하나의 public API에서 노출했다. 같은 Profile route 아래에
있지만 각 화면의 변경 이유, 서버 상태와 실패 lifecycle은 서로 달랐다.

특히 차단 목록은 전용 infinite query와 query key를 소유하고 있었지만 그
책임이 Profile 전체의 `api/model`로 표현되었다. 새 Profile 화면이 추가될수록
하나의 slice와 barrel이 계속 커질 구조였다.

## Alternatives

### Option A: 하나의 Profile slice 안에서 UI 폴더만 분류

이동 범위와 import 변경은 작지만 public API, API 소유권과 lifecycle 경계는
계속 하나로 남는다. 파일 탐색은 나아져도 Page 책임은 분리되지 않는다.

### Option B: Profile Slice group과 독립 Page slice 구성

각 Route 화면이 독립 public API와 필요한 segment를 소유한다. 유사한 Feed
화면은 하나의 `feeds` slice로 유지해 공통 구조의 중복과 형제 slice 간 공유
문제를 피한다.

### Option C: 세 Feed 화면까지 Route별 slice로 분리

변경 경계는 가장 작아지지만 현재 동일한 Grid, pagination과 상세 이동 구조를
각 slice가 반복하게 된다. 공통 코드를 공유하려면 낮은 layer로 추가 추출해야
하므로 현재 요구보다 세분화가 과하다.

## Reason

Option B를 선택했다. Profile이라는 탐색 주제는 유지하면서 실제 Page의 상태,
실패와 변경 책임을 분리할 수 있기 때문이다. Feed 화면은 현재의 응집도가
분리 비용보다 높으므로 하나의 Page slice로 유지한다.

의존 방향은 다음과 같다.

```text
Expo Router route
  ↓
pages/profile/<page-slice> public API
  ↓
Widgets / Features
  ↓
Entities / Shared
```

## Trade-off

얻은 것:

- App route와 Page 구현 사이의 명시적인 일대일 책임
- 차단 목록 query, loading/error와 pagination lifecycle의 지역화
- Profile 관련 Page가 증가할 때 기존 slice의 변경 범위를 넓히지 않는 구조
- 하나의 Profile barrel을 통한 불필요한 Page 노출 제거

제한:

- Page마다 public API 파일이 추가된다.
- 형제 Page slice는 코드를 직접 공유할 수 없다.
- Feed 화면의 lifecycle이 서로 달라지면 `feeds`를 다시 분리하고 공통 책임의
  하위 layer 배치를 재검토해야 한다.
- 소스 경로를 직접 읽는 기존 구조 테스트는 Page 이동 시 함께 갱신해야 한다.

## Result

- `overview`, `edit`, `blocked-users`, `rtc-photos`, `feeds` Page slice를
  구성했다.
- Profile group 루트의 public API와 segment를 제거했다.
- 기존 Expo Router 파일, URL, MemberGuard와 navigation 동작은 유지했다.
- App route는 각 하위 Page slice public API를 직접 사용한다.
- 차단 목록 전용 `api/model`은 `blocked-users`로 이동했다.
- Profile 흐름 및 사용자 차단 테스트의 소스 경로를 새 책임 경계에 맞췄다.
- 독립 lifecycle을 소유하는 기존 Feature와 Widget은 Steiger의 단일 소비
  병합 후보에서 제외했다.
