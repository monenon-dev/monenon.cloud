import 'package:flutter/material.dart';

import 'screens/home_screen.dart';

void main() {
  runApp(const MonenonApp());
}

class MonenonApp extends StatelessWidget {
  const MonenonApp({super.key});

  @override
  Widget build(BuildContext context) {
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
      home: const HomeScreen(),
    );
  }
}
