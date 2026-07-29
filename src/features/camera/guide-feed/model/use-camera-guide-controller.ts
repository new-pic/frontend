import { feedPoseQuery } from "@entities/feed";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CameraRuntimeGeometry } from "../../capture-photo";
import {
  type DetectedPoseFrame,
  useLivePoseDetection,
} from "../../pose-detection";
import {
  adaptDWPoseResult,
  matchPoseScene,
  prepareLivePoses,
  projectDWPosePoseToCapture,
  readExpoFeedReferenceImageSize,
} from "../../pose-matching";
import { adaptFeedBackgroundRemoval } from "../lib/feed-guide-contour-adapter";
import {
  cameraGuideReducer,
  INITIAL_CAMERA_GUIDE_STATE,
} from "./guide-state";
import { usePoseGuideAlignment } from "./use-pose-guide-alignment";
import type {
  CameraGuideErrors,
  CameraGuideMatching,
  GuideFeedSelection,
} from "./types";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "촬영 가이드 데이터를 불러오지 못했습니다.";
}

interface UseCameraGuideControllerOptions {
  cameraActive: boolean;
  geometry: CameraRuntimeGeometry | null;
}

export function useCameraGuideController({
  cameraActive,
  geometry,
}: UseCameraGuideControllerOptions) {
  const [state, dispatch] = useReducer(
    cameraGuideReducer,
    INITIAL_CAMERA_GUIDE_STATE,
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const [referenceError, setReferenceError] = useState<string | null>(
    null,
  );
  const [outlinePreparationError, setOutlinePreparationError] = useState<
    string | null
  >(null);
  const [targetPreparationError, setTargetPreparationError] =
    useState<string | null>(null);
  const requestIdRef = useRef(0);

  const selectedFeedId = state.selected?.feedId;
  const poseQuery = feedPoseQuery.useReadFeedPose({
    feedId: selectedFeedId,
  });
  const outlineQuery = feedPoseQuery.useReadFeedBackgroundRemoval({
    feedId: selectedFeedId,
  });

  const selectGuide = useCallback((selection: GuideFeedSelection) => {
    const requestId = ++requestIdRef.current;
    setReferenceError(null);
    setOutlinePreparationError(null);
    setTargetPreparationError(null);
    dispatch({ type: "SELECT", requestId, selection });
  }, []);

  const clearGuide = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setReferenceError(null);
    setOutlinePreparationError(null);
    setTargetPreparationError(null);
    dispatch({ type: "CLEAR", requestId });
  }, []);

  const retrySelectedGuide = useCallback(() => {
    setReferenceError(null);
    setOutlinePreparationError(null);
    setTargetPreparationError(null);
    setRetryVersion((current) => current + 1);
    void poseQuery.refetch();
    void outlineQuery.refetch();
  }, [outlineQuery, poseQuery]);

  useEffect(() => {
    const selection = state.selected;
    if (!selection) return;

    const requestId = state.requestId;
    let cancelled = false;
    void readExpoFeedReferenceImageSize(selection.detailImageUrl)
      .then((sourceSize) => {
        if (cancelled || requestIdRef.current !== requestId) return;
        setReferenceError(null);
        dispatch({
          type: "REFERENCE_READY",
          requestId,
          selection,
          sourceSize,
        });
      })
      .catch((error: unknown) => {
        if (cancelled || requestIdRef.current !== requestId) return;
        setReferenceError(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [retryVersion, state.requestId, state.selected]);

  useEffect(() => {
    const selection = state.selected;
    const queryResult = outlineQuery.data;
    if (
      !selection ||
      !queryResult ||
      queryResult.feedId !== selection.feedId
    ) {
      return;
    }

    const requestId = state.requestId;
    try {
      const outline = adaptFeedBackgroundRemoval(
        queryResult.response,
      );
      if (requestIdRef.current !== requestId) return;

      setOutlinePreparationError(null);
      dispatch({
        type: "OUTLINE_READY",
        requestId,
        selection,
        outline,
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setOutlinePreparationError(getErrorMessage(error));
    }
  }, [
    outlineQuery.data,
    retryVersion,
    state.requestId,
    state.selected,
  ]);

  useEffect(() => {
    const selection = state.selected;
    const response = poseQuery.data;
    if (!selection || !response) return;

    const requestId = state.requestId;
    let cancelled = false;
    void (async () => {
      try {
        const [sourceSize, sourcePoses] = await Promise.all([
          readExpoFeedReferenceImageSize(response.imageUrl),
          Promise.resolve(
            adaptDWPoseResult({
              landmarks: response.poseLandmarks,
              analysis: response.poseAnalysis,
            }),
          ),
        ]);
        if (
          cancelled ||
          requestIdRef.current !== requestId ||
          response.feedId !== selection.feedId
        ) {
          return;
        }

        setTargetPreparationError(null);
        dispatch({
          type: "TARGET_READY",
          requestId,
          selection,
          sourceSize,
          sourcePoses,
        });
      } catch (error) {
        if (cancelled || requestIdRef.current !== requestId) return;
        setTargetPreparationError(getErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [poseQuery.data, retryVersion, state.requestId, state.selected]);

  const canProjectToCurrentCapture =
    geometry !== null &&
    state.active !== null &&
    state.active.selection.feedId === selectedFeedId &&
    geometry.aspectRatio === state.active.cameraAspectRatio;
  const targetPoses = useMemo(() => {
    if (
      !canProjectToCurrentCapture ||
      !geometry ||
      !state.active?.target
    ) {
      return [];
    }

    const { target } = state.active;
    return target.sourcePoses.map((pose) =>
      projectDWPosePoseToCapture(pose, {
        sourceSize: target.sourceSize,
        captureSize: geometry.captureSize,
        mirrorX: false,
        captureResizeMode: "cover",
      }),
    );
  }, [canProjectToCurrentCapture, geometry, state.active]);

  const targetReady =
    canProjectToCurrentCapture && targetPoses.length > 0;
  const { snapshot: alignment, observe: observeAlignment } =
    usePoseGuideAlignment({
      guideId: selectedFeedId ?? null,
      targetReady,
    });
  const matchingInputRef = useRef<{
    geometry: CameraRuntimeGeometry;
    targetPoses: typeof targetPoses;
  } | null>(null);
  matchingInputRef.current =
    targetReady && geometry
      ? {
          geometry,
          targetPoses,
        }
      : null;
  const latestMatchingRef = useRef<CameraGuideMatching>({
    targetPoses: [],
    currentPoses: [],
    result: null,
  });
  if (
    latestMatchingRef.current.targetPoses !== targetPoses &&
    matchingInputRef.current === null
  ) {
    latestMatchingRef.current = {
      targetPoses,
      currentPoses: [],
      result: null,
    };
  }
  const handlePoseFrame = useCallback(
    (frame: DetectedPoseFrame) => {
      const matchingInput = matchingInputRef.current;
      if (!matchingInput) return;

      const currentPoses = prepareLivePoses(frame, {
        captureSize: matchingInput.geometry.captureSize,
        mirrorX: frame.sourceFrame.isMirrored,
        captureResizeMode: "cover",
      });
      const result = matchPoseScene(
        matchingInput.targetPoses,
        currentPoses,
      );
      latestMatchingRef.current = {
        targetPoses: matchingInput.targetPoses,
        currentPoses,
        result,
      };
      observeAlignment({
        result,
        targetPersonCount: matchingInput.targetPoses.length,
        livePersonCount: currentPoses.length,
      });
    },
    [observeAlignment],
  );
  const livePoseDetection = useLivePoseDetection({
    enabled:
      cameraActive &&
      canProjectToCurrentCapture &&
      Boolean(state.active?.outline),
    targetPersonCount: targetReady
      ? targetPoses.length
      : undefined,
    exposeFrame: false,
    onFrame: handlePoseFrame,
  });

  const errors: CameraGuideErrors = {
    reference: referenceError,
    outline:
      outlinePreparationError ??
      (outlineQuery.error
        ? getErrorMessage(outlineQuery.error)
        : null),
    target:
      targetPreparationError ??
      (poseQuery.error ? getErrorMessage(poseQuery.error) : null),
  };
  const latestMatching = latestMatchingRef.current;
  const matching: CameraGuideMatching =
    latestMatching.targetPoses === targetPoses
      ? latestMatching
      : {
          targetPoses,
          currentPoses: [],
          result: null,
        };
  return {
    selectedGuide: state.selected,
    activeGuide: state.active,
    presentedGuide:
      state.active?.selection.feedId === selectedFeedId
        ? state.active
        : null,
    isPreparing:
      state.selected !== null &&
      state.active?.selection.feedId !== state.selected.feedId,
    isOutlineLoading:
      Boolean(state.selected) && outlineQuery.isPending,
    isTargetLoading: Boolean(state.selected) && poseQuery.isPending,
    errors,
    matching,
    alignment,
    poseDetection: livePoseDetection,
    selectGuide,
    clearGuide,
    retrySelectedGuide,
  };
}
