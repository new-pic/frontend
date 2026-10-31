import { MAX_POSE_COUNT } from "./pose-detection/pose-detection-config";

export const POSE_GUIDE_PERSON_LIMIT_NOTICE_DURATION_MS = 5000;

interface PoseGuidePersonLimitNoticeInput {
  targetPersonCount: number;
  selectionRequestId: number;
  notifiedSelectionRequestId: number | null;
}

export function shouldShowPoseGuidePersonLimitNotice({
  targetPersonCount,
  selectionRequestId,
  notifiedSelectionRequestId,
}: PoseGuidePersonLimitNoticeInput) {
  return (
    targetPersonCount >= MAX_POSE_COUNT &&
    selectionRequestId !== notifiedSelectionRequestId
  );
}
