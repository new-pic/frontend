# ADR-0037: FSD 위반을 책임과 lifecycle 경계로 해소

## Decision

Steiger가 발견한 제품 코드의 구조 위반을 다음 원칙으로 해소한다.

- endpoint 경로가 아니라 반환 domain과 cache 책임으로 Entity 소유권을
  정한다.
- 단일 소비라고 해도 독립 상태, lifecycle 또는 실패 경계를 소유하면
  Feature/Widget slice를 유지한다.
- 같은 레이어 Feature끼리 직접 의존하지 않고 Widget/Page가 port를 주입해
  조합한다.
- 도메인 전용 알고리즘은 Shared로 내리지 않고 해당 Feature의 내부 목적별
  library로 둔다.
- 규칙별 누적 위반이 0이 되면 recommended preset의 `error`로 승격한다.

구현 구조는 다음과 같다.

```text
Feed collection UI
  ↓
entities/feed/api
  ↓
React Query cache

Feed Detail Widget
  ├─ features/user/guard-member
  └─ features/feed/* action (access callback 주입)

Camera Page
  ├─ features/camera/capture-photo
  └─ features/camera/guide-feed
       └─ lib/{pose-detection, pose-matching}
```

## Context

ADR-0036에서 Steiger recommended preset을 단계적으로 도입한 뒤 제품 코드에
49개의 경고가 남았다. 주요 원인은 같은 레이어 slice 간 import, public API
우회, 코드 형태 기반 Shared segment, 복수형 Entity 이름과 단일 소비 slice
휴리스틱이었다.

경고를 모두 숨기면 새로운 위반을 차단할 수 없고, 모든 단일 소비 slice를
합치면 Camera, RTC, 소셜 로그인처럼 lifecycle이 복잡한 모듈의 실패 경계가
사라진다. 따라서 참조 횟수가 아니라 상태 소유자와 변경 이유가 함께
움직이는 범위를 기준으로 재설계할 필요가 있었다.

## Alternatives

### Option A: 경고 파일만 public barrel로 우회

변경량은 작지만 User Entity가 Feed query를 소유하고 Shared가 회원 연결
workflow를 소유하는 실제 책임 문제는 남는다.

### Option B: 책임과 lifecycle 기준으로 소유권을 재설계

Feed query, 회원 접근, Feed publishing과 Camera Guide의 실제 소유자를
정리한다. import 변경 범위는 크지만 Steiger 진단과 도메인 경계가 같은
방향으로 개선된다.

### Option C: 단일 소비 slice를 모두 상위 소비자에 병합

경고 수는 빠르게 줄지만 native callback, background queue, RTC connection,
mutation lock과 같은 독립 lifecycle 및 실패 격리가 사라진다.

## Reason

Option B를 선택했다. 다음 구조적 문제를 진단을 숨기지 않고 해결하면서도
기존 상태 소유자를 보존할 수 있기 때문이다.

- 내 피드, 좋아요 피드와 저장 피드는 Feed DTO와 Feed cache를 반환하므로
  `entities/feed`가 소유한다.
- Feed 저장 form, CREATE/UPDATE publishing queue와 CREATE 전용 AI 처리는
  하나의 사용자 행동에 속하지만 별도 model로 lifecycle을 유지한다.
- Pose detection/matching은 Camera Guide에만 사용되고 DWPose/MediaPipe 계약에
  결합되어 있으므로 `guide-feed` 내부 library가 소유한다.
- 회원 접근 확인과 계정 연결 navigation은 `guard-member` Feature가 소유하고,
  Feed action에는 최소 실행 허용 port만 전달한다.

## Trade-off

얻은 것:

- 제품 코드의 금지된 slice 간 import와 public API 우회 제거
- Feed cache와 query의 단일 domain 소유자
- Guard 정책과 Feed action의 의존성 역전
- Capture lifecycle과 Guide Pose lifecycle의 명시적 경계
- 신규 FSD 위반을 error로 차단하는 ratchet

제한:

- `authStore`는 ADR-0034의 보류 결정에 따라 아직 `shared/model`에 남는다.
- `insignificant-slice` 예외 목록은 slice가 커지거나 소비 관계가 바뀌면
  재검토해야 한다.
- Camera/RTC native lifecycle은 자동 테스트와 Metro bundle만으로 완전하게
  검증할 수 없어 실제 기기 회귀 확인이 필요하다.
- Feed collection query key는 캐시 호환성을 위해 기존 중첩 배열 값을
  유지하며, key 형식 자체의 정리는 별도 migration이 필요하다.

## Result

- Steiger 제품 코드 진단을 49개 경고에서 0개로 줄였다.
- 구조 규칙 4개를 recommended preset의 `error`로 복구하고,
  `insignificant-slice`만 전역 `warn`으로 유지했다.
- Feed collection의 기존 query key 값과 infinite cache shape를 보존했다.
- Feed publishing/processing store와 Camera/RTC native lifecycle 구현을
  변경하지 않고 소유 경계와 import 방향을 정리했다.
- TypeScript 검사를 통과했다.
- Steiger 제품 코드 진단 0건을 확인했다.
- lint는 오류 0건이며 기존 React Compiler 단계 경고 104건이 유지됐다.
- 등록된 23개 테스트 스크립트 중 22개가 통과했다. 남은
  `test:rtc-host-controls`는 이번 변경 전부터 존재한 Node 22 ESM loader의
  확장자 없는 import 해석 실패가 동일하게 재현됐다.
- iOS Metro export에서 9,503개 module을 해석하고 bundle을 생성했다.
- 실제 기기 Camera/RTC lifecycle 수동 검증은 실행하지 않았다.
