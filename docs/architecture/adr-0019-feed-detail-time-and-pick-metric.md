# ADR-0019: 피드 상세 시간과 저장 지표 표시

## Decision

피드 상세의 `createdAt`과 `updatedAt`은 widget model의 순수 formatter에서
표시 문자열로 변환한다. 7일 미만은 상대시간, 7일부터는 절대 날짜를
표시하며 실제 수정 시각이 생성 시각보다 1초 이상 늦을 때만 수정 시간을
노출한다.

저장 버튼은 작성자 영역에서 이미지 하단 action row로 이동한다. 좋아요는
왼쪽, 저장은 오른쪽에 배치하고 각 버튼 옆에 `likeCount`와 `pickCount`를
표시한다. 저장 mutation은 public, 내 피드, 저장한 피드, 좋아요한 피드와
단일 상세 cache에 동일한 낙관적 갱신을 적용한다.

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
     Image Action Row
       ├─ Like Feature
       └─ Pick Feature
              ↓
        Feed Collection Cache
```

## Context

서버 DTO에는 생성·수정 시각과 저장 수가 이미 포함되어 있었지만 상세
화면에서 사용하지 않았다. 저장 버튼은 작성자 영역에 있어 이미지 위의
좋아요 액션과 분리됐고, 저장 mutation은 public 목록만 낙관적으로 변경해
다른 출처의 상세 화면에서는 저장 수가 즉시 갱신되지 않을 수 있었다.

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
widget은 두 action과 숫자의 배치만 책임지며, 외부 API 타입이나 mutation
상태를 새 UI domain으로 복제하지 않는다.

## Trade-off

얻는 것:

- 최근 활동과 오래된 게시 날짜를 구분하는 일관된 시간 표시
- 수정되지 않은 게시물의 중복 수정 시간 제거
- 이미지 위에서 좌우 균형을 이루는 좋아요·저장 action row
- 모든 피드 collection에서 즉시 동기화되는 저장 여부와 저장 수
- 외부 날짜 dependency 없는 순수 함수 테스트

포기하거나 제한한 것:

- 상대시간은 화면이 다시 렌더링되는 시점에 갱신되며 별도 1분 timer는 두지
  않는다.
- 7일과 1초 수정 판별 기준은 제품 정책이며 향후 사용자 테스트에 따라
  조정될 수 있다.
- 현재 locale은 한국어 표시를 기준으로 한다.

## Result

- 캡션 하단에 업로드 시간과 실제 수정된 경우의 수정 시간이 표시된다.
- 이미지 하단 왼쪽에는 좋아요 수, 오른쪽에는 저장 수가 표시된다.
- 저장/저장 취소 시 모든 상세 출처의 `pickCount`가 낙관적으로 갱신된다.
- 전체 Node 단위 테스트 116개와 iOS Expo export가 통과했다.
