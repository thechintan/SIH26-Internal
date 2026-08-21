import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_endpoints.dart';
import '../storage/secure_storage.dart';
import '../storage/hive_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final SecureStorageService _secureStorage = SecureStorageService();

  ApiClient._internal() {
    // Load custom base url if stored
    final customUrl = HiveStorageService().getCustomBaseUrl();
    if (customUrl != null && customUrl.isNotEmpty) {
      ApiEndpoints.baseUrl = customUrl;
    }

    dio = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Auth & Token Refresh Interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add JWT Token if available and not auth endpoint
          if (!options.path.contains('/auth/citizen/otp-request') &&
              !options.path.contains('/auth/citizen/otp-verify') &&
              !options.path.contains('/map/reports')) {
            final token = await _secureStorage.getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Handle 401 token refresh
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/refresh') &&
              !error.requestOptions.path.contains('/auth/citizen/')) {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              final token = await _secureStorage.getAccessToken();
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              try {
                final response = await dio.fetch(error.requestOptions);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );

    if (kDebugMode) {
      dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (obj) => debugPrint('🌐 [Dio] $obj'),
        ),
      );
    }
  }

  void updateBaseUrl(String newUrl) {
    ApiEndpoints.baseUrl = newUrl;
    dio.options.baseUrl = newUrl;
    HiveStorageService().setCustomBaseUrl(newUrl);
  }

  Future<bool> _tryRefreshToken() async {
    try {
      final refreshToken = await _secureStorage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return false;

      final res = await Dio(
        BaseOptions(baseUrl: ApiEndpoints.baseUrl),
      ).post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (res.statusCode == 200 && res.data != null) {
        final newAccess = res.data['accessToken'] as String;
        final newRefresh = res.data['refreshToken'] as String;
        await _secureStorage.saveTokens(
          accessToken: newAccess,
          refreshToken: newRefresh,
        );
        return true;
      }
    } catch (e) {
      debugPrint('Token refresh failed: $e');
    }
    return false;
  }
}
