class WeatherData {
  const WeatherData({
    required this.city,
    this.country,
    this.tempC,
    this.feelsLikeC,
    this.humidity,
    this.description,
    this.icon,
    this.windMps,
  });

  final String city;
  final String? country;
  final double? tempC;
  final double? feelsLikeC;
  final int? humidity;
  final String? description;
  final String? icon;
  final double? windMps;

  factory WeatherData.fromJson(Map<String, dynamic> json) {
    return WeatherData(
      city: json['city'] as String? ?? 'Seoul',
      country: json['country'] as String?,
      tempC: (json['temp_c'] as num?)?.toDouble(),
      feelsLikeC: (json['feels_like_c'] as num?)?.toDouble(),
      humidity: json['humidity'] as int?,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      windMps: (json['wind_mps'] as num?)?.toDouble(),
    );
  }
}
