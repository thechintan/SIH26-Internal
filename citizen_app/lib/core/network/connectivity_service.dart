import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../storage/hive_storage.dart';
import '../storage/models/offline_report.dart';
import '../utils/s3_uploader.dart';
import '../network/api_client.dart';
import '../constants/api_endpoints.dart';

class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();
  final HiveStorageService _hiveStorage = HiveStorageService();
  final S3Uploader _s3Uploader = S3Uploader();
  final ApiClient _apiClient = ApiClient();

  final ValueNotifier<bool> isOnline = ValueNotifier<bool>(true);
  final ValueNotifier<bool> isSyncing = ValueNotifier<bool>(false);
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  Future<void> init() async {
    final results = await _connectivity.checkConnectivity();
    _updateStatus(results);

    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      _updateStatus(results);
    });
  }

  void _updateStatus(List<ConnectivityResult> results) {
    final online = results.any((r) => r != ConnectivityResult.none);
    isOnline.value = online;

    if (online) {
      debugPrint('📶 Connectivity restored. Triggering offline queue sync...');
      syncOfflineQueue();
    }
  }

  Future<void> syncOfflineQueue() async {
    if (!isOnline.value || isSyncing.value) return;

    final pendingList = _hiveStorage.getOfflineReports();
    if (pendingList.isEmpty) return;

    isSyncing.value = true;
    debugPrint('🔄 Starting sync of ${pendingList.length} offline reports...');

    for (final report in pendingList) {
      try {
        await _processSingleOfflineReport(report);
        await _hiveStorage.removeOfflineReport(report.localId);
        debugPrint('✅ Synced offline report: ${report.localId}');
      } catch (e) {
        debugPrint('❌ Failed to sync report ${report.localId}: $e');
        await _hiveStorage.saveOfflineReport(
          report.copyWith(
            retryCount: report.retryCount + 1,
            lastError: e.toString(),
          ),
        );
      }
    }

    isSyncing.value = false;
  }

  Future<void> _processSingleOfflineReport(OfflineReport report) async {
    // 1. Upload local images
    final List<File> imageFiles = report.localImagePaths
        .map((p) => File(p))
        .where((f) => f.existsSync())
        .toList();

    File? voiceFile;
    if (report.localVoiceNotePath != null) {
      final f = File(report.localVoiceNotePath!);
      if (f.existsSync()) voiceFile = f;
    }

    final mediaUrls = await _s3Uploader.uploadReportMedia(
      imageFiles: imageFiles,
      voiceNoteFile: voiceFile,
    );

    // 2. Submit to backend POST /reports
    final payload = {
      'category': report.category,
      'description': report.description,
      'voice_note_url': mediaUrls['voice_note_url'],
      'images': (mediaUrls['images'] as List<String>).isNotEmpty
          ? mediaUrls['images']
          : ['https://civicpulse-uploads.s3.ap-south-1.amazonaws.com/placeholder.jpg'],
      'location': {
        'lat': report.lat,
        'lng': report.lng,
      },
      'address': report.address,
    };

    await _apiClient.dio.post(
      ApiEndpoints.reports,
      data: payload,
    );
  }

  void dispose() {
    _subscription?.cancel();
  }
}
