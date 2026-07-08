import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';

/// FastAPI 백엔드 베이스 URL.
///
/// - Windows / iOS 시뮬레이터: `127.0.0.1:8000`
/// - Android 에뮬레이터: `10.0.2.2:8000` (호스트 PC)
/// - 실제 기기: PC LAN IP로 `--dart-define=API_BASE=http://192.168.x.x:8000`
class ApiConfig {
  static const String _fromDefine = String.fromEnvironment('API_BASE');

  static String get baseUrl {
    if (_fromDefine.isNotEmpty) {
      return _fromDefine.replaceAll(RegExp(r'/$'), '');
    }
    if (kIsWeb) {
      return 'http://127.0.0.1:8000';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://127.0.0.1:8000';
  }

  static String get titanicBase => '$baseUrl/api/titanic';
}
