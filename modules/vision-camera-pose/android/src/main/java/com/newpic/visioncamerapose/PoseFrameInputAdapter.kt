package com.newpic.visioncamerapose

import android.graphics.Bitmap
import androidx.camera.core.ImageProxy
import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.extensions.toBitmap

internal data class OwnedPoseInput(
  val bitmap: Bitmap,
  val inputWidth: Int,
  val inputHeight: Int,
  val sourceWidth: Int,
  val sourceHeight: Int,
  val rotationDegrees: Int,
  val isMirrored: Boolean,
  val timestampMs: Long,
)

internal object PoseFrameInputAdapter {
  fun copy(
    image: ImageProxy,
    orientation: CameraOrientation,
    isMirrored: Boolean,
    maxInputLongEdge: Int,
    timestampMs: Long,
  ): OwnedPoseInput {
    val sourceWidth = image.cropRect.width()
    val sourceHeight = image.cropRect.height()
    require(sourceWidth > 0 && sourceHeight > 0) {
      "VisionCamera Pose received an empty ImageProxy crop."
    }

    val rotationDegrees = orientationDegrees(orientation)
    val uprightBitmap = image.toBitmap(orientation, false)

    val longestEdge =
      maxOf(uprightBitmap.width, uprightBitmap.height)
    val scale =
      minOf(1.0, maxInputLongEdge.toDouble() / longestEdge)
    val targetWidth =
      maxOf(1, (uprightBitmap.width * scale).toInt())
    val targetHeight =
      maxOf(1, (uprightBitmap.height * scale).toInt())
    val inputBitmap =
      if (
        uprightBitmap.width == targetWidth &&
        uprightBitmap.height == targetHeight
      ) {
        uprightBitmap
      } else {
        Bitmap.createScaledBitmap(
          uprightBitmap,
          targetWidth,
          targetHeight,
          true,
        ).also {
          uprightBitmap.recycle()
        }
      }

    return OwnedPoseInput(
      bitmap = inputBitmap,
      inputWidth = inputBitmap.width,
      inputHeight = inputBitmap.height,
      sourceWidth = sourceWidth,
      sourceHeight = sourceHeight,
      rotationDegrees = rotationDegrees,
      isMirrored = isMirrored,
      timestampMs = timestampMs,
    )
  }

  private fun orientationDegrees(
    orientation: CameraOrientation,
  ): Int =
    when (orientation) {
      CameraOrientation.UP -> 0
      CameraOrientation.RIGHT -> 90
      CameraOrientation.DOWN -> 180
      CameraOrientation.LEFT -> 270
    }
}
