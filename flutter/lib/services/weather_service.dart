import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/weather.dart';

class WeatherService {
  Future<WeatherData> fetchWeather() async {
    final res = await http.get(Uri.parse('${ApiConfig.baseUrl}/weather'));
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
