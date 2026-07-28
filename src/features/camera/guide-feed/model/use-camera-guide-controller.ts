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
import { useLivePoseDetection } from "../../pose-detection";
import {
  adaptDWPoseResult,
  matchPoseScene,
  prepareLivePoses,
  projectDWPosePoseToCapture,
  readExpoFeedReferenceImageSize,
} from "../../pose-matching";
import { adaptFeedBackgroundRemoval } from "../lib/feed-guide-mask-adapter";
import {
  cameraGuideReducer,
  INITIAL_CAMERA_GUIDE_STATE,
} from "./guide-state";
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
  const [maskPreparationError, setMaskPreparationError] = useState<
    string | null
  >(null);
  const [targetPreparationError, setTargetPreparationError] =
    useState<string | null>(null);
  const [maskRenderError, setMaskRenderError] = useState<string | null>(
    null,
  );
  const requestIdRef = useRef(0);

  const selectedFeedId = state.selected?.feedId;
  const poseQuery = feedPoseQuery.useReadFeedPose({
    feedId: selectedFeedId,
  });
  const maskQuery = feedPoseQuery.useReadFeedBackgroundRemoval({
    feedId: selectedFeedId,
  });

  const selectGuide = useCallback((selection: GuideFeedSelection) => {
    const requestId = ++requestIdRef.current;
    setReferenceError(null);
    setMaskPreparationError(null);
    setTargetPreparationError(null);
    setMaskRenderError(null);
    dispatch({ type: "SELECT", requestId, selection });
  }, []);

  const clearGuide = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setReferenceError(null);
    setMaskPreparationError(null);
    setTargetPreparationError(null);
    setMaskRenderError(null);
    dispatch({ type: "CLEAR", requestId });
  }, []);

  const retrySelectedGuide = useCallback(() => {
    setReferenceError(null);
    setMaskPreparationError(null);
    setTargetPreparationError(null);
    setMaskRenderError(null);
    setRetryVersion((current) => current + 1);
    void poseQuery.refetch();
    void maskQuery.refetch();
  }, [maskQuery, poseQuery]);

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
    const queryResult = maskQuery.data;
    if (
      !selection ||
      !queryResult ||
      queryResult.feedId !== selection.feedId
    ) {
      return;
    }

    const requestId = state.requestId;
    let cancelled = false;
    void (async () => {
      try {
        const rawMask = adaptFeedBackgroundRemoval(
          queryResult.response,
        );
        const sourceSize =
          rawMask.sourceSize ??
          (await readExpoFeedReferenceImageSize(rawMask.imageUrl));
        if (cancelled || requestIdRef.current !== requestId) return;

        setMaskPreparationError(null);
        dispatch({
          type: "MASK_READY",
          requestId,
          selection,
          mask: {
            imageUrl: rawMask.imageUrl,
            sourceSize,
          },
        });
      } catch (error) {
        if (cancelled || requestIdRef.current !== requestId) return;
        setMaskPreparationError(getErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [maskQuery.data, retryVersion, state.requestId, state.selected]);

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

  useEffect(() => {
    if (!state.active?.mask) {
      setMaskRenderError(null);
    }
  }, [state.active?.mask]);

  const canProjectToCurrentCapture =
    geometry !== null &&
    state.active !== null &&
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

  const livePoseDetection = useLivePoseDetection({
    enabled:
      cameraActive &&
      canProjectToCurrentCapture &&
      targetPoses.length > 0,
  });
  const currentPoses = useMemo(() => {
    if (
      !canProjectToCurrentCapture ||
      !geometry ||
      !livePoseDetection.frame
    ) {
      return [];
    }

    return prepareLivePoses(livePoseDetection.frame, {
      captureSize: geometry.captureSize,
      mirrorX:
        livePoseDetection.frame.sourceFrame.isMirrored,
      captureResizeMode: "cover",
    });
  }, [
    canProjectToCurrentCapture,
    geometry,
    livePoseDetection.frame,
  ]);
  const matchResult = useMemo(
    () =>
      targetPoses.length > 0
        ? matchPoseScene(targetPoses, currentPoses)
        : null,
    [currentPoses, targetPoses],
  );

  const errors: CameraGuideErrors = {
    reference: referenceError,
    mask:
      maskRenderError ??
      maskPreparationError ??
      (maskQuery.error ? getErrorMessage(maskQuery.error) : null),
    target:
      targetPreparationError ??
      (poseQuery.error ? getErrorMessage(poseQuery.error) : null),
  };
  const matching: CameraGuideMatching = {
    targetPoses,
    currentPoses,
    result: matchResult,
  };

  return {
    selectedGuide: state.selected,
    activeGuide: state.active,
    isPreparing:
      state.selected !== null &&
      state.active?.selection.feedId !== state.selected.feedId,
    isMaskLoading: Boolean(state.selected) && maskQuery.isPending,
    isTargetLoading: Boolean(state.selected) && poseQuery.isPending,
    errors,
    matching,
    poseDetection: livePoseDetection,
    selectGuide,
    clearGuide,
    retrySelectedGuide,
    renderVersion: retryVersion,
    reportMaskRenderError: () =>
      setMaskRenderError("Mask 이미지를 표시하지 못했습니다."),
  };
}
