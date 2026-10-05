import { MAX_POSE_COUNT } from "./pose-detection/pose-detection-config";

export const POSE_GUIDE_PERSON_LIMIT_NOTICE_DURATION_MS = 5000;

const POSE_GUIDE_PERSON_LIMIT_MESSAGE =
  "촬영 가이드는 최대 4명까지 인식해요. 사진에 더 많은 사람이 있다면 일부 인물은 가이드에서 제외될 수 있어요.";

interface PoseGuidePersonLimitNoticeInput {
  targetPersonCount: number;
  selectionRequestId: number;
  notifiedSelectionRequestId: number | null;
}

export function getPoseGuidePersonLimitNotice({
  targetPersonCount,
  selectionRequestId,
  notifiedSelectionRequestId,
}: PoseGuidePersonLimitNoticeInput) {
  return targetPersonCount >= MAX_POSE_COUNT &&
    selectionRequestId !== notifiedSelectionRequestId
    ? POSE_GUIDE_PERSON_LIMIT_MESSAGE
    : null;
}
