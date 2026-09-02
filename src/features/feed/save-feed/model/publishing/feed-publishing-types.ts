import type { StagedUploadFile } from "@shared/lib";

/** 서버 게시 요청을 시작하기 전에 보존하는 피드 생성 명령입니다. */
export interface CreateFeedPublishingCommand {
  /** 생성과 수정 명령을 구분하는 판별자입니다. */
  kind: "CREATE";
  /** 화면 이동 뒤에도 업로드할 수 있도록 임시 저장한 이미지입니다. */
  image: StagedUploadFile;
  /** 사용자가 입력한 피드 설명입니다. */
  description: string;
  /** 사용자가 선택한 태그 목록입니다. */
  tags: string[];
}

/** 기존 피드에 적용할 수정 명령입니다. */
export interface UpdateFeedPublishingCommand {
  /** 생성과 수정 명령을 구분하는 판별자입니다. */
  kind: "UPDATE";
  /** 수정할 피드의 식별자입니다. */
  feedId: string;
  /** 사용자가 수정한 피드 설명입니다. */
  description: string;
  /** 사용자가 수정한 태그 목록입니다. */
  tags: string[];
}

/** 루트 publishing lifecycle이 실행할 수 있는 피드 저장 명령입니다. */
export type FeedPublishingCommand =
  CreateFeedPublishingCommand | UpdateFeedPublishingCommand;

/**
 * 클라이언트가 직접 수행하는 피드 게시 단계입니다.
 * 생성의 AI 처리는 별도의 `FeedAiProcessingLifecycle`로 관리합니다.
 * - `queued`: 루트 Coordinator가 명령을 실행하기 전
 * - `uploading`: 생성 이미지와 폼 데이터 업로드 중
 * - `updating`: 기존 피드 수정 요청 중
 * - `completed`: 클라이언트 게시 요청 완료
 * - `failed`: 요청 실패 후 재시도 또는 닫기 대기 중
 */
export type FeedPublishingPhase =
  "queued" | "uploading" | "updating" | "completed" | "failed";

/** 앱 화면과 독립적으로 실행되는 단일 피드 게시 작업입니다. */
export interface FeedPublishingTask {
  /** 오래된 비동기 결과가 현재 작업을 덮어쓰지 못하게 하는 클라이언트 식별자입니다. */
  publishingTaskId: string;
  /** 서버에 전달할 생성 또는 수정 명령입니다. */
  command: FeedPublishingCommand;
  /** 현재 publishing lifecycle 단계입니다. */
  publishingPhase: FeedPublishingPhase;
  /** 게시 실패 시 사용자에게 표시할 정규화된 메시지입니다. */
  failureMessage?: string;
}
