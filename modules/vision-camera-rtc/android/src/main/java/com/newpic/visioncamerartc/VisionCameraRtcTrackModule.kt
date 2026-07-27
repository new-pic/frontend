package com.newpic.visioncamerartc

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.oney.WebRTCModule.VisionCameraRtcWebRtcExecutor
import com.oney.WebRTCModule.WebRTCModule

@ReactModule(name = VisionCameraRtcTrackModule.NAME)
class VisionCameraRtcTrackModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun createTrack(
    width: Double,
    height: Double,
    frameRate: Double,
    promise: Promise,
  ) {
    val targetWidth = width.toInt()
    val targetHeight = height.toInt()
    val targetFrameRate = frameRate.toInt()

    if (
      targetWidth !in 1..MAX_DIMENSION ||
      targetHeight !in 1..MAX_DIMENSION ||
      targetFrameRate !in 1..MAX_FRAME_RATE
    ) {
      promise.reject(
        "E_INVALID_TRACK_OPTIONS",
        "Invalid RTC video track options: ${targetWidth}x$targetHeight@$targetFrameRate.",
      )
      return
    }

    val webRtcModule =
      reactApplicationContext.getNativeModule(WebRTCModule::class.java)
    if (webRtcModule == null) {
      promise.reject(
        "E_WEBRTC_MODULE_UNAVAILABLE",
        "The existing @livekit/react-native-webrtc WebRTCModule is unavailable.",
      )
      return
    }

    val controller =
      VisionCameraRtcPushCaptureController(
        targetWidth,
        targetHeight,
        targetFrameRate,
      )

    try {
      val track =
        VisionCameraRtcWebRtcExecutor.call {
          if (!VisionCameraRtcFrameRegistry.attach(controller.pushCapturer)) {
            throw TrackAlreadyAttachedException()
          }
          try {
            webRtcModule.createVideoTrack(controller)
          } catch (error: Throwable) {
            VisionCameraRtcFrameRegistry.detach(controller.pushCapturer)
            throw error
          }
        }

      if (track == null) {
        controller.dispose()
        VisionCameraRtcFrameRegistry.detach(controller.pushCapturer)
        promise.reject(
          "E_WEBRTC_TRACK_CREATION_FAILED",
          "WebRTCModule could not create the external VisionCamera video track.",
        )
        return
      }

      val trackInfo =
        Arguments.createMap().apply {
          putString("id", track.id())
          putString("kind", track.kind())
          putBoolean("remote", false)
          putMap("constraints", Arguments.createMap())
          putBoolean("enabled", track.enabled())
          putMap("settings", controller.settings)
          putInt("peerConnectionId", -1)
          putString("readyState", "live")
        }
      promise.resolve(trackInfo)
    } catch (error: TrackAlreadyAttachedException) {
      promise.reject(
        "E_RTC_TRACK_ALREADY_ATTACHED",
        "A VisionCamera RTC video track is already attached.",
        error,
      )
    } catch (error: Throwable) {
      controller.dispose()
      VisionCameraRtcFrameRegistry.detach(controller.pushCapturer)
      promise.reject(
        "E_WEBRTC_TRACK_CREATION_FAILED",
        "Failed to create an external VisionCamera WebRTC track.",
        error,
      )
    }
  }

  @ReactMethod
  fun startAcceptingFrames() {
    VisionCameraRtcFrameRegistry.startAcceptingFrames()
  }

  @ReactMethod
  fun stopAcceptingFrames() {
    VisionCameraRtcFrameRegistry.stopAcceptingFrames()
  }

  override fun invalidate() {
    VisionCameraRtcFrameRegistry.stopAcceptingFrames()
    super.invalidate()
  }

  companion object {
    const val NAME = "VisionCameraRtcTrackModule"
    private const val MAX_DIMENSION = 8192
    private const val MAX_FRAME_RATE = 240
  }

  private class TrackAlreadyAttachedException :
    IllegalStateException("A VisionCamera RTC video track is already attached.")
}
