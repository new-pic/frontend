/**
 * 서버 AI 작업의 비즈니스 처리 상태입니다.
 * - `processing`: 서버 작업이 대기 또는 실행 중
 * - `completed`: 서버 작업 완료 신호를 확인함
 * - `failed`: 서버 작업 실패 신호를 확인함
 */
export type FeedProcessingPhase = "processing" | "completed" | "failed";

/**
 * AI 작업을 관찰하는 전송 상태입니다.
 * - `idle`: 아직 관찰하지 않거나 terminal 상태로 관찰을 종료함
 * - `connecting`: SSE 연결 시도 중
 * - `streaming`: SSE로 상태 수신 중
 * - `polling`: SSE 대신 status GET을 주기적으로 호출 중
 * - `disconnected`: 전송 오류 후 재시도 대기 중
 */
export type FeedProcessingMonitoringState =
  "idle" | "connecting" | "streaming" | "polling" | "disconnected";

/**
 * AI 처리 완료 결과를 피드 목록 cache에 동기화하는 상태입니다.
 * - `idle`: 동기화 시작 전
 * - `pending`: 목록 reset/refetch 진행 중
 * - `succeeded`: 최신 서버 목록 반영 완료
 * - `failed`: AI 처리는 끝났지만 목록 동기화 실패
 */
export type FeedListSyncState = "idle" | "pending" | "succeeded" | "failed";

/** 생성 요청 이후 서버에서 수행되는 AI 처리 lifecycle입니다. */
export interface FeedAiProcessingLifecycle {
  /** 서버 AI 작업 식별자입니다. */
  jobId: string;
  /** AI 처리 결과가 반영될 피드 식별자입니다. */
  feedId: string;
  /** 서버 AI 작업의 비즈니스 처리 상태입니다. */
  processingPhase: FeedProcessingPhase;
  /** 서버가 마지막으로 보고한 진행률입니다. */
  serverProgressPercent: number;
  /** 서버가 마지막으로 추정한 남은 시간입니다. */
  estimatedRemainingSeconds?: number;
  /** 진행률 snapshot을 수신한 클라이언트 시각입니다. */
  progressSnapshotReceivedAtMs?: number;
  /** SSE와 polling 중 현재 사용 중인 관찰 방식입니다. */
  monitoringState: FeedProcessingMonitoringState;
  /** 처리 완료 후 피드 목록 cache 동기화 상태입니다. */
  feedListSyncState: FeedListSyncState;
}
