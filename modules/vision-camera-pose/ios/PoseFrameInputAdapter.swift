import AVFoundation
import CoreImage
import CoreMedia
import CoreVideo
import ImageIO
import NitroModules
import VisionCamera

struct OwnedPoseInput {
  let pixelBuffer: CVPixelBuffer
  let inputWidth: Int
  let inputHeight: Int
  let sourceWidth: Int
  let sourceHeight: Int
  let rotationDegrees: Int
  let isMirrored: Bool
  let timestampMs: Int
}

final class PoseFrameInputAdapter {
  private let context = CIContext(options: [
    .cacheIntermediates: false,
  ])
  private let colorSpace = CGColorSpaceCreateDeviceRGB()

  func copy(
    sampleBuffer: CMSampleBuffer,
    orientation: CameraOrientation,
    isMirrored: Bool,
    maxInputLongEdge: Int,
    timestampMs: Int
  ) throws -> OwnedPoseInput {
    guard let sourceBuffer =
      CMSampleBufferGetImageBuffer(sampleBuffer)
    else {
      throw PoseFrameInputError.missingPixelBuffer
    }

    let sourceWidth = CVPixelBufferGetWidth(sourceBuffer)
    let sourceHeight = CVPixelBufferGetHeight(sourceBuffer)
    var image = CIImage(cvPixelBuffer: sourceBuffer)
      .oriented(cgOrientation(for: orientation))
    let orientedExtent = image.extent.integral
    image = image.transformed(
      by: CGAffineTransform(
        translationX: -orientedExtent.minX,
        y: -orientedExtent.minY
      )
    )

    let uprightWidth = max(1, Int(orientedExtent.width))
    let uprightHeight = max(1, Int(orientedExtent.height))
    let longestEdge = max(uprightWidth, uprightHeight)
    let scale = min(
      1.0,
      CGFloat(maxInputLongEdge) / CGFloat(longestEdge)
    )
    let targetWidth = max(
      1,
      Int((CGFloat(uprightWidth) * scale).rounded(.down))
    )
    let targetHeight = max(
      1,
      Int((CGFloat(uprightHeight) * scale).rounded(.down))
    )

    var outputBuffer: CVPixelBuffer?
    let attributes: [CFString: Any] = [
      kCVPixelBufferCGImageCompatibilityKey: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey: true,
      kCVPixelBufferIOSurfacePropertiesKey: [:],
    ]
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      targetWidth,
      targetHeight,
      kCVPixelFormatType_32BGRA,
      attributes as CFDictionary,
      &outputBuffer
    )
    guard status == kCVReturnSuccess, let outputBuffer else {
      throw PoseFrameInputError.pixelBufferCreationFailed(status)
    }

    let scaledImage = image.transformed(
      by: CGAffineTransform(scaleX: scale, y: scale)
    )
    context.render(
      scaledImage,
      to: outputBuffer,
      bounds: CGRect(
        x: 0,
        y: 0,
        width: targetWidth,
        height: targetHeight
      ),
      colorSpace: colorSpace
    )

    return OwnedPoseInput(
      pixelBuffer: outputBuffer,
      inputWidth: targetWidth,
      inputHeight: targetHeight,
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
      rotationDegrees: rotationDegrees(for: orientation),
      isMirrored: isMirrored,
      timestampMs: timestampMs
    )
  }

  private func cgOrientation(
    for orientation: CameraOrientation
  ) -> CGImagePropertyOrientation {
    switch orientation {
    case .up:
      return .up
    case .right:
      return .right
    case .down:
      return .down
    case .left:
      return .left
    }
  }

  private func rotationDegrees(
    for orientation: CameraOrientation
  ) -> Int {
    switch orientation {
    case .up:
      return 0
    case .right:
      return 90
    case .down:
      return 180
    case .left:
      return 270
    }
  }
}

private enum PoseFrameInputError: LocalizedError {
  case missingPixelBuffer
  case pixelBufferCreationFailed(CVReturn)

  var errorDescription: String? {
    switch self {
    case .missingPixelBuffer:
      return "VisionCamera Pose Frame has no CVPixelBuffer."
    case .pixelBufferCreationFailed(let status):
      return "Failed to create a BGRA Pose input buffer: \(status)."
    }
  }
}
