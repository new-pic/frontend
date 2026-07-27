import {
  createVisionCameraRtcTrack,
  visionCameraRtcFrameSink,
} from "@newpic/vision-camera-rtc";
import type { MediaStreamTrack } from "@livekit/react-native-webrtc";
import {
  Track,
  type LocalTrack,
  type Room,
} from "livekit-client";

/**
 * RTC 영상 송출 구현을 LiveKit 연결/UI에서 분리하는 경계입니다.
 *
 * 카메라 프레임은 VisionCamera가 소유하며, publisher는 외부 WebRTC
 * track을 LiveKit에 publish/unpublish하는 수명주기만 담당합니다.
 */
export interface RtcVideoPublisher {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export type RtcVideoPublisherFactory = (
  room: Room,
) => RtcVideoPublisher;

type LiveKitPublishableTrack = Parameters<
  Room["localParticipant"]["publishTrack"]
>[0];

export class VisionCameraVideoPublisher
  implements RtcVideoPublisher
{
  private rawTrack: MediaStreamTrack | null = null;
  private localTrack: LocalTrack | null = null;
  private hasReleasedTrack = false;
  private isStarted = false;
  private transition: Promise<void> = Promise.resolve();

  constructor(private readonly room: Room) {}

  start(): Promise<void> {
    return this.enqueue(async () => {
      if (this.isStarted) return;

      const rawTrack = await createVisionCameraRtcTrack({
        width: 1280,
        height: 720,
        frameRate: 30,
      });
      this.rawTrack = rawTrack;
      this.hasReleasedTrack = false;

      try {
        const publication =
          await this.room.localParticipant.publishTrack(
            // registerGlobals() installs the same RN-WebRTC constructor as
            // LiveKit's global MediaStreamTrack. Keep the type adaptation
            // isolated at this native-track boundary.
            rawTrack as unknown as LiveKitPublishableTrack,
            {
              name: "vision-camera",
              source: Track.Source.Camera,
              simulcast: false,
            },
          );

        if (!publication.track) {
          throw new Error(
            "VisionCamera 영상 track을 LiveKit에 게시하지 못했습니다.",
          );
        }

        this.localTrack = publication.track;
        visionCameraRtcFrameSink.startAcceptingFrames();
        this.isStarted = true;
      } catch (error) {
        this.stopAcceptingFrames();
        if (this.localTrack) {
          try {
            await this.room.localParticipant.unpublishTrack(
              this.localTrack,
              false,
            );
          } catch {
            // start 오류를 우선하되 signaling 정리는 가능한 만큼 수행합니다.
          }
        }
        try {
          this.stopAndReleaseRawTrack();
        } catch {
          // start 오류를 우선합니다.
        }
        this.localTrack = null;
        this.rawTrack = null;
        throw error;
      }
    });
  }

  stop(): Promise<void> {
    return this.enqueue(async () => {
      let firstError: unknown;

      try {
        visionCameraRtcFrameSink.stopAcceptingFrames();
      } catch (error) {
        firstError = error;
      }

      const localTrack = this.localTrack;
      if (localTrack) {
        try {
          await this.room.localParticipant.unpublishTrack(
            localTrack,
            false,
          );
        } catch (error) {
          firstError ??= error;
        }
      }

      try {
        this.stopAndReleaseRawTrack();
      } catch (error) {
        firstError ??= error;
      } finally {
        this.localTrack = null;
        this.rawTrack = null;
        this.isStarted = false;
      }

      if (firstError) throw firstError;
    });
  }

  private stopAcceptingFrames() {
    try {
      visionCameraRtcFrameSink.stopAcceptingFrames();
    } catch {
      // start 실패 정리에서는 원래 publish 오류를 우선합니다.
    }
  }

  private stopAndReleaseRawTrack() {
    const rawTrack = this.rawTrack;
    if (!rawTrack || this.hasReleasedTrack) return;

    // release()가 throw하더라도 다음 정리 시도에서 같은 native registry
    // entry를 두 번 해제하지 않도록 소유권을 먼저 소비합니다.
    this.hasReleasedTrack = true;
    let stopError: unknown;
    try {
      rawTrack.stop();
    } catch (error) {
      stopError = error;
    }

    try {
      rawTrack.release();
    } catch (error) {
      stopError ??= error;
    }

    if (stopError) throw stopError;
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const nextTransition = this.transition.then(operation, operation);
    this.transition = nextTransition.catch(() => undefined);
    return nextTransition;
  }
}

export const createVisionCameraVideoPublisher: RtcVideoPublisherFactory =
  (room) => new VisionCameraVideoPublisher(room);
