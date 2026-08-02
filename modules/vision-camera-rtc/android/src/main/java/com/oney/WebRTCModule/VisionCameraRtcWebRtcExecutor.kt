package com.oney.WebRTCModule

import java.util.concurrent.Callable
import java.util.concurrent.ExecutionException

/**
 * Runs extension-source creation on react-native-webrtc's own serialized
 * executor. This file intentionally shares the WebRTCModule Java package so it
 * can use the package-private ThreadUtils without reflection.
 */
object VisionCameraRtcWebRtcExecutor {
  @JvmStatic
  fun <T> call(block: () -> T): T {
    try {
      return ThreadUtils.submitToExecutor(Callable { block() }).get()
    } catch (error: ExecutionException) {
      throw error.cause ?: error
    }
  }
}
