import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';

import '../config/kakao_config.dart';

/// 카카오 SDK 로그인 → 카카오 access token 반환.
class KakaoAuthGateway {
  /// 카카오톡 우선, 없으면 계정 로그인.
  Future<String> loginAndGetAccessToken() async {
    KakaoConfig.assertConfigured();

    OAuthToken token;
    if (await isKakaoTalkInstalled()) {
      try {
        token = await UserApi.instance.loginWithKakaoTalk();
      } catch (_) {
        token = await UserApi.instance.loginWithKakaoAccount();
      }
    } else {
      token = await UserApi.instance.loginWithKakaoAccount();
    }

    final access = token.accessToken.trim();
    if (access.isEmpty) {
      throw Exception('카카오 access token을 받지 못했습니다.');
    }
    return access;
  }

  Future<void> logoutKakaoSdk() async {
    try {
      await UserApi.instance.logout();
    } catch (_) {
      // 이미 로그아웃된 경우 무시
    }
  }
}
