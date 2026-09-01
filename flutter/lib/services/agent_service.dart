import 'dart:convert';

import 'api_client.dart';

class AgentService {
  AgentService({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// `/agent/chat` — 서버가 JWT `sub`로 사용자를 식별한다.
  Future<String> chat(String prompt) async {
    final res = await _client.post(
      '/agent/chat',
      body: {'prompt': prompt},
    );

    final body = jsonDecode(res.body);
    if (res.statusCode != 200) {
      final detail = body is Map && body['detail'] is String
          ? body['detail'] as String
          : '채팅 요청 실패 (${res.statusCode})';
      throw Exception(detail);
    }

    if (body is! Map || body['answer'] is! String) {
      throw Exception('응답에 answer가 없습니다.');
    }
    return body['answer'] as String;
  }
}
