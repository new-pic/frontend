import type {
  FeedbackPersonPosition,
  PoseGuideFeedbackDescriptor,
} from "../model";
import type { TFunction } from "i18next";

const PERSON_POSITION_KEYS: Record<
  FeedbackPersonPosition,
  | "guide.personPosition.left"
  | "guide.personPosition.center"
  | "guide.personPosition.right"
> = {
  LEFT: "guide.personPosition.left",
  CENTER: "guide.personPosition.center",
  RIGHT: "guide.personPosition.right",
};

function getPersonCountMismatchMessage(
  t: TFunction<"translation">,
  targetPersonCount: number,
  livePersonCount: number,
) {
  const difference = targetPersonCount - livePersonCount;
  if (difference > 0) {
    return t("guide.feedback.enterFrame");
  }
  if (difference < 0) {
    return t("guide.feedback.personCount", { count: targetPersonCount });
  }
  return t("guide.feedback.rearrangePeople");
}

function getFeedbackInstruction(
  { reason, targetPersonCount, livePersonCount }: PoseGuideFeedbackDescriptor,
  t: TFunction<"translation">,
) {
  switch (reason) {
    case "NO_PERSON":
      return t("guide.feedback.personVisible");
    case "PERSON_COUNT_MISMATCH":
      return getPersonCountMismatchMessage(
        t,
        targetPersonCount,
        livePersonCount,
      );
    case "MOVE_LEFT":
      return t("guide.feedback.moveLeft");
    case "MOVE_RIGHT":
      return t("guide.feedback.moveRight");
    case "MOVE_UP":
      return t("guide.feedback.moveUp");
    case "MOVE_DOWN":
      return t("guide.feedback.moveDown");
    case "MOVE_CLOSER":
      return t("guide.feedback.moveCloser");
    case "MOVE_FARTHER":
      return t("guide.feedback.moveFarther");
    case "ADJUST_LEFT_ARM":
      return t("guide.feedback.alignLeftArm");
    case "ADJUST_RIGHT_ARM":
      return t("guide.feedback.alignRightArm");
    case "ADJUST_LEFT_LEG":
      return t("guide.feedback.alignLeftLeg");
    case "ADJUST_RIGHT_LEG":
      return t("guide.feedback.alignRightLeg");
    case "ADJUST_TORSO":
      return t("guide.feedback.alignTorso");
    case "LOW_CONFIDENCE":
      return t("guide.feedback.showFullBody");
    case "ALIGNED":
      return null;
  }
}

export function mapPoseFeedbackMessage(
  feedback: PoseGuideFeedbackDescriptor | null,
  t: TFunction<"translation">,
) {
  if (!feedback) return null;

  const instruction = getFeedbackInstruction(feedback, t);
  if (!instruction) return null;

  return feedback.personPosition
    ? t("guide.feedback.positioned", {
        person: t(PERSON_POSITION_KEYS[feedback.personPosition]),
        instruction,
      })
    : instruction;
}
