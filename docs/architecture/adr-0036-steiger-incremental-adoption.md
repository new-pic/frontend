# ADR-0036: Steiger FSD 규칙의 단계적 적용

## Decision

Steiger의 FSD recommended preset을 기본 규칙으로 사용한다. 현재 구조에
누적된 다음 진단은 경고로 추적하고, 그 외 recommended 규칙은 오류로
유지한다.

- `fsd/forbidden-imports`
- `fsd/no-public-api-sidestep`
- `fsd/inconsistent-naming`
- `fsd/insignificant-slice`
- `fsd/segments-by-purpose`

`__tests__` 내부 코드는 slice의 내부 구현을 직접 검증할 수 있도록
`forbidden-imports`와 `no-public-api-sidestep` 검사를 제외한다. 제품 코드의
동일 규칙은 계속 경고로 노출한다.

로컬과 CI에서 같은 진입점을 사용할 수 있도록 `fsd:check` 스크립트를
제공하고, 개발 중 구조 변화를 확인할 수 있도록 `fsd:watch`를 제공한다.
현재 경고가 남아 있으므로 `--fail-on-warnings`는 사용하지 않는다.

## Context

현재 프로젝트는 App, Pages, Widgets, Features, Entities, Shared 레이어를
사용하지만 기존 기능을 FSD로 점진적으로 정리해 왔다. recommended preset을
설정 없이 실행했을 때 다음 68건이 발견됐다.

- slice 간 또는 상위 레이어 import 18건
- public API 우회 27건
- 단일 소비 slice 20건
- slice 이름 복수형 불일치 1건
- 목적이 아닌 코드 형태 기반 Shared segment 2건

이를 즉시 오류로 적용하면 Steiger 도입 자체가 실패하고, Camera와 RTC를
포함한 feature 간 의존 재설계를 한 번에 수행해야 한다. 반대로 규칙을
끄면 신규 위반과 기존 부채를 확인할 수 없다.

```text
Source import / folder structure
  ↓
Steiger recommended preset
  ↓
새로운 구조 오류 ── error
기존 FSD 부채 ───── warn
테스트 내부 import ─ exempt
```

## Alternatives

### Option A: recommended preset을 즉시 엄격하게 적용

가장 강한 품질 게이트지만 현재 68건으로 모든 검사가 실패한다. 도구 도입과
기능 구조 변경이 하나의 작업에 섞여 회귀 원인을 분리하기 어렵다.

### Option B: 기존 위반 규칙을 경고로 단계 적용

recommended preset은 유지하면서 누적 위반만 경고로 추적한다. 현재 구조를
보존한 채 실행 가능한 기준선을 만들고, 기능 단위로 경고를 줄일 수 있다.

### Option C: 기존 위반 파일마다 개별 예외 적용

다른 경로의 신규 위반을 즉시 차단할 수 있지만 설정이 현재 파일 구조와
강하게 결합된다. 파일 이동 때마다 예외 목록을 관리해야 하고 설정 자체가
아키텍처 목록으로 비대해진다.

## Reason

Option B를 선택했다. Steiger를 즉시 반복 실행할 수 있고, 기존 동작을
변경하지 않으면서 아키텍처 부채를 계속 가시화할 수 있기 때문이다.

테스트 코드는 제품 의존 방향을 구성하는 모듈이 아니라 개별 domain 및
adapter를 검증하는 소비자다. 내부 모듈 직접 import가 필요한 현재 Node
테스트 구조를 제품 코드와 같은 public API 규칙으로 제한하지 않는다.

## Trade-off

얻은 것:

- 공식 FSD recommended preset 기반의 구조 검사
- 기존 구조를 변경하지 않는 실행 가능한 Steiger 기준선
- 테스트와 제품 코드의 import 책임 분리
- 기능 단위로 줄일 수 있는 FSD 부채 목록

제한:

- 경고로 설정한 규칙의 신규 위반은 현재 CI를 실패시키지 않는다.
- `insignificant-slice`는 재사용 횟수를 근거로 하는 휴리스틱이므로 모든
  진단이 실제 이동 필요성을 의미하지 않는다.
- 기존 경고가 남아 있는 동안 `--fail-on-warnings`를 적용할 수 없다.

## Result

- `steiger.config.ts`에 recommended preset과 단계 적용 override를 구성했다.
- `fsd:check`와 `fsd:watch` 실행 경로를 추가했다.
- `pnpm fsd:check`는 오류 없이 종료됐으며, 테스트 내부 import 진단을
  제외한 기존 FSD 부채 49건을 경고로 표시했다.
- TypeScript 검사(`pnpm exec tsc --noEmit`)를 통과했다.
