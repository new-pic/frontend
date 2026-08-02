import AVFoundation
import Foundation
import VisionCamera
import WebRTC

final class HybridVisionCameraRtcFrameSink: HybridVisionCameraRtcFrameSinkSpec {
  private let timestampLock = NSLock()
  private var lastTimestampNs: Int64 = 0

  func startAcceptingFrames() throws {
    VisionCameraRtcTrackRegistry.shared().setFramesEnabled(true)
  }

  func stopAcceptingFrames() throws {
    VisionCameraRtcTrackRegistry.shared().setFramesEnabled(false)
  }

  func pushFrame(frame: any HybridFrameSpec) throws -> Bool {
    guard
      let nativeFrame = frame as? any NativeFrame,
      let sampleBuffer = nativeFrame.sampleBuffer,
      let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer)
    else {
      return false
    }

    let rtcPixelBuffer = RTCCVPixelBuffer(pixelBuffer: pixelBuffer)
    let rtcFrame = RTCVideoFrame(
      buffer: rtcPixelBuffer,
      rotation: Self.videoRotation(for: frame.orientation),
      timeStampNs: nextTimestampNs()
    )

    // The registry forwards synchronously. RTCCVPixelBuffer retains the
    // CVPixelBuffer for WebRTC, so this sink never stores or disposes `frame`.
    return VisionCameraRtcTrackRegistry.shared().push(videoFrame: rtcFrame)
  }

  func dispose() {
    VisionCameraRtcTrackRegistry.shared().setFramesEnabled(false)
  }

  deinit {
    VisionCameraRtcTrackRegistry.shared().setFramesEnabled(false)
  }

  private func nextTimestampNs() -> Int64 {
    timestampLock.lock()
    defer { timestampLock.unlock() }

    let now = Int64(DispatchTime.now().uptimeNanoseconds)
    let timestamp = max(now, lastTimestampNs &+ 1)
    lastTimestampNs = timestamp
    return timestamp
  }

  private static func videoRotation(for orientation: CameraOrientation) -> RTCVideoRotation {
    switch orientation {
    case .up:
      return ._0
    case .right:
      return ._90
    case .down:
      return ._180
    case .left:
      return ._270
    }
  }
}
