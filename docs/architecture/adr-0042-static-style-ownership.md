# ADR-0042: 정적 UI 스타일의 NativeWind 단일 소유

## Decision

프로젝트에서 렌더링 시점에 변하지 않는 UI 스타일은 NativeWind
`className`과 기존 디자인 토큰으로 표현한다. 런타임 계산값,
Reanimated 계산값, 플랫폼 상수 및 `className`을 직접 지원하지 않는 외부
네이티브 컴포넌트의 스타일만 `style` prop으로 유지한다.

## Context

정적 레이아웃과 색상이 NativeWind와 `StyleSheet.create` 양쪽에 나뉘어
있었다. 이 구조에서는 동일한 화면을 수정할 때 두 스타일 문법을 함께
추적해야 하고, `global.css`의 디자인 토큰 대신 개별 색상과 간격이 추가될
수 있었다.

반면 모든 `style` prop을 없애는 것도 적절하지 않다. 메뉴 측정 좌표,
safe-area inset, 진행률처럼 실행 중 결정되는 값과 Reanimated worklet이
생성하는 값은 정적 클래스가 소유할 수 없다. VisionCamera `Camera`, LiveKit
`VideoTrack`, React Native SVG 같은 외부 컴포넌트도 NativeWind 변환 경계에
포함시키기 위해 별도 wrapper를 추가하면 외부 라이브러리 경계가 불필요하게
확장된다.

## Alternatives

### 모든 StyleSheet와 style prop 제거

스타일 표면은 하나가 되지만 동적 값을 클래스 문자열로 조립하거나 외부
컴포넌트마다 wrapper를 만들어야 한다. 런타임 값과 네이티브 라이브러리의
책임이 불명확해지므로 선택하지 않았다.

### 기존 혼합 방식 유지

변경 비용은 없지만 정적 스타일의 소유자가 계속 둘로 나뉘며 디자인 토큰
적용 여부를 일관되게 검토하기 어렵다. 프로젝트의 기본 스타일링 방식이
NativeWind인 현재 구조와 맞지 않아 선택하지 않았다.

### 스타일 성격에 따른 경계 설정

정적 디자인은 NativeWind가, 런타임 및 외부 경계는 `style` prop이 소유한다.
각 도구가 표현하기 적합한 책임을 유지할 수 있어 이 방식을 선택했다.

## Reason

- 정적 UI는 `className`만 확인하면 되므로 코드 탐색과 리뷰가 단순해진다.
- 색상과 간격을 기존 Tailwind 및 프로젝트 디자인 토큰으로 재사용할 수 있다.
- 동적 스타일을 억지로 문자열로 변환하지 않는다.
- 외부 네이티브 컴포넌트를 감싸기 위한 전용 adapter를 불필요하게 만들지
  않는다.
- 애니메이션 lifecycle과 UI 스타일 책임을 분리한다.

## Trade-off

`style` prop과 `StyleSheet` import가 완전히 사라지지는 않는다. 다음 사용은
의도된 예외다.

- safe-area inset, 측정된 메뉴 좌표, 진행률 너비 등 런타임 값
- Reanimated의 animated style
- `StyleSheet.hairlineWidth`와 같은 플랫폼 계산 상수
- VisionCamera, LiveKit, SVG처럼 `style` prop이 필요한 외부 컴포넌트

예외가 있다는 사실보다 정적 디자인과 런타임 값의 소유권이 분명한지를
우선한다.

## Result

기존 `StyleSheet.create` 선언을 제거하고 정적 레이아웃, 색상, 간격,
타이포그래피를 NativeWind로 이동했다. 메뉴 위치, safe-area 위치, 진행률,
RTC 반응 애니메이션은 기존과 같이 런타임 `style`로 계산한다. Camera,
VideoTrack, SVG의 absolute fill과 실제 디바이스 hairline은 외부 및 플랫폼
경계로 유지한다.
