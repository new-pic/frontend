# ADR-0046: Pose Guide 최대 인원과 제한 안내

## Decision

Pose Guide의 target과 live 판정은 최대 4명을 지원한다. 서버가 저장한 target이
4명이면 가이드 선택 건마다 한 번, 다음 내용을 비차단 배너로 안내한다.

> 촬영 가이드는 최대 4명까지 인식해요. 사진에 더 많은 사람이 있다면 일부 인물은
> 가이드에서 제외될 수 있어요.

서버가 원본 사진의 전체 인원을 따로 알려주지 않으므로 5명 이상이라고 단정하지
않는다. 안내가 표시되는 동안에는 같은 위치의 Alignment 피드백보다 안내를 우선하고,
5초 뒤 기존 피드백으로 복귀한다.

```text
Feed Pose API
  ↓ stored target 1~4명
Guide Controller
  ├─ 1~3명 → 기존 Guide 동작
  └─ 4명   → 선택별 1회 제한 안내 → 기존 Guide 동작
```

## Context

on-device MediaPipe detector와 exact assignment는 최대 4명을 지원한다. 백엔드도
DWPose 결과를 최대 4명까지만 저장·반환하는 것으로 전달받았다. 탐지 단계부터 4명으로
제한하면 프론트의 `rawPersonCount`와 `posePersonCount`만으로 원본 사진이 5명
이상이었는지 판별할 수 없다.

이전 결정은 5명 이상 감지 시 Feed 생성을 실패시키는 것이었지만, 실제 서버는 별도
오류 계약 없이 최대 4명만 반영한다. 따라서 존재하지 않는 error code를 추측하지 않고
Camera Guide가 자신의 지원 범위를 사용자에게 설명한다.

## Alternatives

### 모든 가이드 선택에 항상 안내

서버 정보 없이도 정확하지만 1~3인 가이드에도 반복 노출되어 안내 피로가 크다.

### 4명 target에서 선택별 한 번 안내

정확히 5명 이상이었다고 단정하지 않으면서 제한에 도달한 경우에만 안내할 수 있어
채택했다.

### 서버가 잘림 여부를 명시

`rawPersonCount`, `posePersonCount`, `isPersonCountTruncated`의 의미를 보장하면
가장 정확하다. 서버가 4명보다 많이 탐지할 수 있어야 하므로 현재 구현의 선행 조건으로
두지 않았다.

### 클라이언트에서 별도 인원 탐지

현재 detector도 최대 4명이며 추가 추론은 지연, 발열, 배터리 비용과 모델 간 결과
불일치를 만든다. 안내만을 위해 중복 탐지를 추가하지 않는다.

## Reason

서버 계약 없이도 사실인 정보만 전달하고, 기존 촬영과 Matching을 차단하지 않는다.
표시 수명은 target 선택을 조율하는 `features/camera/guide-feed/model`이 소유하고,
문구와 배너 표현은 같은 feature의 `lib`과 `ui`에 둔다. `save-feed`는 피드 생성이
실패하지 않으므로 이 정책을 소유하지 않는다.

## Trade-off

- 4명 target이 실제로 정확히 4명인 경우에도 안내한다.
- 원본이 5명 이상이어도 서버가 3명 이하만 반환하면 안내하지 못한다.
- 서버가 추후 잘림 metadata를 제공하면 controller의 판정 입력만 교체할 수 있다.
- 안내는 비차단이므로 촬영, RTC, Pose Matching 실패로 전파되지 않는다.

## Result

- 최대 인원 상수는 기존 detector의 `MAX_POSE_COUNT = 4`를 단일 기준으로 사용한다.
- target 준비가 완료되고 저장된 target이 4명이면 선택 건마다 한 번 안내한다.
- 안내는 5초 후 사라지고 현재 Alignment 피드백으로 복귀한다.
- 1~3명 target에는 제한 안내를 표시하지 않는다.
