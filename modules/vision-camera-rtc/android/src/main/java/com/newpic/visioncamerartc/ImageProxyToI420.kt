package com.newpic.visioncamerartc

import android.graphics.ImageFormat
import androidx.camera.core.ImageProxy
import org.webrtc.JavaI420Buffer
import java.nio.ByteBuffer

internal object ImageProxyToI420 {
  fun copy(image: ImageProxy): JavaI420Buffer {
    require(image.format == ImageFormat.YUV_420_888) {
      "RTC FrameOutput requires YUV_420_888, but received format ${image.format}."
    }
    require(image.planes.size >= 3) {
      "YUV_420_888 frame must expose Y, U, and V planes."
    }

    val crop = image.cropRect
    require(
      crop.left >= 0 &&
        crop.top >= 0 &&
        crop.right <= image.width &&
        crop.bottom <= image.height &&
        crop.width() > 0 &&
        crop.height() > 0,
    ) {
      "Invalid ImageProxy crop rect $crop for ${image.width}x${image.height} frame."
    }

    val width = crop.width()
    val height = crop.height()
    val chromaWidth = (width + 1) / 2
    val chromaHeight = (height + 1) / 2
    val output = JavaI420Buffer.allocate(width, height)

    try {
      copyPlane(
        plane = image.planes[0],
        sourceX = crop.left,
        sourceY = crop.top,
        width = width,
        height = height,
        destination = output.dataY,
        destinationRowStride = output.strideY,
      )
      copyPlane(
        plane = image.planes[1],
        sourceX = crop.left / 2,
        sourceY = crop.top / 2,
        width = chromaWidth,
        height = chromaHeight,
        destination = output.dataU,
        destinationRowStride = output.strideU,
      )
      copyPlane(
        plane = image.planes[2],
        sourceX = crop.left / 2,
        sourceY = crop.top / 2,
        width = chromaWidth,
        height = chromaHeight,
        destination = output.dataV,
        destinationRowStride = output.strideV,
      )
      return output
    } catch (error: Throwable) {
      output.release()
      throw error
    }
  }

  private fun copyPlane(
    plane: ImageProxy.PlaneProxy,
    sourceX: Int,
    sourceY: Int,
    width: Int,
    height: Int,
    destination: ByteBuffer,
    destinationRowStride: Int,
  ) {
    require(width > 0 && height > 0)
    require(sourceX >= 0 && sourceY >= 0)
    require(plane.rowStride > 0 && plane.pixelStride > 0)
    require(destinationRowStride >= width)

    val source = plane.buffer.duplicate()
    val sourceBasePosition = source.position()
    val sourceLimit = source.limit()
    val destinationBuffer = destination.duplicate()

    val lastSourceIndex =
      sourceBasePosition.toLong() +
        (sourceY + height - 1).toLong() * plane.rowStride +
        (sourceX + width - 1).toLong() * plane.pixelStride
    require(lastSourceIndex < sourceLimit.toLong()) {
      "YUV plane buffer is smaller than its crop/stride metadata."
    }

    val lastDestinationIndex =
      (height - 1).toLong() * destinationRowStride + (width - 1)
    require(lastDestinationIndex < destinationBuffer.capacity().toLong()) {
      "I420 destination plane is smaller than its stride metadata."
    }

    if (plane.pixelStride == 1) {
      repeat(height) { row ->
        val sourceRow =
          sourceBasePosition +
            (sourceY + row) * plane.rowStride +
            sourceX
        val destinationRow = row * destinationRowStride

        source.limit(sourceLimit)
        source.position(sourceRow)
        source.limit(sourceRow + width)
        destinationBuffer.position(destinationRow)
        destinationBuffer.put(source)
      }
      return
    }

    repeat(height) { row ->
      val sourceRow =
        sourceBasePosition +
          (sourceY + row) * plane.rowStride +
          sourceX * plane.pixelStride
      val destinationRow = row * destinationRowStride
      repeat(width) { column ->
        destinationBuffer.put(
          destinationRow + column,
          source.get(sourceRow + column * plane.pixelStride),
        )
      }
    }
  }
}
