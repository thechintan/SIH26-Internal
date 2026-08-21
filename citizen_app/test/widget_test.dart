import 'package:flutter_test/flutter_test.dart';
import 'package:citizen_app/core/constants/categories.dart';
import 'package:citizen_app/core/storage/models/offline_report.dart';

void main() {
  test('AppCategories provides correct metadata', () {
    expect(AppCategories.all.length, greaterThanOrEqualTo(7));
    final pothole = AppCategories.getById('pothole');
    expect(pothole.title, 'Pothole & Road');
  });

  test('OfflineReport serialization and deserialization', () {
    final report = OfflineReport(
      localId: 'test-uuid',
      category: 'pothole',
      description: 'Big pothole near crossroads',
      localImagePaths: ['/tmp/img1.jpg'],
      lat: 23.0225,
      lng: 72.5714,
      address: 'Ahmedabad, Gujarat',
      createdAt: DateTime.now(),
    );

    final jsonStr = report.toJson();
    final decoded = OfflineReport.fromJson(jsonStr);

    expect(decoded.localId, 'test-uuid');
    expect(decoded.category, 'pothole');
    expect(decoded.lat, 23.0225);
  });
}
