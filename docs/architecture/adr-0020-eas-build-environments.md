# ADR-0020: EAS 빌드 환경별 서버 설정

## Decision

EAS Build의 `development`, `preview`, `production` 프로필을 같은 이름의
EAS environment에 명시적으로 연결한다. 로컬 실행은 Git에서 제외된
`.env`를 계속 사용하고, EAS 클라우드 빌드는 EAS Dashboard에 등록한
환경 변수를 사용한다.

```text
Local .env ───────────────→ Local Expo bundle

EAS development environment ─→ development build
EAS preview environment ─────→ preview build
EAS production environment ──→ store production build
```

`EXPO_PUBLIC_*` 변수는 앱 번들에 포함되는 공개 설정이다. API base URL과
OAuth client ID에는 사용할 수 있지만 access token, client secret, private
key 같은 비밀값에는 사용하지 않는다.

## Context

앱은 `src/shared/config/env.ts`에서 다음 환경 변수를 읽는다.

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_WEB_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID`

로컬 `.env`는 Git에서 제외되어 있으므로 EAS 클라우드 빌드가 자동으로
받지 못한다. 앱스토어용 production 빌드가 운영 API 주소 없이 생성되거나
개발 서버를 바라보는 상황을 막기 위해 빌드 프로필과 EAS environment의
연결을 저장소에 명시한다.

환경 변수는 번들 생성 시점에 주입된다. Dashboard 값을 바꿔도 이미 설치된
앱이 실행 중에 새 값을 읽지는 않는다. 변경 사항을 반영하려면 새 production
빌드 또는 해당 환경으로 만든 EAS Update가 필요하다.

## Repository configuration

`eas.json`의 연결은 다음과 같다.

| Build profile | EAS environment | 배포 용도 |
| --- | --- | --- |
| `development` | `development` | 개발 클라이언트 및 내부 테스트 |
| `preview` | `preview` | 스토어 제출 전 내부 배포 |
| `production` | `production` | App Store 및 Google Play 제출 |

## EAS Dashboard setup checklist

> 아직 Dashboard에는 등록하지 않았다. 최초 production 빌드 전에 아래
> 절차를 완료해야 한다.

1. [Expo Dashboard](https://expo.dev/)에 로그인한다.
2. `newpic` 소유자의 `newpic` 프로젝트를 연다.
3. 프로젝트의 **Environment variables** 메뉴로 이동한다.
4. Environment로 **production**을 선택한다.
5. 아래 변수를 이름 그대로 등록한다.

| Variable | Production value | Visibility | 비고 |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://backend-production-e66d.up.railway.app/api` | Plain text | 끝에 `/`를 붙이지 않는다. |
| `EXPO_PUBLIC_WEB_GOOGLE_CLIENT_ID` | 운영용 Web OAuth client ID | Plain text | 현재 승인된 운영 값을 확인한다. |
| `EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID` | 운영용 iOS OAuth client ID | Plain text | bundle ID `com.significance.newpic`과 일치하는지 확인한다. |

6. `preview` 환경이 사용할 서버를 결정한 뒤 같은 변수 세 개를 등록한다.
   스테이징 서버가 없다면 운영 서버를 사용할 수 있지만, 내부 테스트가
   실제 운영 데이터를 변경한다는 점을 팀이 명시적으로 합의해야 한다.
7. `development` 클라우드 빌드가 필요하면 개발 서버와 개발 OAuth client
   ID를 같은 이름으로 등록한다. 로컬 실행만 할 때는 기존 `.env`를 사용한다.

## Production build checklist

production 빌드 전 다음을 확인한다.

- production environment에 필수 변수 세 개가 모두 존재한다.
- API URL이 HTTPS이고 `/api`를 포함하며 끝에 `/`가 없다.
- iOS OAuth client ID가 `com.significance.newpic` 설정과 일치한다.
- 운영 서버의 인증, 이미지 업로드, SSE, RTC API가 실제 기기에서 동작한다.
- preview와 production의 데이터 환경을 혼동하지 않는다.

빌드 명령은 다음과 같다.

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
```

스토어 제출 전 TestFlight 또는 Google Play 내부 테스트에서 최소 다음을
확인한다.

- 게스트 및 소셜 로그인
- 피드 목록, 작성, 수정, 이미지 업로드
- AI 처리 SSE와 완료 후 목록 갱신
- RTC 방 생성, 참여, 종료
- 운영 R2 이미지 URL 접근

## Alternatives

1. `eas.json`의 각 profile에 `env` 값을 직접 작성
   - 공개 URL을 단순하게 관리할 수 있지만 값 변경마다 커밋이 필요하고
     Dashboard/CI 환경 관리로 확장하기 어렵다.

2. 빌드 직전에 로컬 `.env`를 수동으로 변경
   - 설정 누락과 개발·운영 서버 혼동 가능성이 크며 클라우드 빌드 재현성이
     낮다.

3. EAS environment에서 profile별 변수 관리
   - 저장소에는 환경 연결 정책만 남고 실제 값은 EAS 프로젝트가 소유한다.

## Reason

빌드 프로필과 서버 환경을 일대일로 연결하면 앱스토어 빌드가 운영 서버를
사용한다는 정책을 저장소에서 확인할 수 있다. 환경별 값은 EAS Dashboard가
소유하므로 서버 주소나 OAuth client ID를 바꿀 때 `eas.json`을 수정할 필요가
없고, 로컬 개발 설정과 production 설정도 분리된다.

## Trade-off

- 얻는 것
  - 재현 가능한 EAS 빌드 환경
  - 개발·미리보기·운영 서버의 명확한 분리
  - 로컬 `.env`를 저장소에 올리지 않는 운영 방식
  - 앱스토어 빌드의 운영 API 주소 누락 방지

- 포기하거나 제한한 것
  - 최초 빌드 전 EAS Dashboard 설정이 필요하다.
  - Dashboard 설정 권한과 변경 이력을 팀에서 관리해야 한다.
  - 번들에 포함된 공개 변수는 runtime에 즉시 교체할 수 없다.

## Result

- `eas.json`의 세 build profile이 대응하는 EAS environment를 명시한다.
- 로컬 `.env` 내용은 변경하지 않는다.
- EAS Dashboard 등록은 아직 수행하지 않았으며 위 체크리스트를 따라
  production 빌드 전에 완료한다.

## References

- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [eas.json configuration](https://docs.expo.dev/eas/json/)
