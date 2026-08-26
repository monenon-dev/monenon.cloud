import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';

/// FastAPI 백엔드 베이스 URL.
///
/// 우선순위:
/// 1. `--dart-define=API_BASE=...` (명시 오버라이드)
/// 2. `--dart-define=USE_PRODUCTION=true|false`
/// 3. 릴리즈 빌드(`kReleaseMode`) → 프로덕션
/// 4. 로컬 기본값
///    - Windows / iOS 시뮬레이터 / Web: `127.0.0.1:8000`
///    - Android 에뮬레이터: `10.0.2.2:8000`
class ApiConfig {
  static const String productionBaseUrl = 'https://api.monenon.cloud';

  static const String _fromDefine = String.fromEnvironment('API_BASE');
  static const String _useProductionDefine =
      String.fromEnvironment('USE_PRODUCTION');

  /// 프로덕션 API 사용 여부.
  ///
  /// - `USE_PRODUCTION=true|false` dart-define이 있으면 그 값을 따름
  /// - 없으면 릴리즈 빌드일 때 true
  static bool get useProduction {
    switch (_useProductionDefine.trim().toLowerCase()) {
      case 'true':
      case '1':
      case 'yes':
        return true;
      case 'false':
      case '0':
      case 'no':
        return false;
      default:
        return kReleaseMode;
    }
  }

  static String get baseUrl {
    if (_fromDefine.isNotEmpty) {
      return _fromDefine.replaceAll(RegExp(r'/$'), '');
    }
    if (useProduction) {
      return productionBaseUrl;
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
