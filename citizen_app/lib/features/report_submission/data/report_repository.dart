import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/storage/hive_storage.dart';
import '../../../../core/network/connectivity_service.dart';

class ReportRepository {
  final ApiClient _apiClient = ApiClient();
  final HiveStorageService _hiveStorage = HiveStorageService();

  Future<Map<String, dynamic>> submitReport({
    required String category,
    String? description,
    String? voiceNoteUrl,
    required List<String> images,
    required double lat,
    required double lng,
    String? address,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.reports,
        data: {
          'category': category,
          'description': description,
          'voice_note_url': voiceNoteUrl,
          'images': images,
          'location': {
            'lat': lat,
            'lng': lng,
          },
          'address': address,
        },
      );

      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to submit report.',
      );
    }
  }

  Future<List<dynamic>> getMyReports({int page = 1, int limit = 20}) async {
    final isOnline = ConnectivityService().isOnline.value;

    if (!isOnline) {
      return _hiveStorage.getCachedReports();
    }

    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.reports,
        queryParameters: {'page': page, 'limit': limit},
      );

      final data = response.data;
      List<dynamic> reports = [];
      if (data is Map && data.containsKey('reports')) {
        reports = data['reports'] as List<dynamic>;
      } else if (data is List) {
        reports = data;
      }

      await _hiveStorage.cacheReports(reports);
      return reports;
    } catch (e) {
      // Fallback to local cached data
      return _hiveStorage.getCachedReports();
    }
  }

  Future<Map<String, dynamic>> getReportDetail(String id) async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.reportDetail(id));
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to load report details.',
      );
    }
  }

  Future<Map<String, dynamic>> upvoteReport(String id) async {
    try {
      final response = await _apiClient.dio.post(ApiEndpoints.upvoteReport(id));
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to upvote report.',
      );
    }
  }

  Future<List<dynamic>> getMapReports({
    double? swLng,
    double? swLat,
    double? neLng,
    double? neLat,
    String? category,
    String? status,
  }) async {
    try {
      final Map<String, dynamic> params = {};
      if (swLng != null) params['sw_lng'] = swLng;
      if (swLat != null) params['sw_lat'] = swLat;
      if (neLng != null) params['ne_lng'] = neLng;
      if (neLat != null) params['ne_lat'] = neLat;
      if (category != null && category.isNotEmpty) params['category'] = category;
      if (status != null && status.isNotEmpty) params['status'] = status;

      final response = await _apiClient.dio.get(
        ApiEndpoints.mapReports,
        queryParameters: params,
      );

      return response.data as List<dynamic>;
    } catch (e) {
      return [];
    }
  }
}
