import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../models/weather.dart';
import '../screens/chat_screen.dart';
import '../services/weather_service.dart';
import '../utils/secretary_persona.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _weatherService = WeatherService();
  WeatherData? _weather;
  String? _weatherError;
  bool _loadingWeather = true;

  static const _tags = [
    ('오늘 옷차림 추천', '오늘 날씨에 맞는 옷차림을 추천해줘', Icons.checkroom_outlined),
    ('냉장고 파먹기', '냉장고에 있는 재료로 만들 수 있는 요리를 추천해줘', Icons.egg_outlined),
    ('오늘의 한마디', '오늘 날씨에 맞는 한마디를 해줘', Icons.coffee_outlined),
    ('음악 추천', '출근길에 듣기 좋은 음악 추천해줘', Icons.music_note_outlined),
  ];

  @override
  void initState() {
    super.initState();
    _loadWeather();
  }

  Future<void> _loadWeather() async {
    setState(() {
      _loadingWeather = true;
      _weatherError = null;
    });
    try {
      final data = await _weatherService.fetchWeather();
      if (!mounted) return;
      setState(() {
        _weather = data;
        _loadingWeather = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _weatherError = e.toString();
        _loadingWeather = false;
      });
    }
  }

  void _openChat(String prompt) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChatScreen(initialPrompt: prompt),
      ),
    );
  }

  IconData _moodIcon(SecretaryMood mood) {
    switch (mood) {
      case SecretaryMood.rain:
      case SecretaryMood.storm:
        return Icons.thunderstorm_outlined;
      case SecretaryMood.snow:
      case SecretaryMood.cold:
        return Icons.ac_unit_outlined;
      case SecretaryMood.cloudy:
      case SecretaryMood.fog:
        return Icons.cloud_outlined;
      case SecretaryMood.hot:
        return Icons.wb_sunny_outlined;
      default:
        return Icons.wb_sunny_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final persona = SecretaryPersona.resolve(
      data: _weather,
      loading: _loadingWeather,
      error: _weatherError,
    );
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Monenon AI Agent'),
        backgroundColor: colorScheme.primaryContainer,
        actions: [
          IconButton(
            onPressed: _loadWeather,
            icon: const Icon(Icons.refresh),
            tooltip: '날씨 새로고침',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadWeather,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'API: ${ApiConfig.baseUrl}',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(height: 12),
            _PersonaCard(
              persona: persona,
              moodIcon: _moodIcon(persona.mood),
            ),
            const SizedBox(height: 16),
            _WeatherCard(
              weather: _weather,
              loading: _loadingWeather,
              error: _weatherError,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => _openChat(''),
              icon: const Icon(Icons.smart_toy_outlined),
              label: const Text('에이전트 채팅'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _tags.map((tag) {
                return ActionChip(
                  avatar: Icon(tag.$3, size: 18),
                  label: Text(tag.$1),
                  onPressed: () => _openChat(tag.$2),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            _FeatureCard(
              icon: '👔',
              title: '오늘의 날씨 코디',
              description: '기온과 날씨에 맞는 코디를 AI에게 물어보세요.',
              onTap: () => _openChat('오늘 날씨에 맞는 옷차림을 추천해줘'),
            ),
            _FeatureCard(
              icon: '🛒',
              title: '스마트 장보기',
              description: '냉장고 재료로 장보기 리스트를 만들어 달라고 요청하세요.',
              onTap: () => _openChat('냉장고에 있는 재료를 바탕으로 마트 장보기 리스트를 만들어 줘'),
            ),
            _FeatureCard(
              icon: '🎵',
              title: '음악 추천',
              description: '상황과 날씨에 맞는 음악을 추천받으세요.',
              onTap: () => _openChat('출근길에 듣기 좋은 음악 추천해줘'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PersonaCard extends StatelessWidget {
  const _PersonaCard({required this.persona, required this.moodIcon});

  final SecretaryPersona persona;
  final IconData moodIcon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Icon(moodIcon, size: 36),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '안녕하세요!',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    persona.message,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    persona.label,
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WeatherCard extends StatelessWidget {
  const _WeatherCard({
    required this.weather,
    required this.loading,
    required this.error,
  });

  final WeatherData? weather;
  final bool loading;
  final String? error;

  @override
  Widget build(BuildContext context) {
    if (loading && weather == null) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    if (error != null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('날씨 오류: $error'),
        ),
      );
    }
    final w = weather!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${w.city}${w.country != null ? ', ${w.country}' : ''}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              w.tempC != null ? '${w.tempC!.round()}°C' : '—',
              style: Theme.of(context).textTheme.displaySmall,
            ),
            if (w.description != null) Text(w.description!),
            if (w.humidity != null) Text('습도 ${w.humidity}%'),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final String icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(icon, style: const TextStyle(fontSize: 28)),
              const SizedBox(height: 8),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              Text(description),
            ],
          ),
        ),
      ),
    );
  }
}
