# ADR-0017: 피드 좋아요 인터랙션과 모바일 터치 규격

## Decision

피드 상세의 좋아요 버튼과 이미지 더블 탭은 하나의
`useFeedLikeController`를 공유한다. 더블 탭은 현재 상태를 반대로
전환하며, 좋아요는 채워진 하트 확대, 좋아요 취소는 외곽선 하트 축소
애니메이션으로 구분한다.

좋아요 여부와 개수는 mutation `onMutate`에서 모든 Feed cache에 즉시
반영한다. 좋아요한 피드 목록의 membership은 서버 성공이 확정된 뒤에만
제거하고, `onMutate`에서 이전 상태와 개수를 기록한다. 요청 실패 시
해당 필드만 rollback하며, cache 전체를 과거 snapshot으로
복원하지 않으므로, 요청 이후 발생한 다른 피드나 다른 필드의 변경은
유지된다.

좋아요·저장 mutation과 동일 피드의 삭제 mutation이 교차하면 삭제 rollback
snapshot만으로 최종 서버 상태를 결정하지 않는다. 삭제 mutation의 성공 또는
실패 처리가 끝난 `onSettled`에서 Public/User Feed collection을 invalidate한다.
활성 Query는 서버 상태를 다시 조회하고, 비활성 Query는 다음 사용 시 재조회해
교차 rollback 순서와 무관하게 최종 일관성을 회복한다.

앱 공통 `Button`은 최소 48의 터치 영역을 제공하고, 시각 아이콘 크기는
터치 영역과 분리한다. 피드 상세의 본문, 댓글, 작성자 정보와 직접
`Pressable`을 사용하는 댓글 정렬 컨트롤도 같은 가독성·터치 기준에
맞춘다.

## Context

기존 피드 좋아요 버튼은 이미지 위에서 32 크기로 렌더링되어 실제
기기에서 누르기 어려웠다. 버튼 컴포넌트가 인증 확인, throttle,
mutation을 직접 소유하고 있어 이미지 제스처에 같은 기능을 추가하면
중복 요청 제어와 pending 상태가 분리될 수 있었다.

또한 공통 아이콘 버튼의 최소 영역이 36이고 일부 텍스트 컨트롤에는
최소 터치 영역이 없었다. 피드 상세만 확대하면 다른 페이지와의
인터랙션 규격 차이가 계속 남는다.

Feed cache 전체 snapshot 복원을 제거한 뒤에도 동일 피드의 mutation 순서가
교차하는 경우가 남았다. 좋아요 낙관적 갱신 후 삭제가 목록 항목을 제거하면,
좋아요 실패 rollback은 사라진 목록 항목을 갱신할 수 없다. 이후 삭제까지
실패하면 삭제 시점에 기록한 낙관적 상태가 목록에 복구될 수 있다.

## Alternatives

### 피드 상세만 국소 수정

회귀 범위는 작지만 공통 화면의 작은 버튼 문제가 남고 이후 화면마다
같은 크기 보정을 반복해야 한다.

### 공통 터치 규격과 피드 상세를 함께 개선

공통 버튼의 최소 터치 영역을 올리고 시각 크기를 별도로 관리한다.
피드 좋아요 동작은 feature controller로 모으고, widget은 이미지
제스처와 버튼을 조합한다.

### 전체 디자인 시스템을 한 번에 재정의

타이포그래피와 모든 컴포넌트를 완전히 통일할 수 있지만 카메라, RTC,
폼처럼 밀도가 다른 화면의 회귀 범위가 지나치게 커진다.

### Feed별 mutation revision 추적

각 Feed mutation에 순서를 부여하면 교차 rollback도 로컬 cache에서 즉시
해결할 수 있다. 반면 revision 저장소, mutation 완료 정리와 동시성 규칙을
추가로 소유해야 해 현재 Feed cache lifecycle에 비해 복잡도가 크다.

### 삭제 종료 후 Feed collection 재검증

삭제가 성공하거나 실패한 뒤 Public/User collection을 stale 상태로 만들고
서버를 최종 기준으로 사용한다. 추가 조회 가능성은 있지만 별도 전역 mutation
상태 없이 동일 피드의 교차 rollback을 수렴시킬 수 있다.

## Reason

공통 터치 영역과 시각 아이콘을 분리하면 좁은 화면의 배치를 유지하면서
iOS와 Android의 모바일 터치 권장 크기를 함께 충족할 수 있다. 좋아요
controller를 한 번만 생성하면 버튼과 더블 탭이 같은 인증, pending,
500ms throttle을 사용하므로 빠른 중복 입력이 별도 mutation으로
갈라지지 않는다.

```text
Like Button / Image Double Tap
  ↓
useFeedLikeController
  ↓
Member Gate + Pending/Throttle
  ↓
Feed Like/Unlike Mutation
  ├─ onMutate: 상태와 개수 낙관적 갱신
  ├─ onSuccess(unlike): 좋아요 목록에서 제거
  └─ onError: 좋아요 상태·개수만 rollback
  ↓
Feed Detail UI

Concurrent Like/Pick + Delete
  ↓
Delete Mutation Settled
  ↓
Invalidate Public/User Feed Collections
  ↓
Active Query Refetch / Inactive Query Refetch on Next Use

Accepted Double Tap
  ↓
Reanimated Heart Feedback
```

Gesture Handler와 Reanimated는 feature UI 내부에 격리한다. 서버 상태와
목록 cache는 entity query가 소유하고, 하트의 opacity와 scale 같은
일시적인 상태만 애니메이션 컴포넌트가 소유한다.

삭제 종료 후 재검증은 mutation revision을 별도 상태로 추가하지 않으면서
React Query의 stale/refetch lifecycle을 이용한다. 삭제는 빈도가 낮고 서버가
좋아요·저장·삭제의 최종 결과를 소유하므로 복잡한 로컬 순서 추적보다 서버
상태로 수렴시키는 편이 현재 책임 경계에 적합하다.

## Trade-off

얻는 것:

- 버튼과 이미지 제스처가 공유하는 단일 좋아요 lifecycle
- public, 내 피드, 저장한 피드, 좋아요한 피드 cache의 일관된 낙관적 갱신
- 서버 성공 전 좋아요 목록의 위치와 상세 탐색 흐름 유지
- 48 크기의 공통 터치 영역과 접근성 label
- 스크롤·슬라이드와 분리된 활성 이미지 더블 탭 제스처
- 좋아요와 취소를 구분하는 즉각적인 시각 피드백
- 동일 피드의 좋아요·저장·삭제 rollback 순서와 무관한 최종 서버 상태 수렴

포기하거나 제한된 것:

- 공통 버튼 높이 증가에 따라 고밀도 화면의 실기기 회귀 검증이 필요하다.
- gesture 애니메이션은 낙관적 요청 승인 시 시작하므로 서버가 실패하면
  잠시 표시된 뒤 cache 상태가 rollback될 수 있다.
- 좋아요 취소가 성공할 때까지 좋아요 목록에는 취소 상태의 피드가 잠시
  남을 수 있다.
- 삭제 mutation 종료 시 활성 Feed collection의 추가 조회가 발생할 수 있다.
- 비활성 Feed collection은 다음 사용 전까지 stale cache를 보유하지만,
  활성화 시 서버 상태를 다시 조회한다.
- 앱 전체 타이포그래피를 일괄 확대하지 않고 의미가 분명한 본문과
  인터랙션 요소부터 단계적으로 적용한다.

## Result

- 피드 상세 이미지 더블 탭으로 좋아요와 좋아요 취소가 전환된다.
- 좋아요 버튼과 더블 탭은 동일한 인증, pending, throttle을 사용한다.
- 좋아요 취소는 상태를 즉시 변경하되 서버 성공 후 좋아요 목록에서
  제거하고, 실패하면 기존 상태로 복구한다.
- 삭제 종료 시 Public/User Feed collection을 invalidate하며, 동일 피드의
  update 실패와 삭제 실패가 교차하는 순서를 회귀 테스트로 검증한다.
- 공통 버튼 최소 터치 영역을 48로 변경하고 아이콘은 24~32로 유지했다.
- 피드 상세 작성자·본문·댓글의 시각 크기와 댓글 정렬 터치 영역을 키웠다.
- 전체 Node 테스트 103개와 iOS Expo export가 통과했다.
- TypeScript 검사에서 이번 변경 파일의 오류는 없었으며 기존
  checkbox와 spinner 타입 오류만 남아 있다.
