# ADR-0018: 루트 피드 게시 파이프라인

## Decision

피드 작성·수정 폼은 모드별 Zod 검증과 생성 이미지의 cache staging까지만
수행한다. 검증된 명령은 단일 슬롯 Zustand store에 등록하고 피드 화면으로
즉시 복귀한다. 실제 생성 upload와 수정 PATCH는 앱 루트의
`FeedPublishingCoordinator`가 수행한다.

작성·수정 폼은 임시저장하지 않는다. Expo Router route가 stack에 남아도
화면 focus를 잃으면 폼 값, 선택 이미지와 작성 단계를 폐기하고, 다시 focus될
때 작성은 빈 값으로, 수정은 현재 서버 응답으로 초기화한다.

생성 upload가 성공하면 기존 `FeedProcessingCoordinator`에 서버 AI job을
인계한다. 게시 명령, AI 처리, 완료 목록 갱신을 하나의 게시 파이프라인으로
보고 이 중 하나가 진행 중이면 새 피드 작성 FAB을 비활성화한다.

```text
Create/Edit Form Input
  ↓ mode-specific Zod validation
  ↓ CREATE: selected image → Expo File cache staging
Feed Publishing Command Store (single slot)
  ↓
Root FeedPublishingCoordinator
  ├─ CREATE: Expo File + FormData upload
  │              ↓
  │       FeedProcessingCoordinator
  │       Status/SSE/Polling → list refresh
  └─ UPDATE: PATCH → React Query cache sync
  ↓
Root Status Badge / Feed FAB Lock
```

## Context

기존 작성 화면은 upload 응답이 끝날 때까지 현재 route에 머물렀고, 서버
오류 객체를 `Error` 문자열로 직접 변환해 `[object Object]`를 표시했다.
수정 화면도 생성 폼과 같은 이미지 필수 스키마를 사용했지만 기존 이미지
URI를 폼에 채우지 않아, 화면에 보이지 않는 validation 오류가 제출을
막았다.

사용자는 게시 요청 후 피드 탐색을 계속할 수 있어야 한다. 동시에 현재
서버와 클라이언트는 여러 upload를 병렬 추적하는 UI·복구 정책을 갖고 있지
않으므로 하나의 게시 파이프라인만 허용해야 한다.

## Alternatives

### 폼이 네트워크 요청 완료까지 소유

구현은 단순하지만 route 이탈과 네트워크 lifecycle이 결합되고 긴 upload
동안 사용자가 폼에 묶인다.

### 폼이 생성 upload만 수행하고 AI job만 루트에 인계

기존 AI 처리 구조를 그대로 활용할 수 있지만 가장 오래 걸릴 수 있는 파일
upload 동안 폼에 남는 문제가 유지된다. 수정 요청도 별도 lifecycle을 갖게
된다.

### 폼은 검증·staging만 하고 모든 요청을 루트에서 수행

route와 upload lifecycle을 분리하고 생성·수정·재시도·전역 잠금을 한 곳에서
관리한다. 대신 cache 임시 파일의 소유권과 정리 시점을 명시해야 한다.

## Reason

선택한 구조는 사용자 입력 책임과 네트워크 책임의 경계를 명확히 한다.
폼은 제출 가능한 명령을 만드는 즉시 종료할 수 있고, 루트 coordinator는
route 변경과 무관하게 요청을 지속한다. 생성 원본은 staging된 cache 파일로
고정하므로 앨범 URI의 lifecycle에 의존하지 않는다.

외부 경계는 다음처럼 격리한다.

- React Hook Form과 Zod는 `save-feed`의 입력 검증 경계에 둔다.
- Expo `File`과 `FormData`는 entity upload 요청 직전에만 만든다.
- Axios와 `expo/fetch` 오류 payload는 공통 API 오류 adapter에서 사용자
  메시지로 변환한다.
- 서버 AI 상태 transport는 기존 processing coordinator가 계속 소유한다.
- React Query cache 갱신은 entity mutation hook이 소유한다.

upload 전용 `expo/fetch`도 Axios와 같은 single-flight token refresh 함수를
공유해 인증 만료 시 한 번 갱신 후 요청을 재시도한다.

## Trade-off

얻는 것:

- 폼 검증·파일 준비 후 즉시 피드 화면으로 복귀하는 게시 경험
- route와 독립적인 생성·수정 요청 lifecycle
- `[object Object]` 대신 서버 메시지를 보존하는 오류 처리
- 생성과 수정에 맞는 별도 validation contract
- 실패 명령 재시도와 cache 임시 파일의 명시적인 정리
- 게시부터 AI 처리·목록 갱신까지 하나의 전역 잠금

포기하거나 제한한 것:

- 현재는 하나의 게시 파이프라인만 허용하므로 진행 중에는 새 작성 FAB을
  사용할 수 없다.
- 실패 task는 사용자가 재시도하거나 닫기 전까지 단일 슬롯을 점유한다.
- store가 메모리 기반이라 앱 프로세스 종료 후 upload 명령은 복구하지 않는다.
- native background upload service는 사용하지 않으므로 OS가 앱을 종료하면
  진행 중 upload도 종료될 수 있다.

## Result

- 작성 화면은 이미지 cache staging 후 루트에 명령을 넘기고 즉시 피드로
  이동한다.
- 수정 화면은 기존 이미지 재업로드 없이 description과 tags만 검증·전송한다.
- 수정 상세 로딩 중 전용 skeleton을 표시하고 최초 응답으로 폼을 한 번만
  초기화해 사용자의 편집을 refetch가 덮어쓰지 않는다.
- 화면을 벗어나면 transient 폼 상태를 폐기해 재진입 시 이전 작성·수정
  내용이 남지 않는다.
- 게시 실패는 루트 배지에서 확인하고 같은 명령으로 재시도할 수 있다.
- 전체 Node 단위 테스트 108개와 iOS Expo export가 통과했다.
- TypeScript 검사에서 이번 변경 파일의 오류는 없었으며 기존 checkbox와
  spinner 타입 오류만 남아 있다.
- ESLint 설정이 저장소에 없어 Expo CLI의 자동 설치가 필요했지만, 오프라인
  환경이라 lint 실행은 완료하지 못했다.
