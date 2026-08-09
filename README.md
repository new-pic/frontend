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
├── assets/
│   ├── fonts/                     # 앱에서 사용하는 폰트
│   └── images/                    # 아이콘, 스플래시 등 이미지 리소스
│
├── modules/
│   ├── vision-camera-pose/        # Pose Detection을 위한 VisionCamera 확장 모듈
│   └── vision-camera-rtc/         # RTC 연동을 위한 VisionCamera 확장 모듈
│
├── src/
│   ├── app/                       # Expo Router 라우팅 및 앱 전역 설정
│   │   ├── (tabs)/                # 메인 탭 라우트
│   │   ├── feed/                  # 피드 상세 라우트
│   │   ├── rtc/                   # RTC 참여 / Viewer 라우트
│   │   ├── _layout.tsx            # Root Layout 및 전역 Provider 설정
│   │   └── index.tsx
│   │
│   ├── pages/                     # 라우트별 화면 단위 구성
│   │   ├── camera/
│   │   ├── feed/
│   │   ├── profile/
│   │   ├── rtc-join/
│   │   ├── splash/
│   │   ├── welcome/
│   │   └── not-found/
│   │
│   ├── widgets/                   # 여러 Feature/Entity를 조합한 독립 UI 블록
│   │   ├── camera-header/
│   │   ├── feed/
│   │   │   ├── detail/
│   │   │   └── edit/
│   │   └── rtc-join-sheet/
│   │
│   ├── features/                  # 사용자 행동 및 기능 단위 비즈니스 로직
│   │   ├── camera/
│   │   │   ├── capture-photo/
│   │   │   ├── guide-feed/
│   │   │   ├── pose-detection/
│   │   │   └── pose-matching/
│   │   ├── feed/
│   │   │   ├── browse-feed-detail/
│   │   │   ├── feed-processing/
│   │   │   ├── update-feed-like/
│   │   │   └── update-feed-pick/
│   │   ├── profile/
│   │   │   └── save-user-setup/
│   │   ├── rtc/
│   │   │   ├── host-controls/
│   │   │   ├── join-room/
│   │   │   └── reactions/
│   │   ├── rtc-photo/
│   │   │   └── browse-stored-photos/
│   │   └── user/
│   │       └── save-social-login/
│   │
│   ├── entities/                  # 핵심 도메인 모델 및 데이터 접근
│   │   ├── feed/
│   │   ├── rtc/
│   │   ├── tags/
│   │   └── user/
│   │
│   └── shared/                    # 특정 도메인에 종속되지 않는 공통 코드
│       ├── api/                   # API Client, Interceptor 등 네트워크 기반 코드
│       ├── config/                # 환경 변수 및 공통 설정
│       ├── constants/             # 공통 상수
│       ├── hooks/                 # 공통 React Hooks
│       ├── lib/                   # 범용 유틸리티
│       ├── model/                 # 앱 전역 상태 및 공통 모델
│       └── ui/                    # 공통 UI Primitive / Component
│
├── app.json                       # Expo 앱 및 Native Plugin 설정
├── package.json
└── tsconfig.json                  # TypeScript 및 Path Alias 설정
```
