# ADR-0009: 피드 AI 작업의 루트 Coordinator 추적

## Decision

피드 생성 후 DWPose/RMBG 비동기 작업을 페이지가 아닌 앱 루트의
`FeedProcessingCoordinator`와 메모리 Zustand store가 추적한다.
실시간 전송은 Expo SDK 56의 `expo/fetch` 스트리밍으로 SSE를 읽고,
최초 확인과 복구에는 Status GET을 사용한다.

서버가 보고한 진행률과 사용자에게 표시하는 진행률은 분리한다. Store는
`serverProgressPercent`와 마지막 ETA 관측 시각을 보존하고, Badge 전용
projection이 `estimatedRemainingSeconds`를 기준으로 표시값을 계산한다.
표시값은 절대 감소하지 않으며 자동 보간은 95%에서 멈춘다. 서버가 더 높은
값을 보내면 즉시 전진하지만 처리 완료 신호 전에는 최대 99%까지만 표시한다.
100%는 completed event 또는 완료 Status만 설정한다.

초기 이미지 파일 upload에는 서버 job ETA가 없으므로 기존 indeterminate
loader를 유지하고, 시간 기반 progress loader는 AI 처리 단계에만 적용한다.

루트 Badge는 safe area 기준 우측 상단에 배치한다. 파일 upload와 수정
요청에는 회전 loader를 사용하고, AI 처리 단계에서는 spinner를 숨긴 뒤
문구 오른쪽의 얇은 progress track만 표시한다. Badge 배경 전체를 progress로
사용하지 않아 다른 화면 요소 위에서도 상태와 진행량을 구분한다.

생성 작업은 AI 처리와 목록 갱신이 모두 끝났을 때, 수정 작업은 API 요청이
완료됐을 때 `expo-haptics` 성공 feedback을 한 번 발생시킨다. 햅틱은 UI
feedback adapter로 격리하고 네트워크·Store 상태를 변경하지 않는다.

```
Create Feed 202
      ↓
Server DTO Adapter
      ↓
Feed Processing Store
      ↓
Root Coordinator
  ├─ Status GET
  ├─ SSE stream
  ├─ Polling fallback
  └─ AppState lifecycle
      ↓
Completed → Feed list reset → Server Feed DTO
      ↓
Root Badge / Feed Grid
```

## Context

피드 생성 응답은 게시 완료가 아니라 AI 작업 접수다. 사용자는 생성
화면을 떠난 뒤에도 진행 상태를 볼 수 있어야 하며, 서버 처리가 완료된
후에만 실제 피드 목록을 다시 받아야 한다. 화면에 임시 Feed 객체를
추가하면 서버 상태와 앱 상태가 달라질 수 있다.

React Native 네이티브 런타임에는 브라우저의 전역 `EventSource`가
기본 제공되지 않는다. 또한 인증 헤더, background/foreground 전환,
Status GET 복구 및 polling 정책을 앱에서 통제해야 한다.

## Alternatives

1. 생성 화면이 SSE와 진행 상태를 소유
   - 구현 범위는 작지만 화면 이동 시 연결과 상태가 소멸한다.
   - 루트 배지나 다른 페이지에서 상태를 이어가기 어렵다.

2. 전용 처리 화면이 SSE와 진행 상태를 소유
   - lifecycle은 명확하지만 사용자가 처리 완료까지 화면에 묶인다.

3. 루트 Coordinator와 전역 store
   - 라우트와 독립적으로 작업을 추적하고 전역 배지를 표시할 수 있다.
   - 앱 lifecycle 및 단일 활성 작업 정책을 한 곳에서 관리한다.

SSE transport는 `react-native-sse` 추가와 네이티브 전용 모듈도
검토했다. 전자는 자체 재연결 정책과 앱의 복구 정책이 겹치고, 후자는
현재 요구에 비해 구현 및 플랫폼 유지보수 비용이 크다.

표시 진행률은 서버 값만 표시하는 방식과 Coordinator가 synthetic 값을
Store에 기록하는 방식도 검토했다. 전자는 SSE 공백 동안 멈추고, 후자는
서버 원본과 추정값을 섞으며 전역 Store를 짧은 주기로 갱신한다.

## Reason

루트 Coordinator는 네트워크와 lifecycle을 소유하고, store는 현재
작업의 domain/transport/list-refresh 상태만 소유한다. 배지는 store를
표시할 뿐 연결을 만들지 않는다. 이 분리로 페이지 이동과 무관하게
추적할 수 있고 SSE 장애를 AI 작업 실패로 오판하지 않는다.

`expo/fetch`는 Expo 56에서 `ReadableStream`을 지원하므로 새 의존성
없이 Authorization 헤더가 포함된 SSE transport를 만들 수 있다.
정상 연결 중에는 polling하지 않으며, SSE가 terminal event 없이
종료되거나 실패할 때만 2.5초 Status polling으로 전환한다.

표시 projection은 서버 상태를 변경하지 않는 순수 계산으로 격리한다. 새
SSE가 현재 표시값보다 낮으면 현재 표시값을 새 anchor로 유지하면서 새 ETA만
반영한다. SSE가 없어도 마지막 ETA까지 anchor에서 95%를 향해 증가하고,
예상 시간이 지나면 완료를 추측하지 않고 95%에서 대기한다. UI timer는 앱이
active인 동안만 250ms 주기로 계산하며 foreground 복귀 시 wall-clock 경과
시간으로 즉시 복원한다.

완료 후에는 전역 Feed 목록의 모든 filter variant와 내 피드 목록만
`resetQueries`한다. InfiniteQuery의 누적 pages/pageParams를 제거하고
활성 목록을 첫 페이지부터 서버 기준으로 다시 받기 위해 invalidate가
아닌 reset을 사용한다.

자동 AI 완료 갱신은 같은 QueryClient에서 single-flight로 합치지만,
사용자의 pull-to-refresh는 기존 갱신에 합류하지 않는다. 사용자 요청은
진행 중인 목록 fetch를 취소하고 새 reset/refetch를 시작하며, 이전 자동
갱신 호출자는 최신 generation의 결과를 함께 기다린다. 이를 통해 오래된
요청 완료가 최신 목록을 다시 덮거나 새로고침이 실제 네트워크 요청 없이
끝나는 것을 막는다.

## Trade-off

- 얻는 것
  - 라우트와 무관한 진행 상태 및 루트 배지
  - SSE/Status/polling/AppState lifecycle의 단일 소유권
  - 서버 Feed DTO만 목록에 표시하는 source-of-truth 일관성
  - 별도 SSE 의존성 없음
  - 지연되거나 낮은 SSE에도 역행하지 않는 진행률
  - 네트워크 상태와 분리되어 교체·테스트 가능한 표시 projection
  - 게시 완료를 시각 정보와 함께 전달하는 플랫폼별 성공 햅틱

- 포기하거나 제한한 것
  - 작은 SSE parser와 재연결 정책을 직접 유지한다.
  - 현재 store는 메모리 기반 단일 활성 작업만 관리한다.
  - 앱 프로세스가 종료되면 진행 중인 jobId는 복원되지 않는다.
  - terminal SSE payload는 OpenAPI에 정의되지 않아 event 이름만
    terminal 신호로 사용하며 실패 사유를 임의로 만들지 않는다.
  - ETA는 실제 완료 보장이 아니므로 처리가 늦으면 95%에서 대기할 수 있다.
  - 표시 진행률은 서버의 실제 작업량이 아니라 사용자 경험을 위한 추정값이다.
  - `expo-haptics`가 포함된 개발 앱을 한 번 다시 빌드해야 한다.

## Result

- 생성 성공 시 `jobId`와 `feedId`를 store에 등록하고 즉시 Feed
  화면으로 이동한다.
- Coordinator는 최초 Status GET 후 SSE에 연결한다.
- `progress`는 진행률을 갱신하고 `completed`/`failed`는 연결을
  종료한다.
- SSE 장애 시 Status GET 기반 2.5초 polling으로 복구한다.
- background에서는 stream/polling을 정리하고 foreground에서 Status
  GET부터 재개한다.
- 완료 시 전역 Feed 목록과 내 피드 목록을 single-flight reset한다.
- Pull-to-Refresh는 같은 reset use case를 강제 최신 요청 모드로 실행한다.
- 목록 reset 중에는 Photo Grid가 직전 서버 응답 snapshot을 유지한다.
- 루트 Badge는 safe area 기준 우측 상단에 배치한다. 파일 upload/수정 중에는
  spinner를, AI 처리 중에는 문구 오른쪽 `64 x 4` progress track을 표시한다.
- AI 처리 중 Badge 배경은 고정하고 progress value만 track 안에서 증가한다.
- 낮은 SSE 무시, ETA 기반 무응답 증가, 95% 보간 상한과 완료 전 99% 제한을
  순수 함수 단위 테스트로 검증했다.
- 완료 작업 ID는 한 번만 소비하며 background에서 완료된 작업은 foreground
  복귀 시 뒤늦게 진동하지 않는다.
