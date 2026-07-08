import '../models/weather.dart';

enum SecretaryMood {
  loading,
  error,
  clear,
  cloudy,
  rain,
  snow,
  storm,
  fog,
  hot,
  cold,
}

class SecretaryPersona {
  const SecretaryPersona({
    required this.mood,
    required this.message,
    required this.label,
  });

  final SecretaryMood mood;
  final String message;
  final String label;

  static SecretaryPersona resolve({
    required WeatherData? data,
    required bool loading,
    required String? error,
  }) {
    if (loading && data == null) {
      return const SecretaryPersona(
        mood: SecretaryMood.loading,
        message: '안녕하세요!',
        label: '준비 중',
      );
    }
    if (error != null || data == null) {
      return const SecretaryPersona(
        mood: SecretaryMood.error,
        message: '반가워요!',
        label: '대기',
      );
    }

    final code = (data.icon ?? '01d').substring(0, 2);
    final temp = data.tempC;
    final desc = (data.description ?? '').toLowerCase();

    if (code == '11' || desc.contains('thunder')) {
      return const SecretaryPersona(
        mood: SecretaryMood.storm,
        message: '천둥이 쳐요!',
        label: '천둥',
      );
    }
    if (code == '13' || desc.contains('snow')) {
      return const SecretaryPersona(
        mood: SecretaryMood.snow,
        message: '눈이 내려요!',
        label: '눈',
      );
    }
    if (code == '09' ||
        code == '10' ||
        desc.contains('rain') ||
        desc.contains('drizzle')) {
      return const SecretaryPersona(
        mood: SecretaryMood.rain,
        message: '비가 와요!',
        label: '비',
      );
    }
    if (code == '50' ||
        desc.contains('mist') ||
        desc.contains('fog') ||
        desc.contains('haze')) {
      return const SecretaryPersona(
        mood: SecretaryMood.fog,
        message: '안개가 껴 있어요!',
        label: '안개',
      );
    }
    if (temp != null && temp >= 28) {
      return const SecretaryPersona(
        mood: SecretaryMood.hot,
        message: '너무 더워요!',
        label: '더위',
      );
    }
    if (temp != null && temp <= 5) {
      return const SecretaryPersona(
        mood: SecretaryMood.cold,
        message: '추워요!',
        label: '추위',
      );
    }
    if (code == '01' || code == '02') {
      return const SecretaryPersona(
        mood: SecretaryMood.clear,
        message: '날씨가 좋아요!',
        label: '맑음',
      );
    }
    return const SecretaryPersona(
      mood: SecretaryMood.cloudy,
      message: '구름이 많아요!',
      label: '흐림',
    );
  }
}
