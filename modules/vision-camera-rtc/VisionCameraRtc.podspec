require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "VisionCameraRtc"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/newpic/newpic"
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "16.4" }
  s.source       = { :path => "." }
  s.requires_arc = true
  s.source_files = [
    "ios/**/*.{h,m,mm,swift}",
    "cpp/**/*.{hpp,cpp}",
  ]
  s.public_header_files = "ios/Public/**/*.h"
  s.frameworks = ["AVFoundation", "CoreMedia", "CoreVideo"]

  load "nitrogen/generated/ios/VisionCameraRtc+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "VisionCamera", "5.0.11"
  s.dependency "livekit-react-native-webrtc", "144.1.2"
  s.dependency "WebRTC-SDK", "144.7559.10"
  s.dependency "React-Core"
  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
