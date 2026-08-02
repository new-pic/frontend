package com.newpic.visioncamerartc

import android.content.Context
import android.os.SystemClock
import android.util.Log
import androidx.camera.core.ImageProxy
import org.webrtc.CapturerObserver
import org.webrtc.SurfaceTextureHelper
import org.webrtc.VideoCapturer
import org.webrtc.VideoFrame
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * A push-only WebRTC capturer. It never touches Camera1, Camera2, or CameraX.
 * VisionCamera remains the sole owner of the physical camera.
 */
internal class VisionCameraRtcPushCapturer(
  private val onDimensionsChanged: (width: Int, height: Int) -> Unit,
) : VideoCapturer {
  private val observer = AtomicReference<CapturerObserver?>(null)
  private val started = AtomicBoolean(false)
  private val disposed = AtomicBoolean(false)
  private val lastTimestampNs = AtomicLong(Long.MIN_VALUE)

  override fun initialize(
    surfaceTextureHelper: SurfaceTextureHelper?,
    applicationContext: Context?,
    capturerObserver: CapturerObserver?,
  ) {
    check(!disposed.get()) { "Cannot initialize a disposed VisionCamera RTC capturer." }
    requireNotNull(capturerObserver) { "CapturerObserver is required." }
    check(observer.compareAndSet(null, capturerObserver)) {
      "VisionCamera RTC capturer was already initialized."
    }
  }

  override fun startCapture(
    width: Int,
    height: Int,
    framerate: Int,
  ) {
    if (disposed.get()) {
      observer.get()?.onCapturerStarted(false)
      return
    }
    if (started.compareAndSet(false, true)) {
      observer.get()?.onCapturerStarted(true)
    }
  }

  override fun stopCapture() {
    if (started.compareAndSet(true, false)) {
      observer.get()?.onCapturerStopped()
    }
  }

  override fun changeCaptureFormat(
    width: Int,
    height: Int,
    framerate: Int,
  ) {
    // The active VisionCamera CameraSession owns resolution and frame rate.
    // WebRTC adapts incoming frames in its VideoSource.
  }

  override fun dispose() {
    if (!disposed.compareAndSet(false, true)) {
      return
    }
    stopCapture()
    VisionCameraRtcFrameRegistry.detach(this)
    observer.set(null)
  }

  override fun isScreencast(): Boolean = false

  fun pushFrame(
    image: ImageProxy,
    rotationDegrees: Int,
  ): Boolean {
    if (!started.get() || disposed.get()) {
      return false
    }
    val currentObserver = observer.get() ?: return false

    return try {
      val i420 = ImageProxyToI420.copy(image)
      onDimensionsChanged(i420.width, i420.height)
      val timestampNs = nextMonotonicTimestamp(image.imageInfo.timestamp)
      val videoFrame =
        try {
          VideoFrame(i420, rotationDegrees, timestampNs)
        } catch (error: Throwable) {
          i420.release()
          throw error
        }

      try {
        currentObserver.onFrameCaptured(videoFrame)
        true
      } finally {
        videoFrame.release()
      }
    } catch (error: Throwable) {
      Log.e(TAG, "Failed to copy or push a VisionCamera frame.", error)
      false
    }
  }

  private fun nextMonotonicTimestamp(sourceTimestampNs: Long): Long {
    val source =
      if (sourceTimestampNs > 0L) {
        sourceTimestampNs
      } else {
        SystemClock.elapsedRealtimeNanos()
      }

    while (true) {
      val previous = lastTimestampNs.get()
      val next =
        if (source > previous) {
          source
        } else {
          previous + 1L
        }
      if (lastTimestampNs.compareAndSet(previous, next)) {
        return next
      }
    }
  }

  companion object {
    private const val TAG = "VisionCameraRtcCapturer"
  }
}
