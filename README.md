<img src="./assets/images/icon.png" width="100" alt="Newpic logo" />

# Newpic - 프론트엔드

Newpic은 원하는 구도와 포즈로 사진을 촬영할 수 있도록 **실시간 포즈 가이드와 원격 촬영 기능**을 제공하는 모바일 서비스입니다.  
사진을 찍는 사람과 찍히는 사람 모두의 촬영 부담을 줄이고  
원하는 순간과 구도를 보다 쉽게 사진으로 남길 수 있도록 돕습니다.
<br/>
<br/>

## 주요 기능 ✨

- 사진 촬영
- 포즈 오버레이
- 실시간 포즈 비교 / 피드백
- RTC 기반 실시간 촬영 화면 공유
- 피드 업로드
- 기타

## 기술 스택 🛠️

### 1. App

- React Native
- Expo
- Typescript
- Expo Router

### 2. State / Server State

- Tanstack Query
- Zustand

### 3. Camera

- React Native Vision Camera
- MediaPipe Pose Landmarker

### 4. RTC

- Livekit / WebRTC

### 5. Network

- Axios

## 프로젝트 구조 📁

```text
src/
├── app/
├── pages/
├── widgets/
├── features/
├── entities/
└── shared/
```

자세한 설계 결정은 [아키텍처 문서](./docs/adr/001-frontend-architecture.md)에서 관리합니다.
