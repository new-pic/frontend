# ADR-0027: NativeWind v5 Input 변환 경계

## Decision

NativeWind v5의 CSS 변환은 Metro `withNativewind`가 전담하고,
Babel에서는 기존 `nativewind/babel` preset을 제거한다. Expo의
`babel-preset-expo`, module resolver, worklets plugin은 유지한다.

Gluestack `Input` wrapper의 React Compiler 예외도 제거하고 공용
`Input`, `InputField`, `InputIcon`, `InputSlot` API를 그대로 유지한다.

## Context

프로젝트는 NativeWind 5 preview와 Tailwind CSS 4를 사용하지만,
Babel에 NativeWind v4 방식의 preset이 남아 있었다. 그 결과
Gluestack 내부의 `react-native` import까지 `react-native-css/components`로
재변환되어 `InputField` 렌더 시 `undefined is not a function` 오류가
발생했다.

React Compiler 예외를 적용한 후에도 같은 오류가 재현되었고,
Babel 결과에서 compiler memo cache가 제거된 것을 확인했다. 따라서
ADR-0025의 초기 원인 판단을 폐기하고 NativeWind 변환 경계를
실제 원인으로 정정한다.

## Alternatives

### Option A: NativeWind v5 Babel preset을 제거

공식 v5 변환 경계에 맞추면서 Gluestack 공용 Input을 유지한다.

### Option B: NativeWind, Metro, CSS 설정을 전체 재구성

전체 설정을 한 번에 정규화할 수 있지만 앱 전체 스타일 회귀 범위가
커진다.

### Option C: RTC 참여 form만 React Native TextInput으로 우회

즉시 회피는 가능하지만 공용 Input의 잘못된 변환을 남기고
화면별 구현을 중복한다.

## Reason

Option A를 선택했다. 변경 범위가 Babel 경계로 한정되고,
Gluestack Input 구조와 현재 호출 API를 모두 유지할 수 있다.

```text
Application / Gluestack components
  ↓
babel-preset-expo
  ↓
NativeWind v5 Metro transformer
  ↓
react-native-css
  ↓
React Native primitives
```

## Trade-off

얻은 것:

- NativeWind v5 공식 변환 경계와의 일치
- Gluestack Input 공용 API 유지
- 화면별 TextInput 우회 제거

제한:

- Metro 캐시에 기존 Babel 결과가 남아 있으면 `expo start --clear`가
  필요하다.
- NativeWind v5가 preview 버전이므로 업그레이드 시 설정을 재검증해야
  한다.

## Result

- Babel이 Gluestack 내부 `react-native` import를 구 방식으로 재변환하지
  않도록 정리했다.
- React Compiler 예외 지시어를 제거했다.
- 실제 iOS/Android 기기에서 RTC 참여 입력과 프로필 수정 입력의
  focus, keyboard submit, disabled 상태를 확인해야 한다.
