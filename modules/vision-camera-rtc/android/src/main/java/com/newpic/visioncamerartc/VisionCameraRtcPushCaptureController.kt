package com.newpic.visioncamerartc

import com.facebook.react.bridge.WritableMap
import com.oney.WebRTCModule.AbstractVideoCaptureController
import org.webrtc.VideoCapturer

internal class VisionCameraRtcPushCaptureController(
  width: Int,
  height: Int,
  fps: Int,
) : AbstractVideoCaptureController(width, height, fps) {
  val pushCapturer =
    VisionCameraRtcPushCapturer { actualWidth, actualHeight ->
      this.actualWidth = actualWidth
      this.actualHeight = actualHeight
    }

  override fun getDeviceId(): String = DEVICE_ID

  override fun getSettings(): WritableMap =
    super.getSettings().apply {
      putString("facingMode", "environment")
    }

  override fun createVideoCapturer(): VideoCapturer = pushCapturer

  companion object {
    const val DEVICE_ID = "vision-camera"
  }
}
