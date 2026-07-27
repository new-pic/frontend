#import <Foundation/Foundation.h>
#import <WebRTC/WebRTC.h>

NS_ASSUME_NONNULL_BEGIN

@class VisionCameraRtcCaptureController;

/**
 * Thread-safe hand-off point between VisionCamera's frame-output thread and
 * the WebRTC capture controller owned by the local MediaStreamTrack.
 */
@interface VisionCameraRtcTrackRegistry : NSObject

+ (instancetype)sharedRegistry NS_SWIFT_NAME(shared());

- (void)attachController:(VisionCameraRtcCaptureController *)controller;
- (void)detachController:(VisionCameraRtcCaptureController *)controller;
- (void)setFramesEnabled:(BOOL)enabled;
- (BOOL)pushVideoFrame:(RTCVideoFrame *)frame NS_SWIFT_NAME(push(videoFrame:));

@end

NS_ASSUME_NONNULL_END
