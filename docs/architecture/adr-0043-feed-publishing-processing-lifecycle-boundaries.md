# ADR-0043: 피드 게시와 AI 처리 lifecycle 책임 분리

## Decision

`save-feed` feature의 `model` 내부를 화면 입력, 게시 요청, 서버 AI 처리,
전체 파이프라인의 네 책임으로 나눈다.

```text
model/
  form/        폼 검증과 게시 명령 생성
  publishing/  생성 upload·수정 요청 lifecycle
  processing/  서버 AI 작업 관찰과 진행 상태
  pipeline/    publishing과 processing을 잇는 공통 정책
```

FSD의 새로운 slice나 layer를 만드는 대신 하나의 feature 내부 구현 폴더로
구성한다. 네 책임은 모두 사용자의 피드 저장이라는 동일한 use case에
속하며 feature public API를 통해서만 외부에 노출한다.

상태 필드는 값의 출처와 lifecycle을 이름만으로 구분할 수 있게 한다.

- `publishingTaskId`, `publishingPhase`, `failureMessage`는 클라이언트가
  수행하는 생성 upload 또는 수정 요청 상태다.
- `processingPhase`는 서버 AI 작업의 비즈니스 상태다.
- `serverProgressPercent`와 `progressSnapshotReceivedAtMs`는 마지막 서버
  진행률 snapshot과 클라이언트 수신 시각이다.
- `monitoringState`는 SSE·polling 전송 상태이며 AI 작업의 성공·실패와
  별개다.
- `feedListSyncState`는 AI 완료 후 React Query 목록 cache 반영 상태다.

각 상태 union과 lifecycle 객체에는 값과 필드의 의미를 JSDoc으로 기록한다.
서버 응답 문자열과 UI 동작을 바꾸지 않고 클라이언트 내부 명칭만 명확하게
한다.

`FeedProcessingCoordinator`에는 다음 orchestration만 남긴다.

- AppState를 관찰해 foreground에서만 AI 작업 관찰 실행
- monitor 결과를 processing store의 terminal 상태로 반영
- AI 완료 후 피드 목록 cache 동기화 실행
- effect 종료 시 진행 중인 관찰 취소

최초 Status GET, SSE 연결, terminal event 판별, SSE 장애 시 polling
fallback은 순수 비동기 모듈인 `feed-ai-job-monitor`로 분리한다. Monitor는
React, Zustand, QueryClient, AppState를 참조하지 않고 callback과
`AbortSignal`로 상태 snapshot과 관찰 결과를 반환한다.

```text
Root FeedProcessingCoordinator
  ├─ AppState / effect lifecycle
  ├─ Feed processing store
  └─ completed → Feed list cache sync
             │
             ↓ start / abort
      Feed AI Job Monitor
        ├─ initial Status GET
        ├─ SSE streaming
        └─ Status polling fallback
             │
             ↓
      save-feed API client
        ├─ Axios status request
        └─ Expo Fetch SSE transport
```

## Context

기존 `model`에는 form hook, 두 Zustand store, 두 root coordinator, 진행률
계산, 햅틱과 파이프라인 판별 함수가 같은 레벨에 있었다. 파일명만으로는
어떤 코드가 게시 HTTP 요청을, 어떤 코드가 서버 AI 작업을, 어떤 코드가 두
단계를 연결하는지 구분하기 어려웠다.

상태에서도 두 lifecycle이 모두 `phase`, 현재 객체가 각각 `task`, `job`으로
표현됐다. `transportState`와 `listRefreshState`는 저장되어 있었지만 각각
연결 품질과 완료 결과 반영 중 무엇을 뜻하는지 사용처를 읽어야 알 수 있었다.
이 명칭은 상태 조합을 검토하거나 장애 범위를 판단할 때 불필요한 해석 비용을
만들었다.

또한 기존 `FeedProcessingCoordinator`는 AppState lifecycle뿐 아니라 Status
GET, SSE event 처리, polling loop, terminal 상태 반영과 목록 갱신까지 직접
수행했다. 이 때문에 React effect를 읽는 동안 전송 복구 정책까지 함께
추적해야 했고 SSE fallback을 독립적으로 검증하기 어려웠다.

## Alternatives

### 현재 평면 구조를 유지하고 주석만 추가

파일 이동이 없어 diff는 작다. 그러나 publishing, processing, pipeline의
경계가 디렉터리와 import 방향에 드러나지 않고 Coordinator의 넓은 책임도
그대로 남는다. 새 상태나 복구 정책이 추가될수록 같은 문제가 반복된다.

### 내부 폴더만 나누고 Coordinator 구현은 유지

탐색성은 개선되고 변경 위험은 가장 낮다. 반면 네트워크 상태 머신이 React
effect에 남아 전송 fallback 테스트와 AppState orchestration 테스트를
분리할 수 없다.

### 내부 책임 폴더와 순수 AI job monitor를 함께 도입

파일 이동과 명칭 변경 범위는 더 크지만, lifecycle 정책과 전송 구현 경계가
코드 구조에 드러난다. Monitor를 React render 없이 입력·출력 기준으로 검증할
수 있고 transport 교체도 Coordinator 변경 없이 처리할 수 있다.

별도의 `entity`나 독립 `feature`로 분리하는 안은 선택하지 않았다. AI job
관찰은 현재 피드 생성 use case에서만 시작되고 표시되므로 재사용 가능한
도메인 객체나 독립 사용자 기능으로 승격할 근거가 없다.

## Reason

선택한 구조는 상태 소유권을 바꾸지 않으면서 각 코드의 변경 이유를
분리한다.

- Form은 React Hook Form·Zod 경계와 명령 준비만 책임진다.
- Publishing store와 Coordinator는 생성 upload·수정 요청을 책임진다.
- Processing store는 서버 작업, 관찰 전송, 목록 동기화의 현재 상태를
  보존한다.
- AI job monitor는 API client를 이용해 서버 작업을 관찰하지만 상태를 직접
  소유하지 않는다.
- Root Coordinator는 App lifecycle과 monitor/store/cache를 조합한다.
- Pipeline 모듈은 두 store를 함께 판단해야 하는 전역 잠금과 완료 feedback
  정책만 가진다.

전송 장애는 `monitoringState`만 변경하고 서버 작업을 `failed`로 만들지
않는다. SSE가 실패하면 status polling으로 전환하며, background 전환으로
인한 abort도 비즈니스 실패가 아니다. `jobId`가 일치하는 update만 store에
적용하는 기존 guard를 유지해 이전 비동기 작업이 현재 lifecycle을 덮지
못하게 한다.

AI 완료 후 목록 갱신은 `processingPhase === "completed"`이면서
`feedListSyncState === "idle"`인 경우를 관찰하는 Coordinator effect 한 곳이
소유한다. Monitor는 cache를 모르고, terminal 처리 함수도 직접 목록을
갱신하지 않는다. 따라서 foreground 복구로 완료 상태를 다시 확인해도 같은
정책으로 목록을 동기화한다.

외부 라이브러리와 프로젝트 domain의 경계는 `api/feed-ai-job-client`다.
Axios Status GET과 Expo SDK 56 `expo/fetch` SSE 구현은 이 경계에 남기고,
monitor는 transport 함수의 결과만 조합한다. 향후 SSE 구현을 바꿀 때 가장
교체 비용이 큰 인증 헤더·stream parsing은 API client 쪽에 제한된다.

## Trade-off

얻는 것:

- 파일 경로와 상태 필드만으로 publishing, processing, cache sync 책임 구분
- Coordinator에서 전송 상태 머신을 제거해 App lifecycle 정책 가독성 향상
- SSE terminal 처리와 polling fallback을 React 없이 검증 가능한 경계
- transport 장애와 서버 AI 실패를 혼동하지 않는 명시적인 상태 모델
- 기존 단일 작업 guard와 foreground 복구 정책 유지

포기하거나 부담하는 것:

- 하나의 feature 안에서 import 경로가 한 단계 깊어진다.
- 기존 내부 타입과 store action을 사용하는 모든 코드와 테스트의 이름을
  함께 변경해야 한다.
- Monitor는 callback interface를 가지므로 단순한 effect 내부 함수보다
  처음 읽을 코드가 하나 늘어난다.
- Processing store가 비즈니스 상태, 관찰 상태, 목록 동기화 상태를 함께
  보존한다. 세 상태가 하나의 사용자 표시 lifecycle을 이루므로 이번에는
  store를 더 분리하지 않는다.

## Result

- `save-feed/model`이 `form`, `publishing`, `processing`, `pipeline`으로
  구분됐다.
- publishing task와 AI processing lifecycle의 필드 및 store action이 각
  역할을 직접 표현하도록 변경됐다.
- `FeedProcessingCoordinator`는 AppState, store 반영, 완료 후 cache
  동기화만 조율한다.
- `feed-ai-job-monitor`가 최초 status 확인, SSE와 polling fallback을
  담당하며 terminal 결과 또는 abort를 반환한다.
- SSE가 terminal event 없이 실패할 때 polling으로 완료를 확인하는 흐름과
  SSE terminal event가 polling 없이 완료되는 흐름을 단위 테스트로
  검증한다.
- 서버 status 값, 진행률 보간 규칙, 단일 활성 게시 정책과 사용자 UI 문구는
  변경하지 않았다.
