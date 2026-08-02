# ADR-0027: NativeWind v5 Input의 nativeStyleMapping 호환 경계

## Decision

Gluestack 공용 `Input`과 NativeWind v5 Metro 변환 구조를 유지한다.
`react-native-css@3.0.7`의 `nativeStyleMapping`이 `true`를 같은 이름의 prop
경로로 해석하도록 pnpm dependency patch를 적용한다.

```text
RtcJoinForm
  ↓
shared/ui InputField
  ↓
Gluestack createInput
  ↓
NativeWind가 제공한 react-native-css TextInput
  ↓
nativeStyleMapping(true → 동일한 이름의 prop 경로)
  ↓
React Native TextInput
```

프로젝트가 직접 선언한 `Spinner` 매핑도 deprecated `nativeStyleToProp` 대신
문자열 경로를 사용하는 `nativeStyleMapping`으로 맞춘다.

## Context

RTC 코드 입력창은 `text-center`를 사용한다. 이 클래스가 `textAlign` 스타일을
생성하면 `react-native-css`의 내장 TextInput은 다음 매핑을 실행한다.

```ts
nativeStyleMapping: {
  textAlign: true,
}
```

설치된 3.0.7 타입은 `true`를 허용하지만 런타임은 값을 문자열로 가정해
`path.split(".")`을 호출했다. 따라서 `true.split`에 해당하는
`undefined is not a function`이 발생했다. RedBox의 실제 최상단 소스와
컴포넌트 스택은 각각 `native/styles/index`와
`react-native-css/components/TextInput`이었다.

## Alternatives

### Option A: `text-center`를 인라인 `textAlign`으로 교체

현재 RTC 입력만 빠르게 우회할 수 있지만 동일한 클래스가 다시 사용되면
재발하고 외부 라이브러리의 유효한 타입 계약을 앱이 회피해야 한다.

### Option B: 공용 Input을 React Native primitive로 교체

외부 creator 의존성은 줄지만 Gluestack의 focus, invalid, disabled, 접근성
상태 전달을 다시 구현해야 하며 모든 입력 화면의 회귀 범위가 크다.

### Option C: dependency patch로 매핑 계약을 복구

공용 API와 스타일 사용법을 유지하고 결함이 있는 외부 경계 한 곳만 수정한다.
반면 패키지 업그레이드 때 upstream 수정 여부와 patch 적용 가능성을 확인해야
한다.

## Reason

Option C를 선택했다. `true`는 라이브러리의 공개 타입이 허용하는 값이며,
의미도 현재 style key와 같은 이름의 native prop으로 옮기는 것이다. 최신
배포 버전인 3.0.7에서 결함이 재현되어 단순 버전 업그레이드로 해결할 수도
없었다. `(path === true ? key : path)` 정규화는 이 계약을 가장 작은 범위로
복구한다.

## Trade-off

얻은 것:

- Gluestack Input과 기존 호출 API 유지
- RTC에 한정되지 않고 `true` 매핑 전체의 동일 오류 방지
- pnpm install 시 자동 재적용되는 명시적인 호환 패치
- NativeWind의 Metro 단일 변환 경계 유지

제한:

- 외부 패키지 소스에 대한 프로젝트 patch를 관리해야 한다.
- `react-native-css` 업그레이드 시 upstream 반영 여부를 확인하고 patch를
  제거하거나 갱신해야 한다.

## Result

- 패치 전 iOS 시뮬레이터의 최소 Input 화면에서 같은 RedBox를 재현했다.
- 패치 후 동일한 `InputField className="text-center text-xl"`이 정상 렌더됐다.
- 공용 Input API를 변경하지 않았고 TypeScript 전체 검사가 통과했다.
- 회귀 검사는 patch 등록과 `true → key` 정규화가 저장소에 남아 있는지
  확인한다. 실제 렌더 검증은 iOS 시뮬레이터에서 수행했다.
