#import "VisionCameraRtcTrackRegistry.h"
#import "VisionCameraRtcCaptureController.h"

@implementation VisionCameraRtcTrackRegistry {
    NSLock *_lock;
    __weak VisionCameraRtcCaptureController *_controller;
    BOOL _framesEnabled;
}

+ (instancetype)sharedRegistry {
    static VisionCameraRtcTrackRegistry *registry;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        registry = [[VisionCameraRtcTrackRegistry alloc] initPrivate];
    });
    return registry;
}

- (instancetype)init {
    return [VisionCameraRtcTrackRegistry sharedRegistry];
}

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        _lock = [[NSLock alloc] init];
        _framesEnabled = NO;
    }
    return self;
}

- (void)attachController:(VisionCameraRtcCaptureController *)controller {
    [_lock lock];
    _controller = controller;
    [_lock unlock];
}

- (void)detachController:(VisionCameraRtcCaptureController *)controller {
    [_lock lock];
    if (_controller == controller) {
        _controller = nil;
    }
    [_lock unlock];
}

- (void)setFramesEnabled:(BOOL)enabled {
    [_lock lock];
    _framesEnabled = enabled;
    [_lock unlock];
}

- (BOOL)pushVideoFrame:(RTCVideoFrame *)frame {
    [_lock lock];
    VisionCameraRtcCaptureController *controller = _framesEnabled ? _controller : nil;
    BOOL pushed = controller != nil && [controller pushVideoFrame:frame];
    [_lock unlock];

    return pushed;
}

@end
