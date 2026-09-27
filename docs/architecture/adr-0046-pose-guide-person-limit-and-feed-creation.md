# ADR-0046: Pose Guide 인원 제한과 Feed 생성 실패 경계

## Decision

Pose Guide가 판정할 수 있는 target은 최대 4명이다. 서버 DWPose가 5명 이상을
검출하면 임의의 4명을 선택하지 않고 Feed 생성 전체를 실패시키며, 해당 Feed를
저장하지 않는다.

서버 오류 transport는 `shared/api`가 status와 payload를 보존하고, 오류의 domain
분류·사용자 메시지·재시도 가능 여부는 `features/feed/save-feed/model`이 소유한다.
`features/camera/guide-feed`는 저장된 1~4인 target의 판정과 방어적 contract 검증만
담당한다.

```text
CreateFeedCommand
  ↓ save-feed API
Server DWPose eligibility
  ├─ 1~4명 → AI 처리 완료 → Feed 저장
  └─ 5명 이상 → domain failure → Feed 미저장
                              ↓
                 save-feed failure adapter
                 ├─ retryable=false
                 └─ 이미지 교체 안내
```

## Context

DWPose는 5명 이상을 반환할 수 있지만 현재 on-device MediaPipe detector와 exact
assignment는 최대 4명을 지원한다. 이 차이를 저장 이후까지 허용하면 클라이언트는
성공할 수 없는 target에 대해 계속 `PERSON_COUNT_MISMATCH`를 반환한다.

현재 Feed 생성은 이미지와 임시 Feed를 저장한 뒤 `202 Accepted`와 `jobId`를
반환하고 AI job을 별도로 관찰한다. job status의 작업별 `error` 문자열로 provider
실패 원인을 확인할 수는 있지만, 인원 제한을 식별할 안정적인 domain code와 SSE
실패 payload는 문서화되어 있지 않다. 또한 publishing 실패 배지는 기본적으로 같은
명령을 재시도하므로 입력 변경이 필요한 인원 제한 오류를 구분해야 한다.

## Alternatives

### 대표 4명 자동 선택

Feed 생성은 유지할 수 있지만 사용자가 의도한 인물을 조용히 제외할 수 있고,
outline과 Pose target의 의미가 달라질 수 있어 채택하지 않았다.

### 5명 이상 live 판정 지원

detector 상한, 실시간 성능, assignment, 가림과 identity 정책을 함께 확장해야 한다.
현재 범위를 넘어 후속 기능으로 분리했다.

### Guide만 비활성화하고 Feed는 저장

일반 Feed와 Guide 가능 Feed가 갈라지고 부분 성공 상태를 추가해야 한다. 사용자가
생성 단계 전체 차단을 선택했으므로 채택하지 않았다.

## Reason

지원 불가능한 target을 시스템에 만들지 않는 것이 가장 예측 가능하다. 서버가 원본
이미지 분석과 persistence transaction을 소유하므로 eligibility의 최종 책임도 서버에
둔다. 클라이언트는 안정적인 domain code를 presentation과 retry 정책으로 변환한다.

## Trade-off

- 판정 가능 범위와 저장 데이터 invariant가 명확해진다.
- 사용자는 5명 이상 사진을 Feed로 게시할 수 없다.
- 오류가 비동기 job에서 발생한다면 status/SSE DTO에 failure code/message를 추가해야
  한다.
- 향후 5명 이상을 지원하려면 detector와 assignment 상한을 함께 올려야 한다.

## Result

- 백엔드 담당자로부터 최대 4명으로 변경했다는 전달을 받았다.
- 클라이언트 Pose matcher와 detector 상한은 4명으로 유지한다.
- 현재 Swagger에는 최대 4명 제한, 5명 이상 처리 방식, 고정 error code, 임시
  Feed·이미지 정리 정책이 명시되어 있지 않아 구현은 검증되지 않았다.
- 계약 확인 전에는 클라이언트가 오류 code/payload를 추측해 선행 구현하지 않는다.
- 계약 확정 후 `save-feed`에 non-retryable domain failure mapping과 이미지 교체 안내를
  구현한다.
