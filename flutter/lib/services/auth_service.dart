import 'dart:convert';

import '../auth/auth_token_store.dart';
import 'api_client.dart';

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
    required this.nickname,
    required this.role,
  });

  final String accessToken;
  final String refreshToken;
  final int userId;
  final String nickname;
  final String role;
}

class AuthService {
  AuthService({
    ApiClient? client,
    AuthTokenStore? tokenStore,
  })  : _client = client ?? ApiClient.instance,
        _tokens = tokenStore ?? AuthTokenStore.instance;

  final ApiClient _client;
  final AuthTokenStore _tokens;

  /// 이메일/비밀번호 로그인 → JWT 쌍 저장.
  Future<AuthSession> loginWithCredentials({
    required String email,
    required String password,
  }) async {
    final res = await _client.post(
      '/auth/login',
      body: {'email': email, 'password': password},
      skipAuthRetry: true,
    );
    return _parseAndStore(res.body, res.statusCode, '로그인에 실패했습니다.');
  }

  /// 저장된 refresh로 access 복원 (앱 시작 시).
  Future<bool> restoreSession() async {
    await _tokens.loadRefreshToken();
    if (!_tokens.hasRefreshToken) return false;
    if (_tokens.hasAccessToken) return true;

    final res = await _client.post(
      '/auth/refresh',
      body: {'refresh_token': _tokens.refreshToken},
      skipAuthRetry: true,
    );
    if (res.statusCode != 200) {
      await _tokens.clear();
      return false;
    }
    final decoded = jsonDecode(res.body);
    if (decoded is! Map || decoded['access_token'] is! String) {
      await _tokens.clear();
      return false;
    }
    _tokens.setAccessToken(decoded['access_token'] as String);
    final nextRefresh = decoded['refresh_token'];
    if (nextRefresh is String && nextRefresh.isNotEmpty) {
      await _tokens.setRefreshToken(nextRefresh);
    }
    return true;
  }

  Future<void> logout() async {
    try {
      await _client.post(
        '/auth/logout',
        body: {
          if (_tokens.refreshToken != null)
            'refresh_token': _tokens.refreshToken,
        },
        skipAuthRetry: true,
      );
    } catch (_) {
      // 네트워크 실패해도 로컬 세션은 정리
    }
    await _tokens.clear();
  }

  Future<AuthSession> _parseAndStore(
    String rawBody,
    int statusCode,
    String fallback,
  ) async {
    final decoded = jsonDecode(rawBody);
    if (statusCode < 200 || statusCode >= 300) {
      final detail = decoded is Map && decoded['detail'] is String
          ? decoded['detail'] as String
          : '$fallback ($statusCode)';
      throw Exception(detail);
    }
    if (decoded is! Map) {
      throw Exception('로그인 응답 형식이 올바르지 않습니다.');
    }

    final access = decoded['access_token'];
    final refresh = decoded['refresh_token'];
    final userId = decoded['user_id'];
    final nickname = decoded['nickname'];
    final role = decoded['role'];

    if (access is! String || access.isEmpty) {
      throw Exception('로그인 응답에 access_token이 없습니다.');
    }
    if (refresh is! String || refresh.isEmpty) {
      throw Exception('로그인 응답에 refresh_token이 없습니다.');
    }

    await _tokens.setTokenPair(accessToken: access, refreshToken: refresh);

    return AuthSession(
      accessToken: access,
      refreshToken: refresh,
      userId: userId is num ? userId.toInt() : 0,
      nickname: nickname is String ? nickname : '',
      role: role is String ? role : 'user',
    );
  }
}
