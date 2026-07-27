package com.margelo.nitro.newpic.visioncamerartc

import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import com.newpic.visioncamerartc.VisionCameraRtcFrameRegistry

class HybridVisionCameraRtcFrameSink : HybridVisionCameraRtcFrameSinkSpec() {
  override fun startAcceptingFrames() {
    VisionCameraRtcFrameRegistry.startAcceptingFrames()
  }

  override fun stopAcceptingFrames() {
    VisionCameraRtcFrameRegistry.stopAcceptingFrames()
  }

  override fun pushFrame(frame: HybridFrameSpec): Boolean {
    val nativeFrame = frame as? NativeFrame ?: return false
    val rotationDegrees =
      when (frame.orientation) {
        CameraOrientation.UP -> 0
        CameraOrientation.RIGHT -> 90
        CameraOrientation.DOWN -> 180
        CameraOrientation.LEFT -> 270
      }

    // Frame/ImageProxy ownership remains with VisionCamera. The registry and
    // capturer synchronously deep-copy pixels before this method returns.
    return VisionCameraRtcFrameRegistry.pushFrame(
      nativeFrame.image,
      rotationDegrees,
    )
  }
}
