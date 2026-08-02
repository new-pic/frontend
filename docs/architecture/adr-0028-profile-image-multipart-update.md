# ADR-0028: 프로필 이미지 multipart 수정

## Decision

프로필 수정 폼은 선택한 이미지의 URI와 파일 메타데이터만
소유한다. ImagePicker가 반환한 원시 타입은 feature adapter에서
프로젝트 폼 타입으로 변환하고, 사용자가 제출할 때만 Expo
`File`로 변환한다.

프로필 수정 API는 기존 JSON Axios 호출 대신 `ObjectToFormData`와
`uploadFetchClient.patch` 경계를 사용한다. `profileImage`는 optional이며
닉네임만으로도 multipart 요청을 전송할 수 있다.

프로필 이미지 삭제는 서버 계약에 없으므로 이번 범위에 포함하지
않고, UI에는 사진 선택 또는 변경 동작만 제공한다.

## Context

기존 프로필 수정 화면은 빈 닉네임 필드만 표시했고,
`profileImage` 검증 타입이 string으로 정의되어 서버의 multipart
파일 계약과 맞지 않았다. 프로젝트에는 이미 다음 공용 경계가
있었다.

- `expo/fetch`를 사용하는 `uploadFetchClient`
- 인증 토큰 갱신 후 401 재시도
- Expo `File`을 지원하는 `ObjectToFormData`
- 로컬 URI를 Expo `File`로 변환하는 `uriToFile`

## Alternatives

### Option A: 제출 시 File로 변환

폼은 중립적인 이미지 메타데이터만 관리하고, 제출 adapter가
Expo `File`로 변환한다.

### Option B: 선택 즉시 File로 변환

제출 코드는 간단하지만 폼 상태가 Expo File 구현에 결합되고
재선택과 이탈 시 임시 파일 수명 주기가 복잡해진다.

### Option C: 선택 즉시 이미지를 별도 업로드

프로필 수정 요청과 이미지 업로드가 분리되어 부분 성공 상태와
추가 서버 API가 필요하다.

## Reason

Option A를 선택했다. UI form과 외부 ImagePicker/File API 사이의 경계가
명확하고, 미리보기와 optional 검증을 순수한 폼 상태로 다룰 수
있기 때문이다.

```text
System Photo Library
  ↓
expo-image-picker
  ↓
Profile Image Picker Adapter
  ↓
Profile Edit Form
  ↓ submit
Expo File Adapter
  ↓
FormData
  ↓
uploadFetchClient
  ↓
Profile Query refresh
```

## Trade-off

얻은 것:

- ImagePicker 원시 타입을 feature 밖으로 노출하지 않음
- 이미지 없이 닉네임만 수정 가능
- 선택 취소와 업로드 실패 시 폼 상태 유지
- 기존 파일 클라이언트의 인증 갱신과 오류 변환 재사용

제한:

- 이미지 선택 결과를 제출 요청으로 바꾸는 adapter가 추가된다.
- 서버의 명시적인 삭제 계약이 없어 기존 프로필 이미지 삭제는
  지원하지 않는다.
- ImagePicker 권한 문구 변경은 새 네이티브 빌드에서 반영된다.

## Result

- 기존 프로필 이미지와 새로 선택한 이미지를 큰 원형으로
  미리보기할 수 있다.
- 선택 이미지가 있는 경우에만 multipart `profileImage`를 전송한다.
- 성공 후 현재 사용자 Query를 갱신하고, 실패하면 폼과 미리보기를
  유지한다.
- 폼 검증, File 변환, 미리보기 우선순위, multipart 경계 단위
  테스트를 추가했다.
- iOS Expo export를 통과했다. 실제 iOS/Android 기기에서 사진 선택,
  크롭, multipart 업로드 결과를 최종 확인해야 한다.
