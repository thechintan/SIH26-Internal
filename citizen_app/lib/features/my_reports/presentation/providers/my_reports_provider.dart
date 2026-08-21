import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../report_submission/data/report_repository.dart';
import '../../../report_submission/presentation/providers/report_submission_provider.dart';
import '../../../../core/storage/hive_storage.dart';
import '../../../../core/storage/models/offline_report.dart';

class MyReportsState {
  final bool isLoading;
  final List<dynamic> reports;
  final List<OfflineReport> pendingOfflineReports;
  final String? error;

  MyReportsState({
    this.isLoading = false,
    this.reports = const [],
    this.pendingOfflineReports = const [],
    this.error,
  });

  MyReportsState copyWith({
    bool? isLoading,
    List<dynamic>? reports,
    List<OfflineReport>? pendingOfflineReports,
    String? error,
  }) {
    return MyReportsState(
      isLoading: isLoading ?? this.isLoading,
      reports: reports ?? this.reports,
      pendingOfflineReports: pendingOfflineReports ?? this.pendingOfflineReports,
      error: error,
    );
  }
}

class MyReportsNotifier extends StateNotifier<MyReportsState> {
  final ReportRepository _repo;
  final HiveStorageService _hiveStorage = HiveStorageService();

  MyReportsNotifier(this._repo) : super(MyReportsState()) {
    fetchMyReports();
  }

  Future<void> fetchMyReports({bool showLoading = true}) async {
    if (showLoading) {
      state = state.copyWith(isLoading: true, error: null);
    }

    try {
      final offlineDrafts = _hiveStorage.getOfflineReports();
      final serverReports = await _repo.getMyReports();

      state = state.copyWith(
        isLoading: false,
        reports: serverReports,
        pendingOfflineReports: offlineDrafts,
      );
    } catch (e) {
      final offlineDrafts = _hiveStorage.getOfflineReports();
      final cachedReports = _hiveStorage.getCachedReports();

      state = state.copyWith(
        isLoading: false,
        reports: cachedReports,
        pendingOfflineReports: offlineDrafts,
        error: 'Showing cached reports.',
      );
    }
  }
}

final myReportsProvider =
    StateNotifierProvider<MyReportsNotifier, MyReportsState>((ref) {
  return MyReportsNotifier(ref.read(reportRepositoryProvider));
});
