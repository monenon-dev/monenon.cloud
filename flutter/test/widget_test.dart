import 'package:flutter_test/flutter_test.dart';
import 'package:monenon/main.dart';

void main() {
  testWidgets('Monenon home shows title', (WidgetTester tester) async {
    await tester.pumpWidget(const MonenonApp());
    await tester.pumpAndSettle();

    expect(find.text('Monenon AI Agent'), findsOneWidget);
  });
}
