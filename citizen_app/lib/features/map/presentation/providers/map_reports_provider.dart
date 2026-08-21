import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../report_submission/data/report_repository.dart';
import '../../../report_submission/presentation/providers/report_submission_provider.dart';

class MapFilterState {
  final String? selectedCategory;
  final String? selectedStatus;

  MapFilterState({
    this.selectedCategory,
    this.selectedStatus,
  });

  MapFilterState copyWith({
    String? selectedCategory,
    String? selectedStatus,
    bool clearCategory = false,
    bool clearStatus = false,
  }) {
    return MapFilterState(
      selectedCategory: clearCategory ? null : (selectedCategory ?? this.selectedCategory),
      selectedStatus: clearStatus ? null : (selectedStatus ?? this.selectedStatus),
    );
  }
}

class MapReportsState {
  final bool isLoading;
  final List<dynamic> reports;
  final MapFilterState filter;
  final String? error;

  MapReportsState({
    this.isLoading = false,
    this.reports = const [],
    required this.filter,
    this.error,
  });

  MapReportsState copyWith({
    bool? isLoading,
    List<dynamic>? reports,
    MapFilterState? filter,
    String? error,
  }) {
    return MapReportsState(
      isLoading: isLoading ?? this.isLoading,
      reports: reports ?? this.reports,
      filter: filter ?? this.filter,
      error: error,
    );
  }
}

class MapReportsNotifier extends StateNotifier<MapReportsState> {
  final ReportRepository _repo;

  MapReportsNotifier(this._repo)
      : super(MapReportsState(filter: MapFilterState())) {
    fetchMapReports();
  }

  Future<void> fetchMapReports() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final reports = await _repo.getMapReports(
        category: state.filter.selectedCategory,
        status: state.filter.selectedStatus,
      );
      state = state.copyWith(isLoading: false, reports: reports);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void updateFilter({String? category, String? status, bool clearCategory = false, bool clearStatus = false}) {
    final newFilter = state.filter.copyWith(
      selectedCategory: category,
      selectedStatus: status,
      clearCategory: clearCategory,
      clearStatus: clearStatus,
    );
    state = state.copyWith(filter: newFilter);
    fetchMapReports();
  }

  Future<void> upvoteReport(String reportId) async {
    try {
      await _repo.upvoteReport(reportId);
      final updated = state.reports.map((r) {
        if (r['_id'] == reportId) {
          final count = (r['upvote_count'] ?? 0) + 1;
          final copy = Map<String, dynamic>.from(r);
          copy['upvote_count'] = count;
          return copy;
        }
        return r;
      }).toList();
      state = state.copyWith(reports: updated);
    } catch (_) {}
  }
}

final mapReportsProvider =
    StateNotifierProvider<MapReportsNotifier, MapReportsState>((ref) {
  return MapReportsNotifier(ref.read(reportRepositoryProvider));
});
