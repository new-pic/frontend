#import <Foundation/Foundation.h>
#import <WebRTC/WebRTC.h>
#import <livekit-react-native-webrtc/CaptureController.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * A WebRTC capture controller backed only by externally supplied frames.
 * It intentionally never creates an AVCaptureSession or camera capturer.
 */
@interface VisionCameraRtcCaptureController : CaptureController

- (instancetype)initWithVideoSource:(RTCVideoSource *)videoSource
                              width:(NSInteger)width
                             height:(NSInteger)height
                          frameRate:(NSInteger)frameRate NS_DESIGNATED_INITIALIZER;

- (instancetype)init NS_UNAVAILABLE;
- (BOOL)pushVideoFrame:(RTCVideoFrame *)frame;

@end

NS_ASSUME_NONNULL_END
