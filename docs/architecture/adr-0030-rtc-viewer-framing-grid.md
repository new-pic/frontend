# ADR-0030: RTC 참여자 촬영 구도 화면과 공용 3분할 그리드

## Decision

촬영 구도를 보조하는 3×3 그리드는 외부 영상 SDK와 무관한
`shared/ui`의 수동적 overlay 컴포넌트로 구현한다. 이 컴포넌트는
상태와 lifecycle을 소유하지 않으며 pointer event도 받지 않는다.

촬영자 화면에서는 VisionCamera preview 위에 그리드를 먼저 그리고,
그 위에 기존 원본 이미지와 흰색 가이드 외곽선을 그린다. 참여자
화면에서는 LiveKit 원격 영상 위에 그리드만 표시하며 촬영자 전용
가이드 외곽선은 표시하지 않는다.

참여자 원격 영상은 `contain`으로 렌더링해 촬영자가 공유한 전체
구도를 보존한다. 참여자 화면의 나가기 동작은 좌측 상단 닫기
버튼으로 이동하고, 이모지 반응 목록은 영상과 겹치지 않는 하단
footer가 소유한다.

## Context

기존 참여자 화면은 원격 영상을 `cover`로 표시해 기기 화면 비율이
다르면 공유 영상의 가장자리를 잘랐다. 실시간 상태와 나가기 버튼,
이모지 목록도 영상 위에 각각 absolute로 배치되어 촬영 구도를
가리고 화면 구조가 분산되어 있었다.

촬영자와 참여자 모두 같은 3분할 기준선을 볼 필요가 있지만,
촬영자의 피드 가이드 외곽선은 선택한 피드에 종속된 로컬 촬영
도구이므로 참여자 화면이나 RTC 스트림에 결합하면 안 된다.

## Alternatives

### Option A: 상태 없는 공용 그리드 overlay를 각 화면에서 합성

촬영자 preview와 참여자 remote video가 동일한 공용 그리드를 각자
로컬 UI로 렌더링한다.

### Option B: 카메라 feature 내부 그리드를 참여자 화면에서도 재사용

파일 수는 줄어들 수 있지만 참여자 LiveKit UI가 VisionCamera feature
경계에 의존하고, 단순한 표현 컴포넌트가 카메라 lifecycle과 함께
변경될 위험이 있다.

### Option C: 그리드와 가이드를 RTC 영상 프레임에 합성

모든 참여자가 완전히 같은 합성 영상을 볼 수 있지만 native frame
처리 비용과 RTC 결합도가 증가한다. 촬영자 전용 가이드까지 원격
영상에 노출될 수 있고, overlay 표시 변경이 스트림 파이프라인
변경으로 이어진다.

## Reason

Option A를 선택했다. 그리드는 영상 처리 결과가 아니라 표시 계층의
촬영 보조선이므로 카메라 및 LiveKit adapter와 분리하는 편이 책임에
맞다. 같은 계산 함수로 1/3, 2/3 위치를 만들면서도 각 화면의 영상
lifecycle과 렌더링 순서는 해당 페이지가 계속 소유할 수 있다.

```text
Host VisionCamera Preview
  ↓
Shared FramingGridOverlay
  ↓
Optional Reference Image
  ↓
White Camera Guide Outline

Viewer LiveKit Remote Track (contain)
  ↓
Shared FramingGridOverlay
  ↓
Viewer Reaction Footer
```

## Trade-off

얻은 것:

- 촬영자와 참여자 화면의 3분할 기준 일치
- 촬영자 전용 흰색 가이드와 공용 그리드 책임 분리
- RTC native bridge와 LiveKit 연결 lifecycle 무변경
- 참여자 영상의 전체 구도 보존
- 이모지 목록이 영상을 가리지 않는 고정 footer 구조
- pointer event를 받지 않아 기존 카메라 조작과 반응 전송 유지

제한:

- `contain` 영상과 화면 비율이 다르면 검은 여백이 생길 수 있다.
- 참여자 그리드는 로컬 UI이므로 녹화되거나 RTC 영상 자체에
  포함되지 않는다.
- 원격 영상의 실제 표시 영역보다 화면 stage가 클 경우 그리드는
  stage 전체를 기준으로 그려진다. 향후 여백까지 제외한 정밀 구도가
  필요하면 원격 track 크기와 layout으로 contain rect를 계산해야 한다.

## Result

- 공용 `FramingGridOverlay`와 3분할 위치 순수 함수를 추가했다.
- 촬영자 화면은 그리드 위에 기존 가이드 overlay를 유지한다.
- 참여자 화면은 상단 닫기 버튼과 제목, `contain` 원격 영상,
  그리드, 기존 서버 이모지 목록 footer로 재구성했다.
- RTC reaction, 참여자 입장 회귀 테스트와 TypeScript 검사를
  통과했다.
- 실제 기기에서의 화면 비율별 letterbox와 safe area는 별도 시각
  확인이 필요하다.
