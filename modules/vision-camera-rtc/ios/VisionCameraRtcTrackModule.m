#import <React/RCTBridge.h>
#import <React/RCTBridgeModule.h>
#import <WebRTC/WebRTC.h>
#import <livekit-react-native-webrtc/WebRTCModule+RTCMediaStream.h>
#import <livekit-react-native-webrtc/WebRTCModule.h>

#import "VisionCameraRtcCaptureController.h"

@interface VisionCameraRtcTrackModule : NSObject <RCTBridgeModule>

@property(nonatomic, weak) RCTBridge *bridge;

@end

@implementation VisionCameraRtcTrackModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(VisionCameraRtcTrackModule)

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_REMAP_METHOD(createTrack,
                 createTrackWithWidth:(nonnull NSNumber *)width
                 height:(nonnull NSNumber *)height
                 frameRate:(nonnull NSNumber *)frameRate
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    NSInteger requestedWidth = width.integerValue;
    NSInteger requestedHeight = height.integerValue;
    NSInteger requestedFrameRate = frameRate.integerValue;

    if (requestedWidth <= 0 || requestedHeight <= 0 || requestedFrameRate <= 0) {
        reject(@"E_INVALID_TRACK_OPTIONS",
               @"width, height, and frameRate must be positive numbers.",
               nil);
        return;
    }

    WebRTCModule *webRTCModule = (WebRTCModule *)[self.bridge moduleForName:@"WebRTCModule"];
    if (webRTCModule == nil) {
        reject(@"E_WEBRTC_MODULE_UNAVAILABLE",
               @"WebRTCModule is unavailable. Ensure @livekit/react-native-webrtc is linked.",
               nil);
        return;
    }

    dispatch_async(webRTCModule.workerQueue, ^{
        __block VisionCameraRtcCaptureController *controller;
        RTCVideoTrack *track =
            [webRTCModule createVideoTrackWithCaptureController:^CaptureController *(RTCVideoSource *source) {
                controller = [[VisionCameraRtcCaptureController alloc]
                    initWithVideoSource:source
                                 width:requestedWidth
                                height:requestedHeight
                             frameRate:requestedFrameRate];
                return controller;
            }];

        if (track == nil || controller == nil) {
            reject(@"E_TRACK_CREATION_FAILED",
                   @"Failed to create the VisionCamera-backed WebRTC video track.",
                   nil);
            return;
        }

        webRTCModule.localTracks[track.trackId] = track;
        resolve(@{
            @"enabled" : @(track.isEnabled),
            @"id" : track.trackId,
            @"kind" : track.kind,
            @"readyState" : @"live",
            @"remote" : @NO,
            @"settings" : [controller getSettings],
        });
    });
}

@end
