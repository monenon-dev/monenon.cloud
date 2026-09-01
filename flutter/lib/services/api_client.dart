import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../auth/auth_token_store.dart';
import '../config/api_config.dart';

/// 인증 헤더 자동 첨부 + 401 시 refresh single-flight 후 1회 재시도.
class ApiClient {
  ApiClient({
    AuthTokenStore? tokenStore,
    http.Client? httpClient,
  })  : _tokens = tokenStore ?? AuthTokenStore.instance,
        _http = httpClient ?? http.Client();

  static final ApiClient instance = ApiClient();

  final AuthTokenStore _tokens;
  final http.Client _http;

  Future<String?>? _refreshInFlight;

  Future<http.Response> get(
    String path, {
    Map<String, String>? headers,
    bool skipAuthRetry = false,
  }) {
    return _send(
      method: 'GET',
      path: path,
      headers: headers,
      skipAuthRetry: skipAuthRetry,
    );
  }

  Future<http.Response> post(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool skipAuthRetry = false,
  }) {
    return _send(
      method: 'POST',
      path: path,
      headers: headers,
      body: body,
      skipAuthRetry: skipAuthRetry,
    );
  }

  Future<http.Response> patch(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool skipAuthRetry = false,
  }) {
    return _send(
      method: 'PATCH',
      path: path,
      headers: headers,
      body: body,
      skipAuthRetry: skipAuthRetry,
    );
  }

  Future<http.Response> delete(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool skipAuthRetry = false,
  }) {
    return _send(
      method: 'DELETE',
      path: path,
      headers: headers,
      body: body,
      skipAuthRetry: skipAuthRetry,
    );
  }

  Future<http.Response> _send({
    required String method,
    required String path,
    Map<String, String>? headers,
    Object? body,
    bool skipAuthRetry = false,
  }) async {
    final uri = _resolve(path);
    var res = await _raw(method, uri, headers: headers, body: body);

    if (res.statusCode != 401 || skipAuthRetry) {
      return res;
    }

    final refreshed = await _refreshSingleFlight();
    if (refreshed == null) {
      return res;
    }
    return _raw(method, uri, headers: headers, body: body);
  }

  Uri _resolve(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Uri.parse(path);
    }
    final base = ApiConfig.baseUrl.replaceAll(RegExp(r'/$'), '');
    final suffix = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$suffix');
  }

  Future<http.Response> _raw(
    String method,
    Uri uri, {
    Map<String, String>? headers,
    Object? body,
  }) {
    final merged = <String, String>{
      'Accept': 'application/json',
      ...?headers,
    };
    final access = _tokens.accessToken;
    if (access != null &&
        access.isNotEmpty &&
        !merged.containsKey('Authorization')) {
      merged['Authorization'] = 'Bearer $access';
    }

    Object? encoded = body;
    if (body != null && body is! String && body is! List<int>) {
      merged.putIfAbsent('Content-Type', () => 'application/json');
      encoded = jsonEncode(body);
    }

    switch (method) {
      case 'GET':
        return _http.get(uri, headers: merged);
      case 'POST':
        return _http.post(uri, headers: merged, body: encoded);
      case 'PATCH':
        return _http.patch(uri, headers: merged, body: encoded);
      case 'DELETE':
        return _http.delete(uri, headers: merged, body: encoded);
      default:
        throw UnsupportedError('Unsupported HTTP method: $method');
    }
  }

  Future<String?> _refreshSingleFlight() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<String?> _doRefresh() async {
    final refresh = _tokens.refreshToken;
    if (refresh == null || refresh.isEmpty) {
      await _tokens.clear();
      return null;
    }

    final uri = _resolve('/auth/refresh');
    final res = await _http.post(
      uri,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'refresh_token': refresh}),
    );

    if (res.statusCode != 200) {
      await _tokens.clear();
      return null;
    }

    final decoded = jsonDecode(res.body);
    if (decoded is! Map) {
      await _tokens.clear();
      return null;
    }
    final access = decoded['access_token'];
    final nextRefresh = decoded['refresh_token'];
    if (access is! String || access.isEmpty) {
      await _tokens.clear();
      return null;
    }

    _tokens.setAccessToken(access);
    if (nextRefresh is String && nextRefresh.isNotEmpty) {
      await _tokens.setRefreshToken(nextRefresh);
    }
    return access;
  }

  void close() => _http.close();
}
