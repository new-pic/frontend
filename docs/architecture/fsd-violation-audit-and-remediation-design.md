# FSD 위반 감사 및 개선 설계

상태: Implemented

작성일: 2026-08-25

기준 명령: `pnpm fsd:check`

## 목적

Steiger가 보고한 FSD 진단을 숫자만 제거하지 않고, 실제 책임과
의존 방향을 기준으로 분류한다. 이 문서는 구현 결정을 확정하는 ADR이
아니라 현재 구조 감사와 대안 비교 문서다. 선택이 끝난 항목은 후속 ADR에
결정과 결과를 기록한다.

설계 승인 후 구현했으며, 실제 결과는 문서 하단의 구현 결과에 기록한다.

## 기준선

현재 제품 코드 기준으로 오류 없이 49개의 경고가 보고된다.

| 규칙 | 개수 | 성격 |
| --- | ---: | --- |
| `fsd/forbidden-imports` | 17 | 같은 레이어 slice 간 의존 |
| `fsd/no-public-api-sidestep` | 9 | 외부에서 slice 내부 경로 직접 참조 |
| `fsd/insignificant-slice` | 20 | 소비자가 없거나 하나인 slice 휴리스틱 |
| `fsd/inconsistent-naming` | 1 | Entity slice 단·복수형 불일치 |
| `fsd/segments-by-purpose` | 2 | 목적이 아닌 코드 형태 기반 Shared segment |

`__tests__`의 내부 모듈 직접 import는 현재 Steiger 정책에서 제외되어 있다.
초기 recommended 실행에서 확인된 테스트 관련 진단 19건은 제품 의존
그래프와 분리해 정책 예외로 관리한다.

## 사용자 판단 검토 및 절충안

2026-08-25 설계 검토에서 다음 방향에 합의했다. 아래 내용은 사용자의
판단을 현재 코드의 책임과 lifecycle에 대조해 보완한 결과다.

### Feed collection query는 Feed Entity가 소유

`/users/me/*`라는 endpoint prefix보다 반환 domain, query cache와 소비 목적을
소유권 기준으로 삼는다. 내 피드, 좋아요한 피드와 저장한 피드 query option은
Feed Entity로 이동하고 User Entity에는 프로필 조회/수정 책임을 남긴다.

절충 조건:

- 기존 query key 값과 infinite cache shape를 유지한다.
- Profile, Guide와 Browse Feature가 동일한 Feed public API를 사용한다.
- endpoint URL은 adapter 세부사항으로 유지하며 폴더 소유권 근거로 사용하지
  않는다.

### Pose detection/matching은 Guide Feature 내부로 통합

Shared는 앱 domain에 독립적인 기반과 외부 경계를 위한 레이어다. 현재 Pose
모듈에는 DWPose/MediaPipe 계약, Guide target 준비와 feedback에 직접 연결된
domain 로직이 포함되어 있으므로 전체를 Shared로 내리지 않는다.

절충 조건:

- `guide-feed/lib/pose-detection`, `guide-feed/lib/pose-matching`처럼 내부에서도
  목적별 library 경계를 유지한다.
- native callback adapter와 순수 matching algorithm을 같은 파일에 섞지
  않는다.
- Guide public API에서는 Pose 내부 구현을 wildcard로 재노출하지 않는다.
- 실제 두 번째 소비자가 생기면 그때 안정된 순수 core만 별도 추출한다.

`pose-detection`과 `pose-matching`은 합계 약 3천 줄이므로 단순 파일 병합은
피한다. slice 소유권은 Guide로 통합하되 내부 library의 교체 가능성과 테스트
경계는 보존한다.

### Feed Processing은 Save Feed use-case 내부로 통합

사용자 판단처럼 AI processing은 Feed 생성 성공 뒤에만 시작한다. 다만 현재
`FeedPublishingCoordinator`는 `CREATE`뿐 아니라 `UPDATE` command도 queue로
처리한다. 따라서 현재 코드를 “생성 전용 Feature”라고만 설명하면 실제
lifecycle을 누락한다.

최종 의미는 다음과 같이 정의한다.

```text
Save Feed Feature
  ├─ Create/Update form
  ├─ Create/Update publishing queue
  └─ Create 성공 시에만 AI processing lifecycle
```

별도 `feed-processing` Feature는 제거하고 Save Feed Feature 내부의 목적별
model/library로 통합한다. App root coordinator와 Feed badge는 Save Feed
public API로 계속 노출한다.

절충 조건:

- Form 상태, publishing task와 AI job store는 서로 다른 model로 유지한다.
- Update는 AI processing store를 시작하지 않는 현재 동작을 보존한다.
- AppState, SSE, polling, retry와 staged file 정리 lifecycle을 변경하지 않는다.
- slice 이름은 생성과 수정을 함께 포괄하는 `save-feed`를 우선 사용한다.

### Member Access는 Guard Member Feature가 소유

guest 판정 자체는 인증 상태지만 확인 UI, account-link intent와 navigation을
포함한 현재 hook은 회원 전환 use-case다. 따라서 기존
`features/user/guard-member`가 action-level guard도 함께 소유한다.

그러나 Like/Pick/Comment Feature가 Guard Member Feature를 직접 import하면
새로운 Feature 간 의존 위반이 생긴다. 다음처럼 상위 Widget/Page가 조합한다.

```text
Feed Detail Widget
  ├─ useRequireMember() from guard-member
  ├─ Like Feature
  ├─ Pick Feature
  └─ Comment Feature
       ↑ access callback 주입
```

절충 조건:

- `guard-member`는 route-level `MemberGuard`와 action-level
  `useRequireMember`를 함께 제공한다.
- Feed action Feature는 인증 store나 Guard Feature를 알지 않는다.
- Widget이 guard callback을 action handler/component에 주입한다.
- provider에 종속된 `prepareGoogleLink` 이름은 실제 Apple/Google 공통
  account-link intent에 맞는 이름으로 후속 정리하되 동작은 바꾸지 않는다.

### Insignificant Slice는 전역 경고와 명시적 예외를 함께 사용

이 규칙은 참조가 없으면 삭제를, 참조가 하나면 상위 레이어 병합을 제안한다.
이는 잘게 나뉜 slice 때문에 응집도가 낮아지는 것을 찾는 휴리스틱이지,
단일 소비 slice가 항상 잘못됐다는 의미는 아니다.

예를 들어 다음 slice는 소비자가 하나여도 별도 lifecycle과 실패 경계를
소유한다.

- `rtc/reactions`: Socket transport 및 reaction UI lifecycle
- `rtc/host-controls`: room stream과 finalization lifecycle
- `user/save-social-login`: provider 인증과 session 후처리
- `widgets/feed/detail`: 1,200줄 이상의 독립 UI block

반대로 `feed/edit-feed`처럼 navigation wrapper만 있는 작은 slice는 상위
Widget 병합 후보가 맞다.

따라서 다음 절충안을 사용한다.

1. `fsd/insignificant-slice`는 전역 `warn`으로 유지해 새로운 과도한 slice를
   발견한다.
2. 실제 병합 후보는 이동해 경고를 제거한다.
3. 검토 후 유지하기로 한 복잡한 slice는 경로별 `off` override와 근거 문서
   링크를 남긴다.
4. 휴리스틱 경고 때문에 전체 구조 검사가 실패하지 않도록 이 규칙만으로
   `--fail-on-warnings`를 활성화하지 않는다.

이 방식은 20개 경고를 영구적으로 방치하지 않으면서 새 slice의 과도한
분리를 계속 감지한다.

## 판정 원칙

### 레이어 방향

```text
App
  ↓
Pages
  ↓
Widgets
  ↓
Features
  ↓
Entities
  ↓
Shared
```

slice는 자신보다 낮은 레이어의 slice만 참조한다. 같은 slice 내부는 상대
경로를 사용하고, 다른 slice는 상대 slice의 public API를 사용한다.

### Public API와 레이어 위반은 별개다

아래 변경은 public API 우회만 해결한다.

```text
@features/camera/capture-photo/lib/...
  ↓
@features/camera/capture-photo
```

하지만 Feature가 다른 Feature에 의존한다는 사실은 그대로이므로
`forbidden-imports`는 남는다. 따라서 경로만 바꾸기 전에 책임 계층을 먼저
결정해야 한다.

### 진단 0개가 항상 목표는 아니다

`insignificant-slice`는 소비자 수만 측정한다. 하나의 Page에서만 사용해도
독립적인 상태, lifecycle, 실패 경계와 테스트를 소유한다면 Feature 또는
Widget으로 유지할 가치가 있다. 이 규칙은 구조 검토 신호로 사용하고,
기계적인 병합 기준으로 사용하지 않는다.

## 1. `fsd/forbidden-imports`

### 파일 목록

| 소비자 | 참조 대상 | 개수 |
| --- | --- | ---: |
| `entities/user/api/user-query.ts` | `entities/feed` | 1 |
| `features/camera/guide-feed/lib/guide-contour-projection.ts` | `camera/pose-matching` | 1 |
| `features/camera/guide-feed/model/guide-state.ts` | `camera/capture-photo`, `camera/pose-matching` | 2 |
| `features/camera/guide-feed/model/pose-guide-alignment-policy.ts` | `camera/pose-matching` | 1 |
| `features/camera/guide-feed/model/types.ts` | `camera/capture-photo`, `camera/pose-matching` | 2 |
| `features/camera/guide-feed/model/use-camera-guide-controller.ts` | `camera/capture-photo`, `camera/pose-detection`, `camera/pose-matching` | 3 |
| `features/camera/guide-feed/model/use-pose-guide-alignment.ts` | `camera/pose-matching` | 1 |
| `features/camera/guide-feed/ui/camera-guide-overlay.tsx` | `camera/pose-matching` | 1 |
| `features/camera/guide-feed/ui/camera-guide-reference-overlay.tsx` | `camera/pose-matching` | 1 |
| `features/camera/pose-matching/model/feed-pose-target-preparer.ts` | `camera/capture-photo` | 1 |
| `features/feed/save-feed/model/use-save-feed-form.ts` | `feed/feed-processing` | 1 |
| `features/feed/save-feed/ui/save-feed-button.tsx` | `feed/feed-processing` | 1 |
| `features/rtc/finalize-session/lib/prepare-rtc-end-images.ts` | `camera/capture-photo` | 1 |

### 1.1 User Entity가 Feed Entity를 참조

현재 의존:

```text
entities/user/api/user-query.ts
  ↓ FeedListResponse
entities/feed
```

`/users/me/feeds`, `/users/me/liked-feeds`, `/users/me/references`는 URL이
User 범위에 있지만 반환 값과 캐시의 중심은 Feed 목록이다. 현재 User
Entity가 Feed 목록 응답 계약을 소유해 두 Entity가 함께 변경된다.

상태 소유자는 React Query의 QueryClient이며, 네트워크 lifecycle은 각
query option이 소유한다. 위치를 바꾸더라도 query key와 cache identity는
보존해야 한다.

#### 대안 A: Feed Entity로 사용자별 Feed collection query 이동

```text
Profile / Guide / Browse Feature
  ↓
entities/feed collection query
  ↓
shared/api
```

장점:

- 반환 domain과 cache가 Feed Entity에 모인다.
- User Entity는 프로필과 사용자 mutation에 집중한다.
- 기존 소비자는 Feed public API만 사용한다.

단점:

- 기존 `usersQuery` public API와 query key import를 변경해야 한다.
- URL 기준 소유권에 익숙한 개발자에게 처음에는 덜 직관적일 수 있다.

#### 대안 B: Entity `@x` cross-reference API 사용

`entities/feed/@x/user.ts`에서 User Entity에 필요한 타입만 노출한다.

장점:

- 변경량이 작고 Entity 관계를 명시적으로 표시한다.
- FSD가 허용하는 Entity 관계 예외를 사용한다.

단점:

- query 책임은 여전히 User Entity에 남는다.
- 캐시와 응답의 중심 domain이 Feed라는 문제는 해결하지 않는다.

#### 대안 C: 상위 Feature/Page로 사용자 Feed query 이동

장점:

- Entity 간 직접 의존을 완전히 제거한다.
- 화면별 조합 책임이 명확하다.

단점:

- 프로필 목록, 가이드 선택, 상세 탐색에서 같은 query option을 공유하기
  어렵다.
- query key와 cache adapter가 여러 상위 slice로 분산될 수 있다.

선택: **대안 A**. API URL이 아니라 반환 domain과 cache identity를 기준으로
Feed Entity가 collection query를 소유한다.

### 1.2 Camera Feature 간 교차 의존

현재 Steiger는 다음을 독립된 Feature slice로 해석한다.

```text
features/camera/capture-photo
features/camera/guide-feed
features/camera/pose-detection
features/camera/pose-matching
```

`camera` 그룹에 함께 있어도 slice 격리는 완화되지 않는다. 현재 실제
데이터 흐름은 다음과 같다.

```text
Capture geometry ─┐
Pose detection ───┼→ Guide controller → Guide UI
Pose matching ────┘
```

`guide-feed`가 Pose 검출 lifecycle과 matching 알고리즘을 직접 조율하므로
Pose 모듈은 독립적인 사용자 Feature라기보다 Guide use-case의 내부 엔진에
가깝다. `pose-detection` 378줄과 `pose-matching` 2,581줄은 실제로 사용 중이지만
public 소비자가 없어 Steiger는 insignificant slice로도 보고한다.

외부 라이브러리 경계는 다음과 같다.

- VisionCamera/native pose callback: Pose detection adapter
- DWPose 및 MediaPipe 응답: Pose adapter
- 좌표, canvas projection과 assignment: 순수 domain library
- 활성 guide, smoothing, feedback: Guide Feature model

#### 대안 A: Pose 모듈을 Guide Feature 내부의 목적별 library로 통합

```text
features/camera/guide-feed
  ├─ lib/pose-detection
  ├─ lib/pose-matching
  ├─ lib/camera-coordinate
  └─ model/use-camera-guide-controller
```

Capture Feature와의 경계는 다음처럼 역전한다.

- Guide가 필요한 최소 geometry interface를 자체적으로 정의한다.
- Camera Page가 Capture geometry를 Guide 입력으로 전달한다.
- Feed 이미지 기준 aspect ratio 결정은 Guide 정책으로 이동한다.
- `capture-photo`의 `CameraRuntimeGeometry` 타입을 Guide가 직접 import하지
  않는다.

장점:

- 현재 실제 단일 소비 관계와 디렉터리 책임이 일치한다.
- Camera 교차 import와 Pose insignificant 진단을 함께 해소한다.
- native adapter 실패가 Guide 기능에만 영향을 주는 현재 실패 경계를
  그대로 보존한다.

단점:

- Guide slice가 커진다.
- 향후 다른 Feature가 Pose 엔진을 사용하면 다시 추출해야 한다.

#### 대안 B: 재사용 가능한 Pose/Camera core를 낮은 레이어로 추출

```text
shared/lib/pose
shared/lib/camera-coordinate
          ↑
guide-feed   capture-photo
```

Feed 응답 adapter와 Guide feedback 정책은 Guide Feature에 남기고, 순수 좌표,
assignment와 native module adapter만 아래로 내린다.

장점:

- Capture, Guide와 향후 다른 소비자가 같은 core를 사용할 수 있다.
- 순수 알고리즘의 독립 테스트와 외부 adapter 교체가 쉽다.

단점:

- 현재 두 번째 소비자가 없어 추상화가 앞설 수 있다.
- Feed/DWPose/Guide 개념이 Shared로 새면 Shared가 domain dump가 된다.
- 순수 core와 use-case adapter를 나누는 판단 비용이 크다.

#### 대안 C: Camera Page가 모든 Pose 조합을 소유

장점:

- Feature 간 직접 import를 제거한다.
- Page가 여러 Feature를 조합한다는 FSD 방향에 가장 직접적이다.

단점:

- 이미 큰 Camera Page가 native callback, target 준비, matching과 feedback
  lifecycle까지 소유하게 된다.
- Guide 기능의 응집도와 테스트 가능성이 낮아진다.

선택: **대안 A**. 현재 Pose 모듈은 Guide만 소비하므로 Guide의 내부 목적별
library로 통합한다. 이후 실제 두 번째 소비자가 생길 때 안정된 순수 core만
대안 B 형태로 추출한다.

### 1.3 Save Feed가 Feed Processing을 참조

현재 의존:

```text
save-feed form/button
  ↓ command, store, pipeline state
feed-processing
```

Form 상태는 `save-feed`가 소유하지만 background queue와 processing lifecycle은
`feed-processing`이 소유한다. `SaveFeedButton`이 두 책임을 직접 조합하면서
Feature 간 의존이 생겼다.

#### 대안 A: 두 slice를 하나의 Publish Feed Feature로 통합

장점:

- 게시 요청부터 background processing 완료까지 하나의 use-case로 볼 수
  있다.
- command type과 store가 같은 slice 안에 위치한다.

단점:

- 수정 form, App root coordinator, Feed badge와 AI job lifecycle이 하나의
  큰 slice에 모인다.
- UI form 실패와 background processing 실패의 경계가 흐려진다.

#### 대안 B: Page/Widget이 두 Feature를 조합

```text
Feed Edit Page/Widget
  ├─ save-feed form submission
  └─ feed-processing enqueue port
```

`save-feed`는 자체 `CreateFeedSubmission`처럼 중립적인 제출 결과를 노출하고,
상위 조합 계층이 이를 publishing command로 전달한다. Queue 상태와 App
coordinator lifecycle은 `feed-processing`에 그대로 둔다.

장점:

- Form과 background queue의 상태 소유권이 분명하다.
- 기존 coordinator, retry와 badge lifecycle을 변경하지 않는다.
- 각 Feature를 독립적으로 교체하거나 테스트할 수 있다.

단점:

- Page 또는 Widget에 adapter 코드가 추가된다.
- 현재 `SaveFeedButton`의 pending/navigation 처리를 상위로 이동해야 한다.

#### 대안 C: publishing store와 command를 Feed Entity로 이동

장점:

- 두 Feature가 낮은 레이어의 공통 contract를 사용할 수 있다.

단점:

- background 게시 workflow는 Feed 데이터 자체가 아니라 사용자 use-case다.
- Entity가 UI navigation, retry와 lifecycle 책임을 흡수할 위험이 있다.

선택 변경: 사용자 검토에 따라 별도 Feature 조합 대신 `feed-processing`을
`save-feed` 내부로 통합한다. 다만 Form, publishing queue와 AI processing
store는 목적별 model로 분리하고 생성/수정 lifecycle 차이를 보존한다.

### 1.4 RTC Finalize가 Capture Photo 타입을 참조

현재 `prepareRtcEndImages`는 `SessionPhoto[]`를 받지만 실제로 사용하는 값은
`uri`뿐이다.

#### 대안 A: 소비자가 필요한 최소 입력 port를 정의

```ts
interface RtcEndPhotoInput {
  uri: string;
}
```

Capture의 `SessionPhoto`는 구조적으로 이 interface를 만족하고 Camera Page가
그대로 전달할 수 있다.

장점:

- Feature 간 type-only 의존도 제거한다.
- 불필요한 `id`와 Capture 상태 계약에 결합되지 않는다.
- runtime 동작과 File 변환 lifecycle이 그대로 유지된다.

단점:

- 비슷한 사진 입력 타입이 여러 곳에 존재할 수 있다.

#### 대안 B: Session Photo를 RTC Entity 또는 공통 Media model로 이동

장점:

- 여러 기능에서 같은 photo identity를 공유할 수 있다.

단점:

- 현재 Capture와 Camera Page 외에는 `id`를 포함한 전체 계약이 필요하지
  않다.
- 작은 타입 때문에 domain 소유권이 불필요하게 확대된다.

잠정 추천: **대안 A**. Feature가 필요한 최소 port를 소유한다.

## 2. `fsd/no-public-api-sidestep`

### 기존 public API로 전환 가능한 항목

| 파일 | 현재 경로 | 목표 public API |
| --- | --- | --- |
| `app/_layout.tsx` | `@features/camera/guide-feed/model/camera-guide-navigation` | `@features/camera/guide-feed` |
| `entities/rtc/api/rtc-room-event.ts` | `../../../shared/api/sse-parser` | `@shared/api` |
| `feed-processing/lib/refresh-published-feed-lists.ts` | `@entities/feed/api/feed-query` | `@entities/feed`의 `feedQuery` |
| 동일 파일 | `@entities/user/api/user-query` | `@entities/user`의 `usersQuery` |
| `update-feed-pick/lib/refresh-saved-feed-guide-cache.ts` | `@entities/user/api/user-query` | `@entities/user`의 `usersQuery` |
| `pages/profile/ui/profile-page.tsx` | `@shared/model/auth-store` | `@shared/model` |

이 6건은 이미 필요한 export가 존재한다. import 계약만 바꾸면 되고 상태,
네트워크 및 UI lifecycle은 바뀌지 않는다.

### App interceptor import

`app/_layout.tsx`는 다음 파일을 side-effect import한다.

```ts
import "@shared/api/interceptors";
```

하지만 해당 모듈은 `setupInterceptors`를 선언만 한다. 실제 등록은
`api-private-instance.ts`에서 `privateApiClient` 생성 시 수행한다.

검토안:

1. 불필요한 import임을 bundle과 인증 요청으로 확인한 뒤 제거한다.
2. App이 lifecycle을 소유해야 한다면 public API의 명시적인
   `initializeApiClient()`를 호출한다.

잠정 추천: 현재 등록 소유자가 `privateApiClient`이므로 **중복 의도가 없는
import를 제거**한다. App bootstrap으로 옮길 경우 중복 interceptor 등록을
방지하는 idempotent lifecycle 설계가 먼저 필요하다.

### Camera 내부 경로 2건

- `guide-feed/model/guide-state.ts`
- `pose-matching/model/feed-pose-target-preparer.ts`

두 파일의 `capture-photo/lib/feed-camera-aspect-ratio` 참조는 public API
우회이면서 Feature 교차 import다. 경로만 public API로 바꾸지 않고 Camera
경계 결정과 함께 처리한다.

## 3. `fsd/inconsistent-naming`

현재 Entity slice 이름은 다음과 같다.

```text
feed
rtc
rtc-stored-photo
tags
user
```

`tags`만 복수형이다.

### 대안

1. `entities/tags`를 `entities/tag`로 변경한다.
2. 모든 Entity를 복수형으로 변경한다.
3. 규칙을 계속 경고 또는 off로 둔다.

잠정 추천: **1안**. 현재 `TagBadge`와 public API 소비자가 하나뿐이라 변경
범위가 작고, 나머지 Entity의 단수형 명명과 일치한다. 파일 이동 후 import와
테스트를 함께 갱신하고 이 규칙을 `error`로 복구한다.

## 4. `fsd/segments-by-purpose`

### `shared/constants`

현재 서로 다른 목적이 한 segment에 섞여 있다.

| 파일 | 실제 목적 | 후보 위치 |
| --- | --- | --- |
| `colors.ts` | UI theme token | `shared/ui/theme` |
| `gradient.ts` | UI theme token | `shared/ui/theme` |
| `ui-metrics.ts` | UI layout/touch token | `shared/ui/theme` |
| `external-links.ts` | App 외부 URL 설정 | `shared/config` |

`constants`는 값의 코드 형태를 설명할 뿐 책임을 설명하지 못한다. UI token과
App config로 나누는 안을 추천한다. 디자인 token의 단일 소유자는
`shared/ui/theme`이며, 화면과 Shared UI는 해당 public API를 사용한다.

### `shared/hooks`

현재 유일한 파일인 `use-member-access.ts`는 범용 hook이 아니다. 다음 책임을
동시에 가진다.

- guest 상태 조회
- 확인 UI 호출
- Google account-link intent 설정
- Welcome route 이동

이는 회원 전용 행동을 유도하는 앱 use-case다. 단순히
`shared/lib/member-access`로 이름만 바꾸면 Steiger 경고는 줄어도 Shared의
domain 오염은 그대로다.

#### 대안 A: `features/user/guard-member`로 이동하고 상위 계층에서 조합

```text
Feed Detail Widget/Page
  ├─ guard-member Feature
  └─ like/pick/comment Feature
```

Feed action Feature는 `ensureMember` callback 또는 실행 허용 상태를 입력으로
받고, 다른 Feature를 직접 import하지 않는다.

장점:

- member prompt/navigation use-case가 기존 `MemberGuard`와 한 slice에 모인다.
- Shared에서 비즈니스와 navigation 책임을 제거한다.
- Feature 간 의존은 Widget/Page 조합으로 바뀐다.

단점:

- Feed Detail의 like, pick, comment 입력 계약을 변경해야 한다.
- 여러 단계로 callback을 전달해야 할 수 있다.

#### 대안 B: 회원 판정만 User/Auth Entity로 내리고 각 Feature가 UI를 소유

장점:

- Feature가 필요한 UX를 독립적으로 결정할 수 있다.

단점:

- 확인 문구, linking intent와 navigation이 중복된다.
- 계정 연결 정책이 여러 Feature에 퍼진다.

#### 대안 C: Shared에 유지하고 목적 이름으로만 변경

장점:

- 변경량이 가장 작다.

단점:

- Shared가 사용자 계정 연결 workflow를 소유하는 계층 문제를 해결하지
  못한다.

선택: **대안 A**. 단, Feed action Feature가 Guard Feature를 직접 import하지
않도록 Feed Detail Widget이 access callback을 주입한다. `authStore` 위치
변경은 이번 범위에 포함하지 않고 기존 ADR-0034의 보류 결정을 유지한다.

## 5. `fsd/insignificant-slice`

이 규칙은 구조 검토용 경고로 유지한다. 아래 판정은 삭제 지시가 아니라
후속 검토 우선순위다.

| Slice | 규모 | 현재 판정 | 잠정 방향 |
| --- | ---: | --- | --- |
| `entities/tags` | 2 files / 21 lines | 작은 domain 표현 | `tag`로 이름 변경 후 유지 또는 Tag UI 소비 증가 시 재평가 |
| `camera/pose-detection` | 8 / 378 | 실제 사용 중인 Guide 내부 엔진 | Camera 경계 설계에 따라 Guide 내부로 통합 |
| `camera/pose-matching` | 15 / 2,581 | 실제 사용 중인 Guide 내부 엔진 | Camera 경계 설계에 따라 Guide 내부로 통합 |
| `feed/create-feed-comment` | 4 / 124 | 명확한 사용자 행동 | 유지 후보 |
| `feed/delete-feed` | 2 / 32 | mutation, 확인, navigation 소유 | 유지 후보 |
| `feed/edit-feed` | 2 / 12 | navigation wrapper만 존재 | Feed Detail Widget으로 병합 후보 |
| `feed/report-content` | 5 / 448 | form, mutation lock, modal 소유 | 유지 후보 |
| `feed/update-feed-like` | 6 / 326 | throttle, cache, gesture 소유 | 유지 후보 |
| `feed/update-feed-pick` | 6 / 213 | cache sync와 member gate 소비 | 유지하되 member/public API 경계 수정 |
| `profile/save-user-setup` | 8 / 360 | form, validation, image adapter 소유 | 유지 후보 |
| `rtc-photo/save-stored-photo` | 2 / 63 | 다운로드/저장 사용자 행동 | 유지 후보 |
| `rtc/finalize-session` | 4 / 48 | Camera Page 전용 준비/초기화 | `pages/camera` 내부 병합도 검토 |
| `rtc/host-controls` | 6 / 770 | RTC stream/finalization lifecycle 소유 | 유지 |
| `rtc/reactions` | 12 / 1,422 | Socket transport와 UI lifecycle 소유 | 유지 |
| `user/save-social-login` | 3 / 518 | Provider 인증과 session 후처리 소유 | 유지 |
| `widgets/camera-header` | 2 / 72 | Camera Page 전용 UI | Page UI로 병합 후보 |
| `widgets/feed/detail` | 16 / 1,203 | 큰 독립 UI block | 단일 Page 소비여도 유지 |
| `widgets/feed/edit` | 9 / 458 | 큰 편집 UI block | 단일 Page 소비여도 유지 |
| `widgets/profile/rtc-photo-preview` | 3 / 131 | Profile Page 전용 block | Page UI 병합 후보 |
| `widgets/rtc-join-sheet` | 2 / 48 | Camera Page 전용이며 join use-case UI | `features/rtc/join-room` UI로 이동 후보 |

`host-controls`, `reactions`, `save-social-login`, 큰 Feed Widget처럼 lifecycle과
실패 경계를 소유하는 slice는 소비자 수가 하나여도 유지한다. 따라서
`insignificant-slice`를 전체 `error`로 올리거나 모든 경고를 0으로 만드는
것은 목표로 삼지 않는다.

## 테스트 import 정책

다음 테스트 영역은 내부 pure function, schema와 adapter를 직접 검증하기
위해 `forbidden-imports`와 `no-public-api-sidestep`를 제외하고 있다.

- Feed processing 및 publishing
- Content reporting
- Profile edit
- RTC stored photo
- RTC host controls 및 join
- Social login terms
- Profile flow
- Guest account linking

테스트가 제품 public API만 검증하도록 강제하면 내부 단위 테스트가 통합
테스트로 변하고 barrel import로 인한 native module 평가 가능성이 생긴다.
현재 예외는 유지하되, 테스트에서 상위 레이어의 runtime UI까지 가져오는
새 의존은 코드 리뷰에서 별도로 제한한다.

## 실패 영향과 lifecycle 보존 조건

### 변경 시 보존할 상태 소유자

- Query cache: React Query QueryClient
- Feed form: `save-feed` form model
- Feed background queue 및 retry: 통합 후 `save-feed`의 publishing model
- Camera capture/zoom/photo state: `capture-photo`
- Guide 선택, target, alignment feedback: `guide-feed`
- Pose native callback 등록/해제: 현재 Pose detection adapter
- RTC finalization: Camera Page와 RTC host lifecycle
- 인증 session: 기존 `authStore` 유지

### 교체하기 어려운 외부 경계

- VisionCamera frame/native callback
- `@newpic/vision-camera-pose`
- DWPose와 MediaPipe DTO adapter
- React Query key와 infinite cache shape
- Expo Router의 auth return/navigation
- App root의 Feed publishing coordinator

파일 이동은 위 경계를 직접 바꾸지 않고 public API와 adapter 뒤에 유지해야
한다.

## 제안하는 구현 순서

### Phase 1: 안전한 public API 우회 제거

- 기존 export가 있는 6개 import 변경
- App interceptor 무효 import 확인 및 제거
- Camera와 겹치는 2건은 보류
- 검증 후 `no-public-api-sidestep` 잔여 진단을 Camera 2건으로 축소

### Phase 2: 작은 의존 경계 수정

- RTC finalize 입력을 최소 port로 변경
- `tags`를 `tag`로 변경
- `shared/constants`를 UI theme/config로 분리

### Phase 3: Feed orchestration 정리

- `feed-processing`을 `save-feed` 내부의 publishing/processing model로 통합
- Create/Update queue와 Create 전용 AI processing 분기를 그대로 보존
- User Entity의 Feed collection query 소유권 이동
- Feed 관련 public API 재검증

### Phase 4: Member access 책임 이동

- `shared/hooks`의 use-case를 `guard-member`로 이동
- Feed action Feature가 상위 조합 계층에서 access port를 받도록 변경
- `authStore` 위치는 변경하지 않음

### Phase 5: Camera 경계 재구성

- Pose detection/matching의 실제 단일 소비 확인
- Pose detection/matching을 Guide 내부 목적별 library로 통합
- Capture geometry는 입력 interface로 격리
- Camera/RTC/PhotoOutput/FrameOutput lifecycle 회귀 테스트

### Phase 6: insignificant slice 선별 정리

- 작은 navigation/UI wrapper만 Page/Widget으로 병합 검토
- 복잡한 lifecycle Feature와 큰 Widget은 경로별 근거와 함께 유지
- 전역 `warn`과 의도적인 slice의 `off` override를 함께 적용

## 규칙 엄격화 기준

규칙은 해당 범주의 제품 코드 진단이 0이 된 직후 `warn` override를 제거해
recommended의 `error`로 복구한다.

예상 순서:

1. `fsd/inconsistent-naming`
2. `fsd/no-public-api-sidestep`
3. `fsd/segments-by-purpose`
4. `fsd/forbidden-imports`
5. `fsd/insignificant-slice`는 전역 `warn`과 의도적 경로 예외 유지

각 Phase 완료 조건은 다음과 같다.

- Steiger의 해당 규칙 오류 0
- TypeScript 통과
- 관련 Node 테스트 통과
- iOS Metro bundle 해석 성공
- Camera/RTC 변경 Phase는 실제 기기 lifecycle 수동 검증 결과 별도 기록

## 블로그/포트폴리오 기록 포인트

- lint 숫자를 줄이는 것과 아키텍처를 개선하는 것은 다르다.
- public API 우회와 레이어 방향 위반을 분리해 다뤘다.
- type-only import도 compile-time 결합이므로 의존으로 취급했다.
- 단일 소비 slice를 무조건 병합하지 않고 상태, lifecycle, 실패 경계를
  판단 기준으로 사용했다.
- 기존 동작을 보존하기 위해 작은 경계 변경부터 Camera lifecycle 변경까지
  Phase를 분리했다.
- 규칙을 한 번에 강제하지 않고, 기준선을 만든 뒤 규칙별 ratchet 방식으로
  `warn`에서 `error`로 승격했다.

## 구현 결과

### 적용한 결정

- 통합 Feature 이름은 기존 사용자 행동과 public API를 유지하는
  `save-feed`로 결정했다.
- `feed-processing`의 publishing queue와 processing store는 서로 합치지 않고
  `save-feed` 내부의 독립 model로 이동했다.
- 사용자별 Feed collection query는 `entities/feed`로 이동했으며 기존
  `[["user"], "user", ...]` query key 값을 보존했다.
- Pose detection/matching은 `guide-feed/lib` 내부 목적별 library로 이동했다.
  중첩된 `lib/model` 예약 이름은 제거하고 각 library 바로 아래에 adapter,
  config, type과 algorithm 파일을 유지했다.
- `useMemberAccess`는 `guard-member`의 `useRequireMember`로 이동했다. Feed
  action은 Guard Feature를 import하지 않고 Feed Detail Widget이 전달하는
  access callback에만 의존한다.
- `shared/constants`는 UI token인 `shared/ui/theme`과 앱 설정인
  `shared/config`로 분리했다.
- 얇은 `edit-feed`, `camera-header`, `profile/rtc-photo-preview`,
  `rtc-join-sheet` slice는 실제 조합 책임을 가진 Widget, Page 또는 Feature로
  병합했다.
- 독립 상태, lifecycle 또는 실패 경계를 가진 단일 소비 slice는 유지하고
  `steiger.config.ts`에 경로별 `insignificant-slice` 예외를 기록했다. 전역
  규칙은 `warn`이므로 새로운 단일 소비 slice는 계속 탐지된다.

### 의존 흐름 변화

```text
Profile / Guide / Feed Browse
  ↓
entities/feed collection query
  ↓
React Query cache (기존 key 유지)

Feed Detail Widget
  ├─ guard-member: 회원 접근 정책
  └─ Feed action Features: 주입된 access callback

Camera Page
  ├─ capture-photo: 촬영 및 VisionCamera lifecycle
  └─ guide-feed
       ├─ pose-detection: native callback adapter
       └─ pose-matching: 순수 좌표/매칭 알고리즘
```

### 규칙 승격 결과

- `forbidden-imports`, `no-public-api-sidestep`, `inconsistent-naming`,
  `segments-by-purpose`는 recommended preset의 `error`로 복구했다.
- `insignificant-slice`는 전역 `warn`과 근거가 기록된 경로별 `off`를 함께
  적용했다.
- 제품 코드 기준 Steiger 진단은 0건이다. 로컬 macOS의 열린 파일 감시 한도
  영향이 있는 환경에서는 `CHOKIDAR_USEPOLLING=1 pnpm fsd:check`로 동일 검사를
  실행할 수 있다.

상세 결정은 `ADR-0037`에 기록한다.

### 검증 결과

- `pnpm exec tsc --noEmit`: 통과
- `CHOKIDAR_USEPOLLING=1 pnpm fsd:check`: 진단 0건
- `pnpm lint`: 오류 0건, 기존 React Compiler 경고 104건
- 등록된 `test:*` 스크립트 23개 실행: 22개 통과
- `test:rtc-host-controls`: 기존 Node 22 ESM loader가
  `rtc-room-event-state.ts`의 확장자 없는 import를 해석하지 못해 실패
- `expo export --platform ios --clear`: 9,503 modules iOS bundle 생성 완료

Camera/RTC 실제 기기의 native callback 등록·해제, 촬영, Frame Sink와 세션
전환은 자동 테스트와 Metro export만으로 확인할 수 없다. 이번 작업에서는
실제 기기 수동 테스트를 실행하지 않았으며 릴리스 전 별도 확인이 필요하다.
