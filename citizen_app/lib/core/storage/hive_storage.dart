import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import 'models/offline_report.dart';

class HiveStorageService {
  static final HiveStorageService _instance = HiveStorageService._internal();
  factory HiveStorageService() => _instance;
  HiveStorageService._internal();

  static const String _offlineReportsBoxName = 'offline_reports_box';
  static const String _cachedReportsBoxName = 'cached_reports_box';
  static const String _appSettingsBoxName = 'app_settings_box';

  Box? _offlineReportsBox;
  Box? _cachedReportsBox;
  Box? _appSettingsBox;

  Future<void> init() async {
    await Hive.initFlutter();
    _offlineReportsBox = await Hive.openBox(_offlineReportsBoxName);
    _cachedReportsBox = await Hive.openBox(_cachedReportsBoxName);
    _appSettingsBox = await Hive.openBox(_appSettingsBoxName);
  }

  // ── Offline Reports Queue ──────────────────────────────────────────

  Future<void> saveOfflineReport(OfflineReport report) async {
    await _offlineReportsBox?.put(report.localId, report.toJson());
  }

  List<OfflineReport> getOfflineReports() {
    if (_offlineReportsBox == null) return [];
    final List<OfflineReport> list = [];
    for (var key in _offlineReportsBox!.keys) {
      final jsonStr = _offlineReportsBox!.get(key);
      if (jsonStr is String) {
        try {
          list.add(OfflineReport.fromJson(jsonStr));
        } catch (e) {
          // ignore corrupted
        }
      }
    }
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  Future<void> removeOfflineReport(String localId) async {
    await _offlineReportsBox?.delete(localId);
  }

  // ── Cached Remote Reports (For offline viewing) ─────────────────────

  Future<void> cacheReports(List<dynamic> rawReports) async {
    final jsonStr = json.encode(rawReports);
    await _cachedReportsBox?.put('my_reports', jsonStr);
    await _cachedReportsBox?.put('cached_at', DateTime.now().toIso8601String());
  }

  List<dynamic> getCachedReports() {
    final jsonStr = _cachedReportsBox?.get('my_reports');
    if (jsonStr is String) {
      try {
        return json.decode(jsonStr) as List<dynamic>;
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  // ── Settings (Custom Base URL config etc.) ──────────────────────────

  Future<void> setCustomBaseUrl(String url) async {
    await _appSettingsBox?.put('base_url', url);
  }

  String? getCustomBaseUrl() {
    return _appSettingsBox?.get('base_url') as String?;
  }
}
