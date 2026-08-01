# ADR-0025: gluestack Input과 React Compiler 경계

## Decision

공용 `Input`의 gluestack v5 `createInput` 구조와 공개 API를 유지한다. 다만
compound component인 `UIInput.Input` 등을 감싸는 generated wrapper 파일은
`"use no memo"` 지시어로 React Compiler 최적화 대상에서 제외한다.

RTC 참여 form을 React Native `TextInput`으로 별도 구현하거나 공용 Input을
교체하지 않는다. 모든 호출부는 기존 `Input`, `InputField`, `InputIcon`,
`InputSlot`을 계속 사용한다.

## Context

Expo SDK 56에서 React Compiler가 활성화된 상태로 gluestack Input wrapper를
번들링하면 application code인 wrapper에 memo-cache 코드가 삽입된다. 카메라
페이지에 항상 마운트되는 RTC 참여 BottomSheet에서 `InputField`를 렌더링할
때 `undefined is not a function` 런타임 오류가 발생했다.

설치된 `@gluestack-ui/core` 5.0.15와 `@gluestack-ui/utils` 5.0.6은 현재 공식
최신 버전이고, 공용 Input의 구성도 gluestack v5 공식 템플릿과 일치했다.
따라서 컴포넌트를 재생성하거나 RTC에서만 우회하지 않고, 외부 UI creator와
React Compiler가 만나는 공용 wrapper를 호환 경계로 삼았다.

## Alternatives

### Option A: 공용 Input을 React Native primitive로 교체

creator 런타임 의존성을 없앨 수 있지만 프로젝트의 gluestack Input
컨벤션과 접근성 상태 구현을 다시 만들어야 한다.

### Option B: gluestack Input을 유지하고 wrapper만 compiler opt-out

공개 API와 gluestack 상태 처리를 유지하면서 application wrapper에만
최적화 예외를 둔다.

### Option C: RTC 참여 form만 React Native TextInput으로 우회

수정 범위는 작지만 공용 Input 문제를 숨기고 화면별 UI 구현을 중복시킨다.

## Reason

Option B를 선택했다. gluestack을 사용하는 기존 설계와 모든 Input 호출부를
유지하면서 Expo 56 React Compiler와의 경계만 가장 작게 격리할 수 있기
때문이다.

```text
RtcJoinForm / Feed / Profile / Tag Form
  ↓
shared/ui Input wrapper (React Compiler opt-out)
  ↓
gluestack createInput
  ↓
React Native TextInput
```

입력값과 검증 상태는 각 form이 소유한다. 공용 Input은 visual state,
focus, disabled, invalid, 접근성 전달만 책임진다. BottomSheet lifecycle은
계속 shared BottomSheet와 해당 widget이 관리한다.

## Trade-off

얻은 것:

- gluestack Input과 기존 호출 API 유지
- RTC 전용 입력 구현 없이 모든 form의 UI 컨벤션 유지
- 외부 creator와 compiler 호환 예외를 한 파일로 제한
- 향후 gluestack이 compound component 호환성을 개선하면 지시어 하나로
  최적화를 다시 활성화할 수 있음

포기하거나 제한된 것:

- 공용 Input wrapper에는 React Compiler 자동 memoization이 적용되지 않는다.
- gluestack 또는 React Compiler 업데이트 시 예외가 여전히 필요한지 재검증이
  필요하다.

## Result

- iOS development export에서 공용 Input wrapper의 memo-cache 코드가 제거된
  것을 확인했다.
- gluestack `createInput`과 `UIInput.Input`은 그대로 번들에 포함된다.
- RTC 참여 domain 테스트와 iOS Expo export가 통과했다.
- 실제 iOS/Android 기기에서 Input focus, keyboard submit, disabled 상태를
  최종 확인해야 한다.
