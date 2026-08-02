import AVFoundation
import Foundation
import MediaPipeTasksVision
import NitroModules
import VisionCamera

private final class PoseLandmarkerDelegate:
  NSObject,
  PoseLandmarkerLiveStreamDelegate
{
  weak var owner: HybridVisionCameraPoseFrameSink?

  init(owner: HybridVisionCameraPoseFrameSink) {
    self.owner = owner
  }

  func poseLandmarker(
    _ poseLandmarker: PoseLandmarker,
    didFinishDetection result: PoseLandmarkerResult?,
    timestampInMilliseconds: Int,
    error: Error?
  ) {
    owner?.handleResult(
      result,
      timestampInMilliseconds: timestampInMilliseconds,
      error: error
    )
  }
}

final class HybridVisionCameraPoseFrameSink:
  HybridVisionCameraPoseFrameSinkSpec
{
  private let stateLock = NSLock()
  private let deliveryLock = NSLock()
  private let inferenceQueue = DispatchQueue(
    label: "com.newpic.vision-camera-pose.inference",
    qos: .userInitiated
  )
  private let inputAdapter = PoseFrameInputAdapter()

  private var options = ValidatedPoseOptions.defaults
  private var poseLandmarker: PoseLandmarker?
  private var landmarkerDelegate: PoseLandmarkerDelegate?
  private var initializingGeneration: Int64?
  private var acceptingFrames = false
  private var isBusy = false
  private var generation: Int64 = 0
  private var lastAcceptedTimestampMs: Int64 = .min
  private var lastMediaPipeTimestampMs: Int64 = .min
  private var pendingInput: PendingInput?

  private var resultCallback:
    ((NativeDetectedPoseFrame) -> Void)?
  private var errorCallback:
    ((NativePoseDetectionError) -> Void)?
  private var nextSequence: Int64 = 1
  private var inFlightSequence: Int64?
  private var pendingResult: NativeDetectedPoseFrame?

  func configure(
    options: NativePoseDetectionOptions
  ) throws {
    let validated = ValidatedPoseOptions(options)
    let shouldRebuild = stateLock.withLock {
      let changed = self.options != validated
      self.options = validated
      return changed &&
        (
          poseLandmarker != nil ||
            initializingGeneration != nil
        )
    }

    if shouldRebuild {
      rebuildDetector()
    } else {
      ensureDetector()
    }
  }

  func startAcceptingFrames() throws {
    stateLock.withLock {
      acceptingFrames = true
    }
    ensureDetector()
  }

  func stopAcceptingFrames() throws {
    stateLock.withLock {
      acceptingFrames = false
      generation &+= 1
      lastAcceptedTimestampMs = .min
    }
    clearPendingResults()
  }

  func releaseDetector() throws {
    var detector = stateLock.withLock {
      acceptingFrames = false
      generation &+= 1
      initializingGeneration = nil
      lastAcceptedTimestampMs = .min
      lastMediaPipeTimestampMs = .min
      let detector = poseLandmarker
      poseLandmarker = nil
      landmarkerDelegate = nil
      return detector
    }
    clearPendingResults()
    inferenceQueue.async { [weak self] in
      withExtendedLifetime(detector) {}
      detector = nil
      self?.finishPendingInput()
    }
  }

  func pushFrame(
    frame: any HybridFrameSpec
  ) throws -> Bool {
    guard
      let nativeFrame = frame as? any NativeFrame,
      let sampleBuffer = nativeFrame.sampleBuffer
    else {
      return false
    }

    let timestampMs = nextMediaPipeTimestampMs(
      sampleBuffer: sampleBuffer
    )
    guard let snapshot = stateLock.withLock({ () -> DetectorSnapshot? in
      guard
        acceptingFrames,
        !isBusy,
        let detector = poseLandmarker
      else {
        return nil
      }
      let minimumIntervalMs =
        1000.0 / options.maxInferenceFps
      if
        lastAcceptedTimestampMs != .min,
        Double(timestampMs - lastAcceptedTimestampMs) <
          minimumIntervalMs
      {
        return nil
      }
      isBusy = true
      lastAcceptedTimestampMs = timestampMs
      return DetectorSnapshot(
        detector: detector,
        generation: generation,
        options: options
      )
    }) else {
      return false
    }

    let input: OwnedPoseInput
    do {
      input = try inputAdapter.copy(
        sampleBuffer: sampleBuffer,
        orientation: frame.orientation,
        isMirrored: frame.isMirrored,
        maxInputLongEdge:
          snapshot.options.maxInputLongEdge,
        timestampMs: Int(timestampMs)
      )
    } catch {
      stateLock.withLock {
        isBusy = false
      }
      emitError(code: "E_POSE_INPUT", error: error)
      return false
    }

    stateLock.withLock {
      pendingInput = PendingInput(
        input: input,
        generation: snapshot.generation
      )
    }
    inferenceQueue.async { [weak self] in
      self?.detect(snapshot: snapshot, input: input)
    }
    return true
  }

  func setResultCallback(
    callback:
      ((NativeDetectedPoseFrame) -> Void)?
  ) throws {
    deliveryLock.withLock {
      resultCallback = callback
      if callback == nil {
        inFlightSequence = nil
        pendingResult = nil
      }
    }
  }

  func setErrorCallback(
    callback:
      ((NativePoseDetectionError) -> Void)?
  ) throws {
    deliveryLock.withLock {
      errorCallback = callback
    }
  }

  func acknowledgeResult(sequence: Double) throws {
    let delivery:
      (
        ((NativeDetectedPoseFrame) -> Void),
        NativeDetectedPoseFrame
      )? = deliveryLock.withLock {
        guard
          inFlightSequence == Int64(sequence)
        else {
          return nil
        }
        inFlightSequence = nil
        guard
          let next = pendingResult,
          let callback = resultCallback
        else {
          pendingResult = nil
          return nil
        }
        pendingResult = nil
        inFlightSequence = Int64(next.sequence)
        return (callback, next)
      }
    if let delivery {
      invokeResultCallback(
        delivery.0,
        frame: delivery.1
      )
    }
  }

  func dispose() {
    try? releaseDetector()
    deliveryLock.withLock {
      resultCallback = nil
      errorCallback = nil
    }
  }

  deinit {
    dispose()
  }

  fileprivate func handleResult(
    _ result: PoseLandmarkerResult?,
    timestampInMilliseconds: Int,
    error: Error?
  ) {
    let pending = stateLock.withLock {
      defer {
        pendingInput = nil
        isBusy = false
      }
      return pendingInput
    }

    if let error {
      emitError(code: "E_POSE_INFERENCE", error: error)
      return
    }
    guard
      let result,
      let pending
    else {
      emitError(
        code: "E_POSE_INFERENCE",
        error: PoseDetectionError.missingResult
      )
      return
    }

    let shouldDeliver = stateLock.withLock {
      acceptingFrames &&
        generation == pending.generation
    }
    guard shouldDeliver else {
      return
    }

    let poses = result.landmarks.map { landmarks in
      NativeDetectedPersonPose(
        landmarks: landmarks.map { landmark in
          let visibility =
            landmark.visibility?.doubleValue ?? 0
          let presence =
            landmark.presence?.doubleValue ?? 0
          return NativePosePoint(
            x: Double(landmark.x),
            y: Double(landmark.y),
            z: Double(landmark.z),
            confidence: min(visibility, presence)
          )
        }
      )
    }
    emitResult(
      timestampMs: timestampInMilliseconds,
      poses: poses,
      input: pending.input
    )
  }

  private func ensureDetector() {
    let setup: DetectorSetup? = stateLock.withLock {
      guard
        poseLandmarker == nil,
        initializingGeneration == nil
      else {
        return nil
      }
      generation &+= 1
      initializingGeneration = generation
      return DetectorSetup(
        generation: generation,
        options: options
      )
    }
    guard let setup else {
      return
    }
    inferenceQueue.async { [weak self] in
      self?.createDetector(setup: setup)
    }
  }

  private func rebuildDetector() {
    var previousDetector: PoseLandmarker?
    let setup = stateLock.withLock {
      generation &+= 1
      initializingGeneration = generation
      isBusy = false
      previousDetector = poseLandmarker
      poseLandmarker = nil
      landmarkerDelegate = nil
      return DetectorSetup(
        generation: generation,
        options: options
      )
    }
    inferenceQueue.async { [weak self] in
      withExtendedLifetime(previousDetector) {}
      previousDetector = nil
      self?.finishPendingInput()
      self?.createDetector(setup: setup)
    }
  }

  private func createDetector(setup: DetectorSetup) {
    do {
      let modelPath = try Self.modelPath()
      let delegate = PoseLandmarkerDelegate(owner: self)
      let landmarkerOptions = PoseLandmarkerOptions()
      landmarkerOptions.baseOptions.modelAssetPath = modelPath
      landmarkerOptions.runningMode = .liveStream
      landmarkerOptions.numPoses = setup.options.numPoses
      landmarkerOptions.minPoseDetectionConfidence =
        setup.options.minPoseDetectionConfidence
      landmarkerOptions.minPosePresenceConfidence =
        setup.options.minPosePresenceConfidence
      landmarkerOptions.minTrackingConfidence =
        setup.options.minTrackingConfidence
      landmarkerOptions.shouldOutputSegmentationMasks = false
      landmarkerOptions.poseLandmarkerLiveStreamDelegate =
        delegate
      let detector = try PoseLandmarker(
        options: landmarkerOptions
      )

      let shouldKeep = stateLock.withLock {
        if initializingGeneration == setup.generation {
          initializingGeneration = nil
        }
        guard generation == setup.generation else {
          return false
        }
        poseLandmarker = detector
        landmarkerDelegate = delegate
        return true
      }
      if !shouldKeep {
        ensureDetectorIfAccepting()
      }
    } catch {
      var shouldRetry = false
      stateLock.withLock {
        if initializingGeneration == setup.generation {
          initializingGeneration = nil
        }
        if generation == setup.generation {
          poseLandmarker = nil
          landmarkerDelegate = nil
          isBusy = false
        } else {
          shouldRetry =
            acceptingFrames &&
              poseLandmarker == nil &&
              initializingGeneration == nil
        }
      }
      emitError(
        code: "E_POSE_INITIALIZATION",
        error: error
      )
      if shouldRetry {
        ensureDetector()
      }
    }
  }

  private func detect(
    snapshot: DetectorSnapshot,
    input: OwnedPoseInput
  ) {
    let isCurrent = stateLock.withLock {
      generation == snapshot.generation &&
        poseLandmarker === snapshot.detector
    }
    guard isCurrent else {
      finishPendingInput()
      return
    }

    do {
      let image = try MPImage(
        pixelBuffer: input.pixelBuffer
      )
      try snapshot.detector.detectAsync(
        image: image,
        timestampInMilliseconds: input.timestampMs
      )
    } catch {
      finishPendingInput()
      emitError(code: "E_POSE_INFERENCE", error: error)
    }
  }

  private func finishPendingInput() {
    stateLock.withLock {
      pendingInput = nil
      isBusy = false
    }
  }

  private func ensureDetectorIfAccepting() {
    let shouldEnsure = stateLock.withLock {
      acceptingFrames &&
        poseLandmarker == nil &&
        initializingGeneration == nil
    }
    if shouldEnsure {
      ensureDetector()
    }
  }

  private func emitResult(
    timestampMs: Int,
    poses: [NativeDetectedPersonPose],
    input: OwnedPoseInput
  ) {
    let delivery:
      (
        ((NativeDetectedPoseFrame) -> Void),
        NativeDetectedPoseFrame
      )? = deliveryLock.withLock {
        let sequence = nextSequence
        nextSequence &+= 1
        let frame = NativeDetectedPoseFrame(
          sequence: Double(sequence),
          timestamp: Double(timestampMs),
          poses: poses,
          inputWidth: Double(input.inputWidth),
          inputHeight: Double(input.inputHeight),
          sourceWidth: Double(input.sourceWidth),
          sourceHeight: Double(input.sourceHeight),
          rotationDegrees: Double(input.rotationDegrees),
          isMirrored: input.isMirrored
        )
        guard let callback = resultCallback else {
          return nil
        }
        if inFlightSequence != nil {
          pendingResult = frame
          return nil
        }
        inFlightSequence = sequence
        return (callback, frame)
      }
    if let delivery {
      invokeResultCallback(
        delivery.0,
        frame: delivery.1
      )
    }
  }

  private func invokeResultCallback(
    _ callback:
      @escaping (NativeDetectedPoseFrame) -> Void,
    frame: NativeDetectedPoseFrame
  ) {
    callback(frame)
  }

  private func emitError(
    code: String,
    error: Error
  ) {
    let callback = deliveryLock.withLock {
      errorCallback
    }
    callback?(
      NativePoseDetectionError(
        code: code,
        message: error.localizedDescription
      )
    )
  }

  private func clearPendingResults() {
    deliveryLock.withLock {
      pendingResult = nil
    }
  }

  private func nextMediaPipeTimestampMs(
    sampleBuffer: CMSampleBuffer
  ) -> Int64 {
    let presentationTime =
      CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    let seconds = CMTimeGetSeconds(presentationTime)
    let sourceTimestamp =
      seconds.isFinite && seconds >= 0
      ? Int64((seconds * 1000).rounded(.down))
      : Int64(
        DispatchTime.now().uptimeNanoseconds /
          1_000_000
      )

    return stateLock.withLock {
      let timestamp = max(
        sourceTimestamp,
        lastMediaPipeTimestampMs &+ 1
      )
      lastMediaPipeTimestampMs = timestamp
      return timestamp
    }
  }

  private static func modelPath() throws -> String {
    let hostBundle = Bundle(
      for: PoseResourceLocator.self
    )
    let bundleURL =
      hostBundle.url(
        forResource: "VisionCameraPoseResources",
        withExtension: "bundle"
      ) ??
      Bundle.main.url(
        forResource: "VisionCameraPoseResources",
        withExtension: "bundle"
      )
    guard
      let bundleURL,
      let resourceBundle = Bundle(url: bundleURL),
      let path = resourceBundle.path(
        forResource: "pose_landmarker_lite",
        ofType: "task"
      )
    else {
      throw PoseDetectionError.modelNotFound
    }
    return path
  }
}

private final class PoseResourceLocator: NSObject {}

private struct PendingInput {
  let input: OwnedPoseInput
  let generation: Int64
}

private struct DetectorSnapshot {
  let detector: PoseLandmarker
  let generation: Int64
  let options: ValidatedPoseOptions
}

private struct DetectorSetup {
  let generation: Int64
  let options: ValidatedPoseOptions
}

private struct ValidatedPoseOptions: Equatable {
  let numPoses: Int
  let maxInferenceFps: Double
  let maxInputLongEdge: Int
  let minPoseDetectionConfidence: Float
  let minPosePresenceConfidence: Float
  let minTrackingConfidence: Float

  static let defaults = ValidatedPoseOptions(
    numPoses: 4,
    maxInferenceFps: 10,
    maxInputLongEdge: 640,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  )

  init(_ options: NativePoseDetectionOptions) {
    numPoses = min(max(Int(options.numPoses), 1), 4)
    maxInferenceFps = min(
      max(options.maxInferenceFps, 1),
      10
    )
    maxInputLongEdge = min(
      max(Int(options.maxInputLongEdge), 256),
      2048
    )
    minPoseDetectionConfidence = Float(
      min(max(options.minPoseDetectionConfidence, 0), 1)
    )
    minPosePresenceConfidence = Float(
      min(max(options.minPosePresenceConfidence, 0), 1)
    )
    minTrackingConfidence = Float(
      min(max(options.minTrackingConfidence, 0), 1)
    )
  }

  private init(
    numPoses: Int,
    maxInferenceFps: Double,
    maxInputLongEdge: Int,
    minPoseDetectionConfidence: Float,
    minPosePresenceConfidence: Float,
    minTrackingConfidence: Float
  ) {
    self.numPoses = numPoses
    self.maxInferenceFps = maxInferenceFps
    self.maxInputLongEdge = maxInputLongEdge
    self.minPoseDetectionConfidence =
      minPoseDetectionConfidence
    self.minPosePresenceConfidence =
      minPosePresenceConfidence
    self.minTrackingConfidence = minTrackingConfidence
  }
}

private enum PoseDetectionError: LocalizedError {
  case modelNotFound
  case missingResult

  var errorDescription: String? {
    switch self {
    case .modelNotFound:
      return "pose_landmarker_lite.task is missing."
    case .missingResult:
      return "MediaPipe Pose returned no result."
    }
  }
}

private extension NSLock {
  func withLock<T>(_ body: () throws -> T) rethrows -> T {
    lock()
    defer { unlock() }
    return try body()
  }
}
