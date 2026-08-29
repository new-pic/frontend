import { resolveFeedCameraAspectRatio } from "../lib/feed-camera-aspect-ratio";
import type { CoordinateSize, DWPoseSourcePose } from "../lib/pose-matching";
import type {
  ActiveCameraGuide,
  CameraGuideOutline,
  GuideFeedSelection,
} from "./types";

export interface CameraGuideState {
  requestId: number;
  selected: GuideFeedSelection | null;
  active: ActiveCameraGuide | null;
}

export type CameraGuideAction =
  | {
      type: "SELECT";
      requestId: number;
      selection: GuideFeedSelection;
    }
  | {
      type: "CLEAR";
      requestId: number;
    }
  | {
      type: "REFERENCE_READY";
      requestId: number;
      selection: GuideFeedSelection;
      sourceSize: CoordinateSize;
    }
  | {
      type: "OUTLINE_READY";
      requestId: number;
      selection: GuideFeedSelection;
      outline: CameraGuideOutline;
    }
  | {
      type: "TARGET_READY";
      requestId: number;
      selection: GuideFeedSelection;
      sourceSize: CoordinateSize;
      sourcePoses: DWPoseSourcePose[];
    };

export const INITIAL_CAMERA_GUIDE_STATE: CameraGuideState = {
  requestId: 0,
  selected: null,
  active: null,
};

function isCurrentSelection(
  state: CameraGuideState,
  requestId: number,
  selection: GuideFeedSelection,
) {
  return (
    state.requestId === requestId && state.selected?.feedId === selection.feedId
  );
}

function upsertActiveGuide(
  state: CameraGuideState,
  selection: GuideFeedSelection,
  sourceSize: CoordinateSize,
): ActiveCameraGuide {
  if (state.active?.selection.feedId === selection.feedId) {
    return {
      ...state.active,
      selection,
    };
  }

  return {
    selection,
    referenceSize: sourceSize,
    cameraAspectRatio: resolveFeedCameraAspectRatio(sourceSize),
    outline: null,
    target: null,
  };
}

export function cameraGuideReducer(
  state: CameraGuideState,
  action: CameraGuideAction,
): CameraGuideState {
  switch (action.type) {
    case "SELECT":
      return {
        ...state,
        requestId: action.requestId,
        selected: action.selection,
      };
    case "CLEAR":
      return {
        requestId: action.requestId,
        selected: null,
        active: null,
      };
    case "REFERENCE_READY": {
      if (!isCurrentSelection(state, action.requestId, action.selection)) {
        return state;
      }

      const active = upsertActiveGuide(
        state,
        action.selection,
        action.sourceSize,
      );
      return {
        ...state,
        active: {
          ...active,
          referenceSize: action.sourceSize,
          cameraAspectRatio: resolveFeedCameraAspectRatio(action.sourceSize),
        },
      };
    }
    case "OUTLINE_READY": {
      if (!isCurrentSelection(state, action.requestId, action.selection)) {
        return state;
      }

      const active = upsertActiveGuide(
        state,
        action.selection,
        action.outline.sourceSize,
      );
      return {
        ...state,
        active: {
          ...active,
          outline: action.outline,
        },
      };
    }
    case "TARGET_READY": {
      if (!isCurrentSelection(state, action.requestId, action.selection)) {
        return state;
      }

      const active = upsertActiveGuide(
        state,
        action.selection,
        action.sourceSize,
      );
      return {
        ...state,
        active: {
          ...active,
          referenceSize: action.sourceSize,
          cameraAspectRatio: resolveFeedCameraAspectRatio(action.sourceSize),
          target: {
            sourceSize: action.sourceSize,
            sourcePoses: action.sourcePoses,
          },
        },
      };
    }
  }
}
