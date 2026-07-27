#import "VisionCameraRtcCaptureController.h"
#import "VisionCameraRtcTrackRegistry.h"

@implementation VisionCameraRtcCaptureController {
    NSLock *_lock;
    RTCVideoSource *_videoSource;
    RTCVideoCapturer *_capturer;
    NSInteger _width;
    NSInteger _height;
    NSInteger _frameRate;
    BOOL _active;
}

- (instancetype)initWithVideoSource:(RTCVideoSource *)videoSource
                              width:(NSInteger)width
                             height:(NSInteger)height
                          frameRate:(NSInteger)frameRate {
    self = [super init];
    if (self) {
        _lock = [[NSLock alloc] init];
        _videoSource = videoSource;
        _capturer = [[RTCVideoCapturer alloc] initWithDelegate:videoSource];
        _width = width;
        _height = height;
        _frameRate = frameRate;
        _active = NO;
        self.deviceId = @"vision-camera";
    }
    return self;
}

- (void)startCapture {
    [_lock lock];
    if (_active) {
        [_lock unlock];
        return;
    }
    _active = YES;
    _capturer.delegate = _videoSource;
    [_lock unlock];

    [[VisionCameraRtcTrackRegistry sharedRegistry] attachController:self];
}

- (void)stopCapture {
    [_lock lock];
    if (!_active) {
        [_lock unlock];
        [[VisionCameraRtcTrackRegistry sharedRegistry] detachController:self];
        return;
    }
    _active = NO;
    _capturer.delegate = nil;
    [_lock unlock];

    [[VisionCameraRtcTrackRegistry sharedRegistry] detachController:self];
}

- (BOOL)pushVideoFrame:(RTCVideoFrame *)frame {
    id<RTCVideoCapturerDelegate> delegate;

    [_lock lock];
    delegate = _active ? _capturer.delegate : nil;
    [_lock unlock];

    if (delegate == nil) {
        return NO;
    }

    [delegate capturer:_capturer didCaptureVideoFrame:frame];
    return YES;
}

- (NSDictionary *)getSettings {
    return @{
        @"width" : @(_width),
        @"height" : @(_height),
        @"frameRate" : @(_frameRate),
        @"deviceId" : self.deviceId ?: @"vision-camera",
        @"groupId" : @"",
    };
}

- (void)dealloc {
    [self stopCapture];
}

@end
