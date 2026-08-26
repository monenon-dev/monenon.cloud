# Monenon Flutter

Monenon AI 라이프 어시스턴트 모바일 앱. 백엔드: `https://api.monenon.cloud` (JWT + Redis refresh).

## 실행

```bash
cd flutter
flutter pub get

# 로컬 API
flutter run

# 프로덕션 API + 카카오
flutter run \
  --dart-define=USE_PRODUCTION=true \
  --dart-define=KAKAO_NATIVE_APP_KEY=YOUR_NATIVE_APP_KEY
```

Android 매니페스트 placeholder용으로도 같은 키가 필요합니다.

```bash
# android/local.properties 에 추가하거나:
export KAKAO_NATIVE_APP_KEY=YOUR_NATIVE_APP_KEY
```

iOS:

```bash
cp ios/Flutter/Kakao-Keys.xcconfig.example ios/Flutter/Kakao-Keys.xcconfig
# 파일에 KAKAO_NATIVE_APP_KEY=... 기입
```

## 카카오 콘솔 설정 (웹 키와 다름)

웹은 **REST API 키 / JavaScript 키**를 씁니다. Flutter SDK는 **네이티브 앱 키**가 필요합니다.

1. [Kakao Developers](https://developers.kakao.com)에서 **기존 Monenon 앱**을 연다 (앱을 새로 만들지 않아도 됨).
2. 플랫폼 추가:
   - **Android**: 패키지명 `com.example.my_first_app` (또는 변경한 applicationId), 키 해시 등록
   - **iOS**: 번들 ID 등록
3. **Redirect URI**: `kakao{NATIVE_APP_KEY}://oauth`
4. 동의 항목: 이메일(필수 — 백엔드가 이메일로 사용자를 찾음)

## 로그인 API

| 클라이언트 | `POST /auth/kakao` body |
|-----------|-------------------------|
| 웹 | `{ "code", "redirect_uri" }` |
| Flutter | `{ "access_token": "<Kakao SDK token>" }` |

응답은 동일: Moneo `access_token` + `refresh_token` (+ `user_id`, `nickname`, `role`).

앱 재시작 시 secure storage의 refresh로 `/auth/refresh` 자동 복원. 실패 시 로그인 화면.
