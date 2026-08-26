import 'package:flutter/foundation.dart';

/// 카카오 네이티브 앱 키 등 Flutter 전용 설정.
///
/// 웹의 REST/JS 키와 **다름**. 카카오 콘솔에서 동일 앱에
/// Android/iOS 플랫폼을 추가한 뒤 **네이티브 앱 키**를 사용한다.
///
/// ```bash
/// flutter run --dart-define=KAKAO_NATIVE_APP_KEY=your_native_key
/// ```
class KakaoConfig {
  static const String nativeAppKey = String.fromEnvironment(
    'KAKAO_NATIVE_APP_KEY',
  );

  static bool get isConfigured => nativeAppKey.trim().isNotEmpty;

  /// 카카오 콘솔 Redirect URI: `kakao{NATIVE_APP_KEY}://oauth`
  static String get redirectScheme {
    final key = nativeAppKey.trim();
    return key.isEmpty ? '' : 'kakao$key';
  }

  static void assertConfigured() {
    if (!isConfigured) {
      throw StateError(
        'KAKAO_NATIVE_APP_KEY가 없습니다. '
        '--dart-define=KAKAO_NATIVE_APP_KEY=... 로 네이티브 앱 키를 전달하세요.',
      );
    }
  }

  static void logSetupHint() {
    if (kDebugMode && !isConfigured) {
      debugPrint(
        '[KakaoConfig] 네이티브 앱 키가 비어 있습니다. '
        '카카오 콘솔에 Android/iOS 플랫폼을 등록하고 '
        'KAKAO_NATIVE_APP_KEY를 설정하세요.',
      );
    }
  }
}
