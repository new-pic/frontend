cmake_minimum_required(VERSION 3.13)
project(VisionCameraPose)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

add_library(
  VisionCameraPose
  SHARED
  src/main/cpp/cpp-adapter.cpp
)

include(${CMAKE_CURRENT_SOURCE_DIR}/../nitrogen/generated/android/VisionCameraPose+autolinking.cmake)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-nitro-modules REQUIRED CONFIG)
find_package(VisionCamera REQUIRED CONFIG)

target_include_directories(
  VisionCameraPose
  PRIVATE
  src/main/cpp
)

target_link_libraries(
  VisionCameraPose
  fbjni::fbjni
  ReactAndroid::jsi
  ReactAndroid::reactnative
  react-native-nitro-modules::NitroModules
  VisionCamera::VisionCamera
)
