# ADR-0025: gluestack Input과 React Compiler 경계 가설

> Status: Rejected. 실제 원인과 최종 결정은 ADR-0027에 기록한다.

## Decision

공용 `Input`을 React Compiler 대상에서 제외하는 방식을 채택하지 않는다.
초기에 적용했던 모듈 단위 `"use no memo"`는 제거하고 Gluestack Input의
기본 구조를 유지한다.

## Context

RTC 참여 폼의 `InputField` 렌더 중 `undefined is not a function`이 발생했고,
당시 application wrapper에 삽입된 React Compiler memo cache를 원인으로
추정했다. 그러나 compiler opt-out 이후에도 실제 기기에서 같은 오류가
재현되었다.

기존 검증은 번들에 memo cache가 있는지와 `UIInput.Input` 코드가 남아 있는지만
확인했다. 컴포넌트를 렌더하지 않았기 때문에 NativeWind가 계산한 스타일을
`react-native-css`가 native prop으로 옮기는 런타임 경로는 실행하지 못했다.

## Alternatives

- 공용 Input wrapper를 React Compiler에서 제외
- RTC 입력만 React Native `TextInput`으로 우회
- 실제 렌더 스택을 분리 재현해 원인을 다시 추적

## Reason

compiler opt-out으로 오류가 해결되지 않았으므로 이 가설을 폐기했다. 화면별
우회도 공용 UI 경계의 결함을 숨기므로 적용하지 않았다.

## Trade-off

초기 해결이 늦어졌지만, Gluestack과 React Compiler를 불필요하게 제한하지
않고 실제 스타일 변환 결함을 수정할 수 있게 되었다.

## Result

iOS 시뮬레이터에서 `InputField`와 `text-center`를 함께 렌더하는 최소 화면으로
재현한 결과, 오류는 `react-native-css`의 `nativeStyleMapping()` 내부
`path.split()`에서 발생했다. React Compiler는 원인이 아니었다.
