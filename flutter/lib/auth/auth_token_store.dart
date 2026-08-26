import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 인증 토큰 보관.
///
/// - Access Token: 앱 메모리만 (프로세스 종료 시 소멸)
/// - Refresh Token: [FlutterSecureStorage] (평문 SharedPreferences 금지)
///
/// 상태관리 라이브러리(Provider/Riverpod/Bloc)가 없으므로
/// [ChangeNotifier] 싱글톤으로 UI에 알린다.
class AuthTokenStore extends ChangeNotifier {
  AuthTokenStore._({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  static final AuthTokenStore instance = AuthTokenStore._();

  static const _refreshKey = 'monenon_refresh_token';

  final FlutterSecureStorage _storage;

  String? _accessToken;
  String? _refreshToken;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get hasAccessToken =>
      _accessToken != null && _accessToken!.trim().isNotEmpty;
  bool get hasRefreshToken =>
      _refreshToken != null && _refreshToken!.trim().isNotEmpty;
  bool get isAuthenticated => hasAccessToken || hasRefreshToken;

  /// 앱 시작 시 refresh 쿠키/토큰만 secure storage에서 복원.
  Future<void> loadRefreshToken() async {
    _refreshToken = await _storage.read(key: _refreshKey);
    notifyListeners();
  }

  void setAccessToken(String? token) {
    final next = token?.trim();
    _accessToken = (next == null || next.isEmpty) ? null : next;
    notifyListeners();
  }

  Future<void> setRefreshToken(String? token) async {
    final next = token?.trim();
    if (next == null || next.isEmpty) {
      _refreshToken = null;
      await _storage.delete(key: _refreshKey);
    } else {
      _refreshToken = next;
      await _storage.write(key: _refreshKey, value: next);
    }
    notifyListeners();
  }

  Future<void> setTokenPair({
    required String accessToken,
    required String refreshToken,
  }) async {
    setAccessToken(accessToken);
    await setRefreshToken(refreshToken);
  }

  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.delete(key: _refreshKey);
    notifyListeners();
  }
}
