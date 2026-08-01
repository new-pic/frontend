# ADR-0009: 피드 AI 작업의 루트 Coordinator 추적

## Decision

피드 생성 후 DWPose/RMBG 비동기 작업을 페이지가 아닌 앱 루트의
`FeedProcessingCoordinator`와 메모리 Zustand store가 추적한다.
실시간 전송은 Expo SDK 56의 `expo/fetch` 스트리밍으로 SSE를 읽고,
최초 확인과 복구에는 Status GET을 사용한다.

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

## Reason

루트 Coordinator는 네트워크와 lifecycle을 소유하고, store는 현재
작업의 domain/transport/list-refresh 상태만 소유한다. 배지는 store를
표시할 뿐 연결을 만들지 않는다. 이 분리로 페이지 이동과 무관하게
추적할 수 있고 SSE 장애를 AI 작업 실패로 오판하지 않는다.

`expo/fetch`는 Expo 56에서 `ReadableStream`을 지원하므로 새 의존성
없이 Authorization 헤더가 포함된 SSE transport를 만들 수 있다.
정상 연결 중에는 polling하지 않으며, SSE가 terminal event 없이
종료되거나 실패할 때만 2.5초 Status polling으로 전환한다.

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

- 포기하거나 제한한 것
  - 작은 SSE parser와 재연결 정책을 직접 유지한다.
  - 현재 store는 메모리 기반 단일 활성 작업만 관리한다.
  - 앱 프로세스가 종료되면 진행 중인 jobId는 복원되지 않는다.
  - terminal SSE payload는 OpenAPI에 정의되지 않아 event 이름만
    terminal 신호로 사용하며 실패 사유를 임의로 만들지 않는다.

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
