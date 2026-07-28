import type {
  FeedbackPersonPosition,
  PoseGuideFeedbackDescriptor,
} from "../model";

const PERSON_POSITION_LABELS: Record<
  FeedbackPersonPosition,
  string
> = {
  LEFT: "왼쪽 사람",
  CENTER: "가운데 사람",
  RIGHT: "오른쪽 사람",
};

function getPersonCountMismatchMessage(
  targetPersonCount: number,
  livePersonCount: number,
) {
  const difference = targetPersonCount - livePersonCount;
  if (difference > 0) {
    return difference === 1
      ? "한 명 더 화면에 들어와 주세요"
      : `${difference}명 더 화면에 들어와 주세요`;
  }
  if (difference < 0) {
    return `화면에 ${targetPersonCount}명만 나오도록 조정해 주세요`;
  }
  return "화면 속 인원 위치를 다시 맞춰 주세요";
}

function getFeedbackInstruction({
  reason,
  targetPersonCount,
  livePersonCount,
}: PoseGuideFeedbackDescriptor) {
  switch (reason) {
    case "NO_PERSON":
      return "카메라 화면 안에 사람이 보이도록 서 주세요";
    case "PERSON_COUNT_MISMATCH":
      return getPersonCountMismatchMessage(
        targetPersonCount,
        livePersonCount,
      );
    case "MOVE_LEFT":
      return "조금 왼쪽으로 이동해 주세요";
    case "MOVE_RIGHT":
      return "조금 오른쪽으로 이동해 주세요";
    case "MOVE_UP":
      return "조금 위로 이동해 주세요";
    case "MOVE_DOWN":
      return "조금 아래로 이동해 주세요";
    case "MOVE_CLOSER":
      return "조금 더 가까이 와 주세요";
    case "MOVE_FARTHER":
      return "조금 뒤로 이동해 주세요";
    case "ADJUST_LEFT_ARM":
      return "왼팔 위치를 맞춰 주세요";
    case "ADJUST_RIGHT_ARM":
      return "오른팔 위치를 맞춰 주세요";
    case "ADJUST_LEFT_LEG":
      return "왼쪽 다리 위치를 맞춰 주세요";
    case "ADJUST_RIGHT_LEG":
      return "오른쪽 다리 위치를 맞춰 주세요";
    case "ADJUST_TORSO":
      return "몸의 방향과 자세를 맞춰 주세요";
    case "LOW_CONFIDENCE":
      return "전신이 잘 보이도록 화면 안에 서 주세요";
    case "ALIGNED":
      return null;
  }
}

export function mapPoseFeedbackMessage(
  feedback: PoseGuideFeedbackDescriptor | null,
) {
  if (!feedback) return null;

  const instruction = getFeedbackInstruction(feedback);
  if (!instruction) return null;

  return feedback.personPosition
    ? `${PERSON_POSITION_LABELS[feedback.personPosition]}이 ${instruction}`
    : instruction;
}

