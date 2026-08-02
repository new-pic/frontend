# ADR-0031: RTC 참여 바텀시트의 고정 높이와 키보드 책임

## Decision

공용 `BottomSheetModal`에 `lockedSnapPoint` 표시 모드를 추가한다.
호출부는 고정할 높이 하나만 전달하고, 공용 adapter가 Expo UI의
플랫폼별 native bottom sheet 제약을 변환한다.

- iOS와 web은 전달받은 단일 snap point만 사용한다.
- Android는 Compose ModalBottomSheet의 partial/full 두 상태 제약
  때문에 내부적으로 partial과 full 상태를 구성한다.
- 고정 모드에서는 sheet gesture를 비활성화해 사용자가 partial
  상태를 full로 확장하거나 swipe로 닫지 못하게 한다.
- RTC 참여 시트는 약 절반 높이인 `50%`를 고정 높이로 사용한다.
- 닫기는 기존 `취소하기` 버튼이 담당한다.

키보드 lifecycle은 Expo UI의 native bottom sheet가 소유한다.
RTC 참여 시트에서는 중복된 `KeyboardAvoidingView`와 자동 keyboard
inset 처리를 제거한다. 제목과 설명은 ScrollView 밖에 고정하고,
입력 필드와 버튼 영역만 필요할 때 스크롤할 수 있게 한다.

## Context

기존 RTC 참여 시트는 `48%`, `82%` 두 snap point를 사용했다. 공유
코드 입력창이 focus되면 sheet가 큰 detent로 확장되고, 카메라 header
위치까지 흰색 sheet가 올라와 기존 카메라 control이 sheet 위에
떠 있는 것처럼 보였다.

동시에 다음 세 키보드 보정이 겹쳐 있었다.

- Expo UI native sheet의 자동 keyboard 처리
- React Native `KeyboardAvoidingView`
- ScrollView의 `automaticallyAdjustKeyboardInsets`

제목과 설명까지 같은 ScrollView에 있었기 때문에 입력 필드를
노출하기 위한 자동 스크롤에서 sheet header가 화면 위로 밀렸다.

## Alternatives

### Option A: RTC 참여 시트의 snap point만 하나로 축소

iOS에서는 변경 범위가 작지만 Expo UI의 Android 구현은 snap point가
하나일 때 fully expanded 상태를 사용한다. 양 플랫폼에서 같은 고정
높이를 만들 수 없고 플랫폼 차이가 widget에 노출된다.

### Option B: 공용 BottomSheet adapter에 locked 모드 추가

공용 UI 경계가 플랫폼별 native state를 변환하고 RTC widget은
`고정된 절반 높이`라는 의도만 선언한다. 제목과 폼 body의 scroll
책임도 분리한다.

### Option C: RTC 참여 시트만 Gorhom BottomSheet 사용

정확한 percentage와 세밀한 keyboard prop을 사용할 수 있지만 Expo
UI native sheet와 JS/Reanimated sheet 두 구현을 함께 유지해야 한다.
Provider와 전용 TextInput 경계도 추가되어 한 화면을 위해 복잡도가
크게 증가한다.

## Reason

Option B를 선택했다. 프로젝트가 사용하는 Expo UI native sheet를
유지하면서 플랫폼 차이를 shared adapter에서만 처리할 수 있기
때문이다. RTC 참여 feature의 API 요청, form state, navigation은
presentation 문제와 분리된 상태로 유지된다.

```text
CameraPage open state
  ↓
RtcJoinSheet
  ├─ Fixed RtcJoinFormHeader
  └─ Scrollable RtcJoinForm body
        ↓
BottomSheetModal lockedSnapPoint
        ├─ iOS/Web: one 50% detent
        └─ Android: locked native partial state
              ↓
Native keyboard lifecycle
```

## Trade-off

얻은 것:

- 입력 focus 전후 하나의 시각적 sheet 높이 유지
- sheet 제목과 설명의 고정
- 중복 keyboard 보정 제거
- 플랫폼 분기와 Expo UI 제약의 shared adapter 격리
- 기존 RTC 참여 요청과 session lifecycle 무변경
- 순수 presentation resolver 단위 테스트 가능

제한:

- Android의 partial 높이는 Compose가 결정하므로 정확히 화면의
  `50%`를 보장하지 않고 약 절반 높이로 표시된다.
- 높이를 잠그기 위해 swipe dismiss와 backdrop dismiss를 사용할 수
  없으며 사용자는 `취소하기` 버튼을 사용해야 한다.
- 큰 접근성 글자 크기에서는 고정 header 아래 form body를 직접
  스크롤해야 할 수 있다.

## Result

- 공용 BottomSheet에 `lockedSnapPoint`와 플랫폼 presentation resolver를
  추가했다.
- RTC 참여 시트를 고정 half 높이와 고정 header 구조로 변경했다.
- 중복 `KeyboardAvoidingView`와 자동 keyboard inset 처리를 제거했다.
- BottomSheet presentation 테스트, RTC 참여 회귀 테스트와 TypeScript
  검사를 통과했다.
- 실제 기기에서 iOS 숫자 키보드 및 Android partial sheet 높이는
  별도 시각 확인이 필요하다.
