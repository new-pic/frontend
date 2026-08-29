# ADR-0034: FSD 세그먼트의 책임 기반 hook 배치

## Decision

파일이 hook인지 여부가 아니라 코드가 소유하는 책임을 기준으로 FSD
세그먼트를 선택한다.

- feature의 입력 상태, 검증, 제출 준비, 사용자 흐름과 lifecycle을
  소유하는 hook은 해당 feature의 `model`에 둔다.
- 서버 요청과 React Query lifecycle을 소유하는 hook은 `api`에 둔다.
- 외부 라이브러리 경계, 플랫폼 adapter와 slice 내부에서 재사용하는
  집중된 기술 라이브러리는 `lib`에 둘 수 있다.
- 앱 도메인에 종속되지 않는 범용 hook은 기술 목적이 드러나는
  `shared/lib`의 하위 라이브러리에 둔다.

이에 따라 다음 feature hook을 `lib`에서 `model`로 이동한다.

- `create-feed-comment/model/use-create-feed-comment-form.ts`
- `save-feed/model/use-save-feed-form.ts`
- `save-user-setup/model/use-setup-form.ts`
- `save-social-login/model/use-social-login.ts`

`useDebouncedValue`는 React 상태 업데이트를 지연하는 범용 기술
라이브러리이므로 `shared/lib/debounce`로 이동한다. 반면 플랫폼별 확인창
adapter인 `useConfirm`처럼 hook 형태이더라도 기술 라이브러리 책임을
가진 코드는 `shared/lib`에 유지한다.

`useMemberAccess`와 `useAuthStore`의 소유권 변경은 이번 결정에서
보류한다. 두 모듈은 경로만 옮기면 FSD layer import 규칙이나 인증
lifecycle을 훼손할 수 있으므로 별도 설계와 검증이 필요하다.

## Context

기존 구조에는 feature의 상태와 use-case를 소유하는 hook 일부가 `lib`에
있고, 범용 hook과 회원 접근 비즈니스 흐름이 `shared/hooks`에 함께
배치되어 있었다. 이 구조는 hook이라는 코드 형태를 먼저 드러내지만,
파일이 상태 모델인지 외부 adapter인지 구조만으로 구분하기 어렵다.

FSD 공식 문서는 `model`을 schema, interface, store와 business logic의
세그먼트로 정의하고, `lib`를 해당 slice의 다른 모듈이 사용하는 library
code로 정의한다. 또한 `hooks`, `types`, `components`처럼 내용의 형태만
표현하는 세그먼트 이름을 권장하지 않는다.

- <https://feature-sliced.design/docs/reference/slices-segments>
- <https://feature-sliced.design/docs/reference/layers>

따라서 `lib`는 Shared 전용이 아니며 모든 hook을 `model`로 이동하는 것도
올바르지 않다. 코드의 상태 소유권, 데이터 흐름, 외부 경계와 실패 영향에
따라 세그먼트를 결정해야 한다.

## Alternatives

### Option A: 모든 custom hook을 model로 이동

경로 규칙은 단순해지지만 React Query hook, 플랫폼 adapter와 UI 전용
hook까지 상태 모델로 오인하게 된다. 파일 형태를 기준으로 분류하므로
FSD가 의도하는 책임 기반 세그먼트와 맞지 않는다.

### Option B: 책임이 명확한 hook부터 단계적으로 이동

feature 상태와 lifecycle hook은 `model`로 옮기고, 범용 기술 hook은
집중된 `shared/lib`로 옮긴다. 인증처럼 layer 소유권 결정이 필요한
항목은 별도 설계로 분리한다.

### Option C: Shared 인증과 feature 간 의존까지 한 번에 재구성

최종 구조를 한 번에 맞출 수 있지만 token 복원, guest 계정 연결,
navigation과 여러 feature의 회원 접근 흐름이 동시에 변경된다. 구조
정리의 회귀 범위가 인증 및 주요 사용자 동작 전체로 확대된다.

## Reason

Option B를 선택했다. 현재 동작과 공개 API를 보존하면서 책임이 명확한
잘못된 배치부터 수정할 수 있고, 인증 상태의 lifecycle과 feature 간
의존 문제를 충분히 설계하기 전에 파일 위치만 확정하는 것을 피할 수
있기 때문이다.

변경 후 기본 데이터 흐름은 다음과 같다.

```text
Feature UI
  ↓
Feature model hook
  ↓
Entity api / model
  ↓
Shared external adapter / infrastructure
```

상태와 lifecycle 소유권은 다음과 같이 유지한다.

- 댓글, 피드, 프로필 form 상태와 validation: 각 feature의 model hook
- 로그인 provider 진행 상태와 로그인 후 분기: `save-social-login` model
- 서버 mutation과 query cache: entity api의 React Query hook
- debounce timer 생성과 정리: `shared/lib/debounce`
- token 복원, 약관 동의와 guest session: 기존 `useAuthStore`에서 유지

`react-hook-form`은 feature model이 입력 상태와 validation lifecycle을
구현하기 위한 외부 라이브러리 경계로 유지한다. Apple/Google SDK 호출은
현재 로그인 use-case와 강하게 결합되어 있어 이번 이동에서는 분리하지
않는다. provider 교체가 필요해지면 인증 adapter와 로그인 후처리 model을
분리하는 후속 결정을 검토한다.

파일 이동 실패는 TypeScript import 또는 테스트의 직접 경로 오류로
한정되며 런타임 상태 모델은 변경하지 않는다. 공개 소비자는 각 slice의
`index.ts`를 계속 사용하므로 외부 호출 계약도 유지한다.

## Deferred Decisions

### `useMemberAccess`

현재 `shared/hooks/use-member-access.ts`는 guest 여부 판정뿐 아니라 확인창,
계정 연결 준비와 navigation까지 수행한다. 이는 앱 비즈니스 흐름이므로
Shared의 책임과 맞지 않는다.

하지만 이를 `features/user/guard-member`로 단순 이동하면 댓글, 좋아요,
피드 저장 feature가 같은 Feature layer의 다른 slice를 import하게 된다.
FSD의 layer import 규칙을 지키려면 회원 상태 판정과 사용자 유도 UI를
분리하거나, Widget/Page가 두 feature를 조합하도록 소비 구조를 변경해야
한다. 이 결정은 회원 전용 action 전체에 영향을 주므로 별도 작업으로
진행한다.

### `useAuthStore`

현재 `shared/model/auth-store.ts`는 token 저장과 복원, 약관 동의, guest
여부와 계정 연결 준비 상태를 함께 소유한다. Shared는 원칙적으로 특정
비즈니스 도메인을 소유하지 않아야 하므로 장기적으로는 위치와 책임을
재검토해야 한다.

다만 auth store를 이동하려면 다음 항목을 먼저 결정해야 한다.

- 인증 session의 소유자를 `entities/user`, 별도 auth entity 또는 App
  초기화 영역 중 어디로 둘지
- SecureStore adapter와 session domain의 경계를 어디에서 나눌지
- Expo Router root 초기화와 token refresh가 새 public API만 사용하도록
  어떻게 변경할지
- guest session과 일반 회원 session을 같은 store에 유지할지
- `useMemberAccess`가 store 구현이 아닌 어떤 interface에 의존할지

이 결정 없이 경로만 이동하면 광범위한 import 변경만 만들고 실제 계층
책임은 개선되지 않는다. 따라서 이번 작업에서는 현재 동작을 유지한다.

후속 ADR-0038은 Auth Store의 파생 상태와 Session/Query cache lifecycle을
재검증했지만 Store의 FSD 위치는 변경하지 않았다. 따라서 이 문서의 위치
보류 결정은 계속 유효하다.

## Trade-off

얻은 것:

- feature 상태와 사용자 흐름의 위치를 `model`로 일관화
- hook이라는 형태가 아닌 책임을 기준으로 한 세그먼트 규칙
- 범용 debounce 기능을 목적이 드러나는 Shared 라이브러리로 격리
- 기존 feature public API와 런타임 동작 보존
- 인증 구조 변경을 별도 검증 가능한 작업으로 분리

제한:

- `shared/hooks`에는 `useMemberAccess`가 당분간 남는다.
- `shared/model/auth-store.ts`의 도메인 책임 문제는 해결하지 않는다.
- 일부 기존 `lib` 파일의 model/api/ui 경계는 후속 책임 감사가 필요하다.
- 로그인 provider SDK와 로그인 후처리는 아직 하나의 model hook에 함께
  존재한다.

## Result

- 책임이 명확한 feature hook 4개를 `model`로 이동했다.
- `useDebouncedValue`를 `shared/lib/debounce`로 이동하고 두 소비자의 import를
  새 public API로 변경했다.
- 기존 slice public API가 같은 hook과 타입을 계속 노출하도록 유지했다.
- `useMemberAccess`와 `useAuthStore`는 동작 변경 없이 유지하고 후속 설계
  조건을 기록했다.
- TypeScript 검사(`pnpm exec tsc --noEmit`)를 통과했다.
- iOS Metro export(`expo export --platform ios`)를 완료해 이동한 모듈과
  public API가 실제 앱 bundle에서 해석되는 것을 확인했다.
- 로그인·프로필 관련 테스트 15개를 통과했다.
- 전체 Node 테스트에서는 183개 중 182개가 통과했다. 이번 변경과 무관한
  `rtc-host-controls.test.cjs`가 기존 `rtc-room-event-state.ts`의 확장자 없는
  ESM import를 해석하지 못해 실패했다.
- lint는 저장소에 ESLint 설정과 의존성이 없어 실제 검사를 실행하지
  못했다. `expo lint`의 자동 설치도 네트워크 차단과 PNPM store 불일치로
  중단됐으며, 자동 설치에 의한 파일 변경은 남지 않았다.
