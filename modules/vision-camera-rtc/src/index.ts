import { MediaStreamTrack } from "@livekit/react-native-webrtc";
import { NitroModules } from "react-native-nitro-modules";
import { NativeModules, Platform } from "react-native";
import type { VisionCameraRtcFrameSink } from "./specs/VisionCameraRtcFrameSink.nitro";

export type VisionCameraRtcTrackOptions = {
  width?: number;
  height?: number;
  frameRate?: number;
};

type NativeMediaStreamTrackInfo = {
  id: string;
  kind: "video";
  remote: false;
  enabled: boolean;
  readyState: "live";
  settings?: {
    width?: number;
    height?: number;
    frameRate?: number;
    deviceId?: string;
    groupId?: string;
  };
};

type VisionCameraRtcTrackNativeModule = {
  createTrack(
    width: number,
    height: number,
    frameRate: number,
  ): Promise<NativeMediaStreamTrackInfo>;
};

const nativeTrackModule = NativeModules
  .VisionCameraRtcTrackModule as
  | VisionCameraRtcTrackNativeModule
  | undefined;

export const visionCameraRtcFrameSink =
  NitroModules.createHybridObject<VisionCameraRtcFrameSink>(
    "VisionCameraRtcFrameSink",
  );

export async function createVisionCameraRtcTrack({
  width = 1280,
  height = 720,
  frameRate = 30,
}: VisionCameraRtcTrackOptions = {}): Promise<MediaStreamTrack> {
  if (!nativeTrackModule) {
    throw new Error(
      `VisionCameraRtcTrackModule is unavailable on ${Platform.OS}. Rebuild the native development client after installing @newpic/vision-camera-rtc.`,
    );
  }

  const info = await nativeTrackModule.createTrack(
    width,
    height,
    frameRate,
  );

  return new MediaStreamTrack({
    ...info,
    constraints: {
      width,
      height,
      frameRate,
    },
    settings: {
      width,
      height,
      frameRate,
      deviceId: "vision-camera",
      groupId: "",
      ...info.settings,
    },
    peerConnectionId: -1,
  });
}

export type { VisionCameraRtcFrameSink };
