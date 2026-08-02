package com.margelo.nitro.newpic.visioncamerapose

import android.os.SystemClock
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import com.newpic.visioncamerapose.OwnedPoseInput
import com.newpic.visioncamerapose.PoseFrameInputAdapter
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.min

class HybridVisionCameraPoseFrameSink :
  HybridVisionCameraPoseFrameSinkSpec() {
  private val stateLock = Any()
  private val deliveryLock = Any()
  private val inferenceExecutor =
    Executors.newSingleThreadExecutor { runnable ->
      Thread(runnable, "NewpicPoseLandmarker")
    }
  private val isBusy = AtomicBoolean(false)

  private var options = ValidatedPoseOptions.defaults()
  private var poseLandmarker: PoseLandmarker? = null
  private var initializingGeneration: Long? = null
  private var acceptingFrames = false
  private var generation = 0L
  private var lastAcceptedTimestampMs = Long.MIN_VALUE
  private var lastMediaPipeTimestampMs = Long.MIN_VALUE
  private var pendingInput: PendingInput? = null

  private var resultCallback:
    ((NativeDetectedPoseFrame) -> Unit)? = null
  private var errorCallback:
    ((NativePoseDetectionError) -> Unit)? = null
  private var nextSequence = 1L
  private var inFlightSequence: Long? = null
  private var pendingResult: NativeDetectedPoseFrame? = null

  override fun configure(options: NativePoseDetectionOptions) {
    val validated = ValidatedPoseOptions.from(options)
    val shouldRebuild =
      synchronized(stateLock) {
        val changed = this.options != validated
        this.options = validated
        changed &&
          (
            poseLandmarker != null ||
              initializingGeneration != null
          )
      }

    if (shouldRebuild) {
      rebuildDetector()
    } else {
      ensureDetector()
    }
  }

  override fun startAcceptingFrames() {
    synchronized(stateLock) {
      acceptingFrames = true
    }
    ensureDetector()
  }

  override fun stopAcceptingFrames() {
    synchronized(stateLock) {
      acceptingFrames = false
      generation += 1
      lastAcceptedTimestampMs = Long.MIN_VALUE
    }
    clearPendingResults()
  }

  override fun releaseDetector() {
    val detector =
      synchronized(stateLock) {
        acceptingFrames = false
        generation += 1
        initializingGeneration = null
        lastAcceptedTimestampMs = Long.MIN_VALUE
        lastMediaPipeTimestampMs = Long.MIN_VALUE
        poseLandmarker.also {
          poseLandmarker = null
        }
      }
    clearPendingResults()
    inferenceExecutor.execute {
      detector?.close()
      finishPendingInput()
    }
  }

  override fun pushFrame(frame: HybridFrameSpec): Boolean {
    val nativeFrame = frame as? NativeFrame ?: return false
    val image = nativeFrame.image
    val frameTimestampMs =
      nextMediaPipeTimestampMs(
        image.imageInfo.timestamp / NANOSECONDS_PER_MILLISECOND,
      )

    val snapshot =
      synchronized(stateLock) {
        val detector = poseLandmarker ?: return false
        if (!acceptingFrames || isBusy.get()) {
          return false
        }
        val minimumIntervalMs =
          1000.0 / options.maxInferenceFps
        if (
          lastAcceptedTimestampMs != Long.MIN_VALUE &&
          frameTimestampMs - lastAcceptedTimestampMs <
          minimumIntervalMs
        ) {
          return false
        }
        if (!isBusy.compareAndSet(false, true)) {
          return false
        }
        lastAcceptedTimestampMs = frameTimestampMs
        DetectorSnapshot(
          detector = detector,
          generation = generation,
          options = options,
        )
      }

    val input =
      try {
        PoseFrameInputAdapter.copy(
          image = image,
          orientation = frame.orientation,
          isMirrored = frame.isMirrored,
          maxInputLongEdge =
            snapshot.options.maxInputLongEdge,
          timestampMs = frameTimestampMs,
        )
      } catch (error: Throwable) {
        isBusy.set(false)
        emitError("E_POSE_INPUT", error)
        return false
      }

    synchronized(stateLock) {
      pendingInput =
        PendingInput(
          input = input,
          generation = snapshot.generation,
        )
    }
    inferenceExecutor.execute {
      detect(snapshot, input)
    }
    return true
  }

  override fun setResultCallback(
    callback: ((NativeDetectedPoseFrame) -> Unit)?,
  ) {
    synchronized(deliveryLock) {
      resultCallback = callback
      if (callback == null) {
        inFlightSequence = null
        pendingResult = null
      }
    }
  }

  override fun setErrorCallback(
    callback: ((NativePoseDetectionError) -> Unit)?,
  ) {
    synchronized(deliveryLock) {
      errorCallback = callback
    }
  }

  override fun acknowledgeResult(sequence: Double) {
    val delivery =
      synchronized(deliveryLock) {
        if (inFlightSequence != sequence.toLong()) {
          return
        }
        inFlightSequence = null
        val next = pendingResult
        pendingResult = null
        if (next == null || resultCallback == null) {
          null
        } else {
          inFlightSequence = next.sequence.toLong()
          resultCallback to next
        }
      }
    delivery?.let { (callback, result) ->
      invokeResultCallback(callback, result)
    }
  }

  override fun dispose() {
    releaseDetector()
    synchronized(deliveryLock) {
      resultCallback = null
      errorCallback = null
    }
    inferenceExecutor.shutdown()
    super.dispose()
  }

  private fun ensureDetector() {
    val setup =
      synchronized(stateLock) {
        if (
          poseLandmarker != null ||
          initializingGeneration != null
        ) {
          return
        }
        generation += 1
        initializingGeneration = generation
        DetectorSetup(generation, options)
      }
    inferenceExecutor.execute {
      createDetector(setup)
    }
  }

  private fun rebuildDetector() {
    val setup =
      synchronized(stateLock) {
        generation += 1
        initializingGeneration = generation
        val old = poseLandmarker
        poseLandmarker = null
        DetectorSetup(generation, options, old)
      }
    inferenceExecutor.execute {
      createDetector(setup)
    }
  }

  private fun createDetector(setup: DetectorSetup) {
    try {
      setup.previousDetector?.close()
      finishPendingInput()
      val baseOptions =
        BaseOptions.builder()
          .setModelAssetPath(MODEL_ASSET_PATH)
          .build()
      val landmarkerOptions =
        PoseLandmarker.PoseLandmarkerOptions.builder()
          .setBaseOptions(baseOptions)
          .setRunningMode(RunningMode.LIVE_STREAM)
          .setNumPoses(setup.options.numPoses)
          .setMinPoseDetectionConfidence(
            setup.options.minPoseDetectionConfidence,
          )
          .setMinPosePresenceConfidence(
            setup.options.minPosePresenceConfidence,
          )
          .setMinTrackingConfidence(
            setup.options.minTrackingConfidence,
          )
          .setOutputSegmentationMasks(false)
          .setResultListener(::handleResult)
          .setErrorListener(::handleInferenceError)
          .build()
      val detector =
        PoseLandmarker.createFromOptions(
          requireNotNull(NitroModules.applicationContext) {
            "ReactApplicationContext is unavailable."
          }.applicationContext,
          landmarkerOptions,
        )

      val shouldKeep =
        synchronized(stateLock) {
          if (
            initializingGeneration == setup.generation
          ) {
            initializingGeneration = null
          }
          if (generation == setup.generation) {
            poseLandmarker = detector
            true
          } else {
            false
          }
        }
      if (!shouldKeep) {
        detector.close()
        ensureDetectorIfAccepting()
      }
    } catch (error: Throwable) {
      var shouldRetry = false
      synchronized(stateLock) {
        if (
          initializingGeneration == setup.generation
        ) {
          initializingGeneration = null
        }
        if (generation == setup.generation) {
          poseLandmarker = null
          isBusy.set(false)
        } else {
          shouldRetry =
            acceptingFrames &&
              poseLandmarker == null &&
              initializingGeneration == null
        }
      }
      emitError("E_POSE_INITIALIZATION", error)
      if (shouldRetry) {
        ensureDetector()
      }
    }
  }

  private fun detect(
    snapshot: DetectorSnapshot,
    input: OwnedPoseInput,
  ) {
    val isCurrent =
      synchronized(stateLock) {
        generation == snapshot.generation &&
          poseLandmarker === snapshot.detector
      }
    if (!isCurrent) {
      finishInput(input)
      return
    }

    try {
      val mpImage =
        BitmapImageBuilder(input.bitmap).build()
      snapshot.detector.detectAsync(
        mpImage,
        input.timestampMs,
      )
    } catch (error: Throwable) {
      finishInput(input)
      emitError("E_POSE_INFERENCE", error)
    }
  }

  private fun handleResult(
    result: PoseLandmarkerResult,
    inputImage: MPImage,
  ) {
    val pending =
      synchronized(stateLock) {
        pendingInput.also {
          pendingInput = null
        }
      }

    try {
      if (pending == null) {
        return
      }
      val input = pending.input
      val poses =
        result.landmarks().map { landmarks ->
          NativeDetectedPersonPose(
            landmarks =
              landmarks.map { landmark ->
                val visibility =
                  landmark.visibility().orElse(0f)
                val presence =
                  landmark.presence().orElse(0f)
                NativePosePoint(
                  x = landmark.x().toDouble(),
                  y = landmark.y().toDouble(),
                  z = landmark.z().toDouble(),
                  confidence =
                    min(visibility, presence).toDouble(),
                )
              }.toTypedArray(),
          )
        }.toTypedArray()

      val shouldDeliver =
        synchronized(stateLock) {
          acceptingFrames &&
            generation == pending.generation
        }
      if (shouldDeliver) {
        emitResult(
          timestampMs = result.timestampMs(),
          poses = poses,
          input = input,
        )
      }
    } finally {
      inputImage.close()
      pending?.input?.bitmap?.recycle()
      isBusy.set(false)
    }
  }

  private fun handleInferenceError(error: RuntimeException) {
    val input =
      synchronized(stateLock) {
        pendingInput.also {
          pendingInput = null
        }
      }
    input?.input?.bitmap?.recycle()
    isBusy.set(false)
    emitError("E_POSE_INFERENCE", error)
  }

  private fun finishInput(input: OwnedPoseInput) {
    synchronized(stateLock) {
      if (pendingInput?.input === input) {
        pendingInput = null
      }
    }
    input.bitmap.recycle()
    isBusy.set(false)
  }

  private fun finishPendingInput() {
    val pending =
      synchronized(stateLock) {
        pendingInput.also {
          pendingInput = null
        }
      }
    pending?.input?.bitmap?.recycle()
    isBusy.set(false)
  }

  private fun ensureDetectorIfAccepting() {
    val shouldEnsure =
      synchronized(stateLock) {
        acceptingFrames &&
          poseLandmarker == null &&
          initializingGeneration == null
      }
    if (shouldEnsure) {
      ensureDetector()
    }
  }

  private fun emitResult(
    timestampMs: Long,
    poses: Array<NativeDetectedPersonPose>,
    input: OwnedPoseInput,
  ) {
    val delivery =
      synchronized(deliveryLock) {
        val sequence = nextSequence++
        val frame =
          NativeDetectedPoseFrame(
            sequence = sequence.toDouble(),
            timestamp = timestampMs.toDouble(),
            poses = poses,
            inputWidth = input.inputWidth.toDouble(),
            inputHeight = input.inputHeight.toDouble(),
            sourceWidth = input.sourceWidth.toDouble(),
            sourceHeight = input.sourceHeight.toDouble(),
            rotationDegrees =
              input.rotationDegrees.toDouble(),
            isMirrored = input.isMirrored,
          )
        val callback = resultCallback
        if (callback == null) {
          return
        }
        if (inFlightSequence != null) {
          pendingResult = frame
          null
        } else {
          inFlightSequence = sequence
          callback to frame
        }
      }
    delivery?.let { (callback, frame) ->
      invokeResultCallback(callback, frame)
    }
  }

  private fun invokeResultCallback(
    callback: (NativeDetectedPoseFrame) -> Unit,
    frame: NativeDetectedPoseFrame,
  ) {
    try {
      callback(frame)
    } catch (error: Throwable) {
      Log.w(TAG, "Pose result callback is unavailable.", error)
      synchronized(deliveryLock) {
        if (inFlightSequence == frame.sequence.toLong()) {
          inFlightSequence = null
        }
      }
    }
  }

  private fun emitError(
    code: String,
    error: Throwable,
  ) {
    Log.e(TAG, code, error)
    val callback =
      synchronized(deliveryLock) {
        errorCallback
      } ?: return
    try {
      callback(
        NativePoseDetectionError(
          code = code,
          message =
            error.message ?: "Unknown MediaPipe Pose error.",
        ),
      )
    } catch (callbackError: Throwable) {
      Log.w(TAG, "Pose error callback is unavailable.", callbackError)
    }
  }

  private fun clearPendingResults() {
    synchronized(deliveryLock) {
      pendingResult = null
    }
  }

  private fun nextMediaPipeTimestampMs(
    sourceTimestampMs: Long,
  ): Long =
    synchronized(stateLock) {
      val source =
        if (sourceTimestampMs > 0) {
          sourceTimestampMs
        } else {
          SystemClock.uptimeMillis()
        }
      val timestamp =
        maxOf(source, lastMediaPipeTimestampMs + 1)
      lastMediaPipeTimestampMs = timestamp
      timestamp
    }

  private data class DetectorSnapshot(
    val detector: PoseLandmarker,
    val generation: Long,
    val options: ValidatedPoseOptions,
  )

  private data class PendingInput(
    val input: OwnedPoseInput,
    val generation: Long,
  )

  private data class DetectorSetup(
    val generation: Long,
    val options: ValidatedPoseOptions,
    val previousDetector: PoseLandmarker? = null,
  )

  private data class ValidatedPoseOptions(
    val numPoses: Int,
    val maxInferenceFps: Double,
    val maxInputLongEdge: Int,
    val minPoseDetectionConfidence: Float,
    val minPosePresenceConfidence: Float,
    val minTrackingConfidence: Float,
  ) {
    companion object {
      fun defaults() =
        ValidatedPoseOptions(
          numPoses = 4,
          maxInferenceFps = 10.0,
          maxInputLongEdge = 640,
          minPoseDetectionConfidence = 0.5f,
          minPosePresenceConfidence = 0.5f,
          minTrackingConfidence = 0.5f,
        )

      fun from(options: NativePoseDetectionOptions) =
        ValidatedPoseOptions(
          numPoses =
            options.numPoses.toInt().coerceIn(1, 4),
          maxInferenceFps =
            options.maxInferenceFps.coerceIn(1.0, 10.0),
          maxInputLongEdge =
            options.maxInputLongEdge.toInt()
              .coerceIn(256, 2048),
          minPoseDetectionConfidence =
            options.minPoseDetectionConfidence.toFloat()
              .coerceIn(0f, 1f),
          minPosePresenceConfidence =
            options.minPosePresenceConfidence.toFloat()
              .coerceIn(0f, 1f),
          minTrackingConfidence =
            options.minTrackingConfidence.toFloat()
              .coerceIn(0f, 1f),
        )
    }
  }

  companion object {
    private const val TAG = "VisionCameraPose"
    private const val MODEL_ASSET_PATH =
      "pose_landmarker_lite.task"
    private const val NANOSECONDS_PER_MILLISECOND = 1_000_000L
  }
}
