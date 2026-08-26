import 'dart:convert';

import '../models/weather.dart';
import 'api_client.dart';

class WeatherService {
  WeatherService({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  Future<WeatherData> fetchWeather() async {
    final res = await _client.get('/weather');
    final body = jsonDecode(res.body);
    if (res.statusCode != 200) {
      final detail = body is Map && body['detail'] is String
          ? body['detail'] as String
          : '날씨 조회 실패 (${res.statusCode})';
      throw Exception(detail);
    }
    return WeatherData.fromJson(body as Map<String, dynamic>);
  }
}
