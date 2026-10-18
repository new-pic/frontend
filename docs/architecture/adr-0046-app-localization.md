# ADR-0046: 앱 한국어·영어 현지화 경계

## Decision

앱의 사용자 표시 언어는 `expo-localization`이 제공하는 운영체제·앱별 언어
설정을 따르고, `i18next`와 `react-i18next`가 정적 번역 리소스를 UI에 공급한다.
지원 언어는 한국어(`ko`)와 영어(`en`)이며 지원하지 않는 언어의 fallback은
한국어다.

- `shared/config/i18n`이 지원 언어, 언어 결정 정책, i18next instance와 번역
  리소스를 소유한다.
- `shared/model/LocaleCoordinator`가 Expo locale 변경을 구독하고 i18next 언어를
  앱 lifecycle 동안 동기화한다.
- React UI는 `useAppTranslation`, React 바깥의 schema·adapter·오류 생성 코드는
  라이브러리 비의존 `translate` port를 사용한다. 앱 초기화 시 i18next 구현을 이
  port에 등록해 순수 module이 외부 라이브러리나 React lifecycle에 결합되지 않는다.
- 서버 오류 응답은 기존 메시지를 유지하고, 프론트가 생성하는 fallback·검증·
  접근성 문구만 번역한다. 서버 오류를 완전히 현지화하려면 향후 안정적인 오류
  코드 계약이 필요하다.
- iOS 권한 설명과 앱 metadata는 Expo `locales`와 `expo-localization` config
  plugin으로 한국어·영어를 선언한다.
- 앱 내부 언어 선택 상태나 별도 저장소는 두지 않는다.

```text
OS / per-app language setting
  ↓
expo-localization
  ↓
LocaleCoordinator
  ↓
i18next (ko / en, fallback ko)
  ├─ useAppTranslation → React UI
  ├─ translate → schema / adapter / fallback errors
  └─ Expo locales → native metadata / permission descriptions
```

## Context

기존 앱은 화면 문구, 접근성 label, form validation, Alert와 native permission
설명이 한국어 문자열로 각 layer에 흩어져 있었다. 날짜 formatter도 `ko-KR`을
고정해 영어 기기에서도 한국어 표현을 만들었다. 단순히 화면 컴포넌트만 번역하면
오류·검증·접근성·권한 dialog가 다른 언어로 남으므로 앱 전체 언어 경험이
일관되지 않는다.

Expo SDK 56은 `expo-localization`의 `getLocales`와 `useLocales`, config plugin의
`supportedLocales`, Expo app config의 `locales`를 제공한다. 앱에는 언어 선택 UI가
요구되지 않았으므로 운영체제의 앱별 언어 설정을 단일 사용자 선택 지점으로 삼을
수 있다.

## Alternatives

### 화면별 문자열 객체만 사용

의존성이 적고 작은 화면에는 단순하지만 locale 감지, plural/interpolation,
접근성·검증 문구와 React 밖의 오류를 일관되게 처리하기 어렵다. 화면마다 fallback
정책도 중복된다.

### 앱 내부 언어 선택과 영속 저장소 추가

운영체제 설정과 무관하게 앱 안에서 언어를 바꿀 수 있다. 반면 언어 선택 UI,
저장·복원, OS 설정과 충돌할 때의 우선순위, 앱 재시작 정책이 추가된다. 현재 요구에
비해 상태와 lifecycle이 불필요하게 늘어난다.

### Expo locale adapter와 i18next resource를 결합

Expo가 native locale 및 변경 감지를 담당하고 i18next가 번역 resource,
interpolation과 React binding을 담당한다. 외부 라이브러리와 프로젝트 domain
사이는 `shared/config/i18n`과 `shared/lib/i18n`으로 제한되며, 추후 지원 언어를
추가해도 기능 module의 상태 모델을 변경하지 않는다.

## Reason

세 번째 안을 선택했다. 사용자가 이미 iOS·Android의 앱별 언어 설정을 사용할 수
있으므로 앱 내부에 같은 책임의 상태를 추가할 이유가 없다. 번역 instance와 locale
결정 정책을 Shared 경계에 두면 Feature와 Widget은 Expo/i18next 초기화 세부사항을
알지 않고 typed translation key만 사용한다.

정적 resource를 bundle에 포함해 첫 화면에서 네트워크나 비동기 resource loading을
기다리지 않는다. 초기 언어도 module 초기화 때 동기적으로 결정하고,
`LocaleCoordinator`는 실행 중 locale 변경만 반영한다. 한국어·영어 모두 기존
Paperlogy glyph 범위 안이므로 언어별 font family 분기는 추가하지 않는다.

## Trade-off

얻는 것:

- 화면, Alert, validation, 접근성 문구와 날짜 형식이 같은 앱 언어를 따른다.
- 번역 파일의 한국어 구조를 영어 resource가 TypeScript로 그대로 만족해야 한다.
- 언어 변경을 운영체제 설정과 동기화하고 별도 영속 상태를 관리하지 않는다.
- 번역 resource가 정적 bundle이므로 오프라인과 첫 렌더에서도 즉시 사용할 수 있다.
- 향후 언어 추가 시 locale 선언과 resource 추가가 중심이 된다.

포기하거나 제한된 것:

- 앱 안에는 언어 선택 메뉴가 없다.
- 지원하지 않는 locale은 한국어로 표시된다.
- 서버가 자연어 오류만 반환하면 그 문구는 서버가 보낸 언어 그대로 표시된다.
- 번역 파일이 앱 bundle 크기에 포함된다.
- 새 사용자 문구를 추가할 때 한국어·영어 resource를 함께 추가해야 한다.

## Result

- 한국어와 영어 resource, locale resolver, root locale coordinator를 추가했다.
- 주요 화면과 공용 UI, RTC, Camera, Feed, Profile, 인증·계정 흐름의 사용자 문구와
  접근성 label을 resource key로 교체했다.
- Zod validation과 React 바깥 adapter의 클라이언트 fallback 오류도 현재 언어를
  사용한다.
- 피드 상대 시간과 RTC 촬영 시간 formatter가 현재 언어를 받도록 변경했다.
- iOS native permission 설명과 앱 metadata에 한국어·영어 locale 파일을 연결했다.
- 지원 언어 선택 정책은 단위 테스트로 고정한다.
- 실제 기기의 앱별 언어 변경과 native permission dialog는 별도 수동 QA가 필요하다.
