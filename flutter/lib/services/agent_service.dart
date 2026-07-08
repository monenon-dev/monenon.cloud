import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class AgentService {
  Future<String> chat(String prompt, {int? userId}) async {
    final payload = <String, dynamic>{'prompt': prompt};
    if (userId != null) {
      payload['user_id'] = userId;
    }

    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/agent/chat'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
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
