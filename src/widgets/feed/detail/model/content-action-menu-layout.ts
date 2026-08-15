export const CONTENT_ACTION_MENU_EDGE_INSET = 12;
export const CONTENT_ACTION_MENU_TRIGGER_GAP = 4;

interface GetContentActionMenuTopParams {
  triggerY: number;
  triggerHeight: number;
  menuHeight: number;
  windowHeight: number;
}

export function getContentActionMenuTop({
  triggerY,
  triggerHeight,
  menuHeight,
  windowHeight,
}: GetContentActionMenuTopParams) {
  const topBelowTrigger =
    triggerY + triggerHeight + CONTENT_ACTION_MENU_TRIGGER_GAP;
  const maximumTop = Math.max(
    CONTENT_ACTION_MENU_EDGE_INSET,
    windowHeight - CONTENT_ACTION_MENU_EDGE_INSET - menuHeight,
  );
  const hasSpaceBelow = topBelowTrigger <= maximumTop;
  const preferredTop = hasSpaceBelow
    ? topBelowTrigger
    : triggerY - CONTENT_ACTION_MENU_TRIGGER_GAP - menuHeight;

  return Math.min(
    maximumTop,
    Math.max(CONTENT_ACTION_MENU_EDGE_INSET, preferredTop),
  );
}
