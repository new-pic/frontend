package com.newpic.visioncamerartc

import androidx.camera.core.ImageProxy
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

/**
 * Coordinates the normal React Native module, the Nitro frame-worklet object,
 * and WebRTC's capture thread.
 *
 * A write lock makes stopAcceptingFrames() a drain barrier: after it returns,
 * no frame delivery that started before the call is still running.
 */
internal object VisionCameraRtcFrameRegistry {
  private val lock = ReentrantReadWriteLock()
  private var capturer: VisionCameraRtcPushCapturer? = null
  private var isAcceptingFrames = false

  fun attach(candidate: VisionCameraRtcPushCapturer): Boolean =
    lock.write {
      val current = capturer
      if (current == null) {
        capturer = candidate
        true
      } else {
        current === candidate
      }
    }

  fun detach(candidate: VisionCameraRtcPushCapturer) {
    lock.write {
      if (capturer === candidate) {
        capturer = null
      }
    }
  }

  fun startAcceptingFrames() {
    lock.write {
      isAcceptingFrames = true
    }
  }

  fun stopAcceptingFrames() {
    lock.write {
      isAcceptingFrames = false
    }
  }

  fun pushFrame(
    image: ImageProxy,
    rotationDegrees: Int,
  ): Boolean =
    lock.read {
      if (!isAcceptingFrames) {
        return@read false
      }
      capturer?.pushFrame(image, rotationDegrees) ?: false
    }
}
