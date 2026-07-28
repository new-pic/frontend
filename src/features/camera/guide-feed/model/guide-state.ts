import { resolveFeedCameraAspectRatio } from "../../capture-photo/lib/feed-camera-aspect-ratio";
import type { CoordinateSize, DWPoseSourcePose } from "../../pose-matching";
import type {
  ActiveCameraGuide,
  CameraGuideMask,
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
      type: "MASK_READY";
      requestId: number;
      selection: GuideFeedSelection;
      mask: CameraGuideMask;
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
    state.requestId === requestId &&
    state.selected?.feedId === selection.feedId
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
    mask: null,
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
      if (
        !isCurrentSelection(
          state,
          action.requestId,
          action.selection,
        )
      ) {
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
          cameraAspectRatio: resolveFeedCameraAspectRatio(
            action.sourceSize,
          ),
        },
      };
    }
    case "MASK_READY": {
      if (
        !isCurrentSelection(
          state,
          action.requestId,
          action.selection,
        )
      ) {
        return state;
      }

      const active = upsertActiveGuide(
        state,
        action.selection,
        action.mask.sourceSize,
      );
      return {
        ...state,
        active: {
          ...active,
          mask: action.mask,
        },
      };
    }
    case "TARGET_READY": {
      if (
        !isCurrentSelection(
          state,
          action.requestId,
          action.selection,
        )
      ) {
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
          cameraAspectRatio: resolveFeedCameraAspectRatio(
            action.sourceSize,
          ),
          target: {
            sourceSize: action.sourceSize,
            sourcePoses: action.sourcePoses,
          },
        },
      };
    }
  }
}
