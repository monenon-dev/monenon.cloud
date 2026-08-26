import 'package:flutter/material.dart';

import '../auth/auth_token_store.dart';
import '../config/api_config.dart';
import '../config/kakao_config.dart';
import '../services/auth_service.dart';
import '../services/kakao_auth_gateway.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _auth = AuthService();
  final _kakao = KakaoAuthGateway();

  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _loginCredentials() async {
    await _run(() async {
      final session = await _auth.loginWithCredentials(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      AuthTokenStore.instance.setProfile(
        userId: session.userId,
        nickname: session.nickname,
        role: session.role,
      );
    });
  }

  Future<void> _loginKakao() async {
    await _run(() async {
      if (!KakaoConfig.isConfigured) {
        throw Exception(
          '카카오 네이티브 앱 키가 없습니다. '
          '--dart-define=KAKAO_NATIVE_APP_KEY=... 를 설정하세요.',
        );
      }
      final kakaoAccess = await _kakao.loginAndGetAccessToken();
      final session = await _auth.loginWithKakaoAccessToken(kakaoAccess);
      AuthTokenStore.instance.setProfile(
        userId: session.userId,
        nickname: session.nickname,
        role: session.role,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 32),
                Text(
                  'Monenon',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  '로그인하고 AI 비서를 이용하세요',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  ApiConfig.useProduction
                      ? 'API: production'
                      : 'API: ${ApiConfig.baseUrl}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall,
                ),
                const SizedBox(height: 32),
                if (_error != null) ...[
                  Material(
                    color: scheme.errorContainer,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        _error!,
                        style: TextStyle(color: scheme.onErrorContainer),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                FilledButton(
                  onPressed: _busy ? null : _loginKakao,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFFEE500),
                    foregroundColor: const Color(0xFF191919),
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('카카오로 로그인'),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        '또는 이메일',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: '이메일',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: '비밀번호',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: (_) => _loginCredentials(),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: _busy ? null : _loginCredentials,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: const Text('이메일로 로그인'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
