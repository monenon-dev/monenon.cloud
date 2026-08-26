import 'package:flutter/material.dart';
import 'package:kakao_flutter_sdk_common/kakao_flutter_sdk_common.dart';

import 'auth/auth_token_store.dart';
import 'config/kakao_config.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  KakaoConfig.logSetupHint();
  if (KakaoConfig.isConfigured) {
    KakaoSdk.init(nativeAppKey: KakaoConfig.nativeAppKey.trim());
  }

  await AuthTokenStore.instance.loadRefreshToken();
  await AuthService().restoreSession();

  runApp(const MonenonApp());
}

class MonenonApp extends StatelessWidget {
  const MonenonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthTokenStore.instance,
      builder: (context, _) {
        final authed = AuthTokenStore.instance.isAuthenticated;
        return MaterialApp(
          title: 'Monenon',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF4F46E5),
              brightness: Brightness.light,
            ),
            useMaterial3: true,
          ),
          darkTheme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF818CF8),
              brightness: Brightness.dark,
            ),
            useMaterial3: true,
          ),
          home: authed ? const HomeScreen() : const LoginScreen(),
        );
      },
    );
  }
}
