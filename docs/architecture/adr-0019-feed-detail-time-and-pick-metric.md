# ADR-0019: 피드 상세 시간과 저장 action

## Decision

피드 상세의 `createdAt`과 `updatedAt`은 widget model의 순수 formatter에서
표시 문자열로 변환한다. 7일 미만은 상대시간, 7일부터는 절대 날짜를
표시하며 실제 수정 시각이 생성 시각보다 1초 이상 늦을 때만 수정 시간을
노출한다.

저장 버튼은 작성자 영역에서 이미지 상단 오른쪽 overlay로 이동하고 아이콘만
표시한다. 좋아요는 이미지 하단 왼쪽에서 `likeCount`와 함께 유지하지만,
저장 수는 현재 상세 UI에서 노출하지 않는다. 저장 mutation은 public, 내
피드, 저장한 피드, 좋아요한 피드와 단일 상세 cache에 동일한 낙관적 갱신을
적용한다. 저장 여부와 개수는 `onMutate`에서 즉시 변경하지만 저장 목록의
membership은 서버 성공 후에만 제거한다. `onMutate`에서 이전 저장 상태와
개수를 기록하고, 실패하면 해당 필드만 rollback한다. cache 전체를
복원하지 않으므로 그 사이 발생한 다른 cache 변경은 유지된다.

```text
FeedResponse
  ├─ createdAt / updatedAt
  │       ↓
  │  Feed Detail Time Formatter
  │       ↓
  │  Caption Metadata
  │
  └─ isLiked / likeCount / isPicked / pickCount
          ↓
     Image Actions
       ├─ Bottom-left: Like Feature + likeCount
       └─ Top-right: Pick Feature
              ↓
        Feed Collection Cache
```

## Context

서버 DTO에는 생성·수정 시각과 저장 수가 이미 포함되어 있었지만 상세
화면에서 사용하지 않았다. 저장 버튼은 작성자 영역에 있어 이미지 문맥의
좋아요 액션과 분리됐고, 저장 mutation은 public 목록만 낙관적으로 변경해
다른 출처의 상세 화면에서는 저장 상태가 즉시 갱신되지 않을 수 있었다.

## Alternatives

### 컴포넌트에서 날짜를 직접 계산

수정 범위는 작지만 현재 시각을 고정한 단위 테스트가 어렵고 상대시간
경계가 UI에 섞인다.

### 외부 날짜 라이브러리 사용

다국어와 복잡한 달력 기능은 풍부하지만 현재 분·시간·일·절대 날짜 전환만을
위해 dependency와 번들 비용을 추가한다.

### 내장 Intl 기반 순수 formatter

외부 dependency 없이 formatter를 테스트할 수 있고 향후 locale 정책을
바꿀 수 있다. 현재 피드 상세 요구에 필요한 범위만 책임진다.

## Reason

날짜 표시 기준은 entity 원본 DTO가 아니라 화면 표현 정책이므로 widget
model에 둔다. formatter는 `now`를 인자로 받을 수 있어 7일 경계와 미래
시간 보정을 결정적으로 테스트한다. 잘못된 timestamp는 전체 상세 화면을
실패시키지 않고 해당 metadata만 숨긴다.

좋아요와 저장 feature는 각각 mutation과 인증 gate를 계속 소유한다. 상세
widget은 이미지 위 action 배치만 책임지며, 외부 API 타입이나 mutation
상태를 새 UI domain으로 복제하지 않는다. `pickCount`는 entity/cache에는
보존하지만 현재 제품 UI에서는 저장 여부만 전달한다.

저장 성공 시에는 새 항목과 Camera 가이드 목록의 동기화를 위해 저장 목록을
다시 조회한다. 저장 취소는 성공한 항목만 현재 저장 목록 cache에서 제거하며,
전체 목록 재조회와 직접 제거를 중복 실행하지 않는다.

## Trade-off

얻는 것:

- 최근 활동과 오래된 게시 날짜를 구분하는 일관된 시간 표시
- 수정되지 않은 게시물의 중복 수정 시간 제거
- 이미지 위에서 분리된 좋아요·저장 action 위치
- 모든 피드 collection에서 즉시 동기화되는 저장 여부와 서버 `pickCount`
- 서버 성공 전 저장 목록의 위치와 상세 탐색 흐름 유지
- 외부 날짜 dependency 없는 순수 함수 테스트

포기하거나 제한한 것:

- 상대시간은 화면이 다시 렌더링되는 시점에 갱신되며 별도 1분 timer는 두지
  않는다.
- 7일과 1초 수정 판별 기준은 제품 정책이며 향후 사용자 테스트에 따라
  조정될 수 있다.
- 현재 locale은 한국어 표시를 기준으로 한다.
- 저장 수는 현재 상세 화면에서 보이지 않으므로 사용자는 저장 action의
  상태만 확인할 수 있다.
- 저장 취소가 성공할 때까지 저장 목록에는 취소 상태의 피드가 잠시 남을 수
  있다.

## Result

- 캡션 하단에 업로드 시간과 실제 수정된 경우의 수정 시간이 표시된다.
- 시간 metadata는 캡션과 간격을 두고 우측 정렬하며 모바일에서 읽을 수 있는
  text size를 사용한다.
- 이미지 하단 왼쪽에는 좋아요 수가 표시되고, 저장 버튼은 개수 없이 이미지
  상단 오른쪽에 표시된다.
- 저장/저장 취소 시 모든 상세 출처의 `pickCount`가 낙관적으로 갱신된다.
- 저장 취소 성공 후에만 저장 목록에서 항목을 제거하고 실패하면 기존 상태로
  복구한다.
- 전체 Node 단위 테스트 116개와 iOS Expo export가 통과했다.
