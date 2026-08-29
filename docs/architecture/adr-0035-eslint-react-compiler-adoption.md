# ADR-0035: ESLint와 React Compiler 진단의 단계적 적용

## Decision

Expo SDK 56이 제공하는 flat config를 프로젝트의 기본 ESLint 설정으로
사용한다. 일반 TypeScript 및 React 정확성 규칙은 오류로 유지하되, 기존
코드 전반에 누적된 React Compiler 호환성 진단은 다음 규칙에 한해 경고로
추적한다.

- `react-hooks/immutability`
- `react-hooks/purity`
- `react-hooks/refs`
- `react-hooks/set-state-in-effect`

`react-hooks/rules-of-hooks`와 모듈 export 충돌처럼 현재 동작의 정확성에
직접 영향을 주는 규칙은 완화하지 않는다. CommonJS로 작성된 Node 테스트의
`__dirname`만 파일별 전역으로 선언하며, 앱 코드 전체에 Node 전역을
허용하지 않는다.

## Context

ESLint 9와 `eslint-config-expo`를 처음 적용하자 기존 앱 코드에서 React
Compiler 관련 진단이 대량으로 발견되었다. 특히 Reanimated Shared Value의
렌더 중 접근, ref 변경, effect 내부 상태 동기화와 기존 Camera/RTC lifecycle
코드가 함께 진단됐다.

이 경고를 한 번에 없애려면 카메라, RTC, 애니메이션과 화면 상태 동기화의
lifecycle을 광범위하게 변경해야 한다. lint 도입과 런타임 구조 변경을 한
작업에 묶으면 회귀 원인을 분리하기 어렵다. 반대로 해당 규칙을 완전히
끄면 React Compiler 호환성 부채를 계속 확인할 수 없다.

Expo SDK 56의 공식 lint 설정을 외부 도구 경계로 사용하고, 앱 domain의
Camera/RTC lifecycle은 기존 소유자에게 그대로 둔다.

```text
Expo ESLint config
  ↓
정확성 오류 ── 즉시 수정
  ↓
Compiler 호환성 경고 ── 기능 단위 후속 개선
  ↓
기존 UI / Camera / RTC lifecycle
```

## Alternatives

### Option A: 모든 진단을 즉시 오류로 적용

가장 엄격하지만 lint 도입만으로 Camera, RTC와 Reanimated 구현을 동시에
재설계해야 한다. 변경 범위와 회귀 위험이 지나치게 커진다.

### Option B: 정확성 오류와 Compiler 호환성 경고를 분리

명백한 오류는 지금 수정하고, 광범위한 lifecycle 변경이 필요한 항목은
경고 수를 기준선으로 남겨 기능 단위로 줄인다. lint를 즉시 사용할 수
있으면서 후속 개선 대상도 보존한다.

### Option C: React Compiler 관련 규칙을 비활성화

당장 출력은 깨끗해지지만 호환되지 않는 패턴이 새로 추가되어도 감지할 수
없다. React 19 기반 프로젝트의 장기적인 개선 기준으로 사용할 수 없다.

## Reason

Option B를 선택했다. 현재 제품 동작을 보존하면서 ESLint를 실제 품질
게이트로 사용할 수 있고, 고위험 lifecycle 변경은 각 기능의 테스트와
함께 별도로 수행할 수 있기 때문이다.

이번 정리에서는 conditional hook 호출, 중복 RTC export와 잘못된 React
`children` 전달을 수정했다. 중복 import, 배열 타입 표기, 미사용 선언처럼
동작을 바꾸지 않는 항목도 정리했다. Camera/RTC lifecycle과 기존
Reanimated 애니메이션 알고리즘은 변경하지 않는다.

## Trade-off

얻은 것:

- Expo SDK 버전에 맞는 공식 ESLint 실행 환경
- 실제 lint 오류가 없는 기준선
- CommonJS 테스트에만 제한된 Node 전역 설정
- React Compiler 호환성 부채를 수치로 계속 추적할 수 있는 경고
- 고위험 기능 변경과 도구 설정 변경의 분리

제한:

- React Compiler 관련 경고가 당분간 lint 출력에 남는다.
- Hook dependency 경고는 각 effect의 lifecycle 의도를 확인한 뒤 별도
  기능 작업에서 수정해야 한다.
- 경고 수를 줄이는 후속 작업 전까지 `--max-warnings=0`을 사용할 수 없다.

## Result

- ESLint 오류를 122개에서 0개로 줄였다.
- React Compiler 및 Hook lifecycle 관련 경고 104개는 기능 구조를 보존한
  채 추적 가능한 기준선으로 남겼다.
- TypeScript 검사(`pnpm exec tsc --noEmit`)를 통과했다.
- iOS Metro export(`expo export --platform ios`)를 완료해 앱 모듈과 변경한
  import가 실제 bundle에서 해석되는 것을 확인했다.
- 전체 Node 테스트에서는 183개 중 182개가 통과했다. 이번 변경 전에도
  존재하던 `rtc-host-controls.test.cjs` 1개는 `rtc-room-event-state.ts`의
  확장자 없는 ESM import를 Node가 해석하지 못해 실패했다.
