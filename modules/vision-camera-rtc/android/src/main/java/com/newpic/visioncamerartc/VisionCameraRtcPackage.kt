package com.newpic.visioncamerartc

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.newpic.visioncamerartc.VisionCameraRtcOnLoad

class VisionCameraRtcPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == VisionCameraRtcTrackModule.NAME) {
      VisionCameraRtcTrackModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        VisionCameraRtcTrackModule.NAME to
          ReactModuleInfo(
            VisionCameraRtcTrackModule.NAME,
            VisionCameraRtcTrackModule.NAME,
            false,
            false,
            false,
            false,
          ),
      )
    }

  companion object {
    init {
      VisionCameraRtcOnLoad.initializeNative()
    }
  }
}
