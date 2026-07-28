require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "VisionCameraPose"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/newpic/newpic"
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "16.4" }
  s.source       = { :path => "." }
  s.requires_arc = true
  s.source_files = [
    "ios/**/*.swift",
    "cpp/**/*.{hpp,cpp}",
  ]
  s.resource_bundles = {
    "VisionCameraPoseResources" => ["models/*.task"]
  }
  s.frameworks = [
    "AVFoundation",
    "CoreImage",
    "CoreMedia",
    "CoreVideo",
    "ImageIO",
  ]

  load "nitrogen/generated/ios/VisionCameraPose+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "VisionCamera", "5.0.11"
  s.dependency "MediaPipeTasksVision", "0.10.35"
  s.dependency "React-Core"
  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
