import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';

class AuthRepository {
  final ApiClient _apiClient = ApiClient();
  final SecureStorageService _storage = SecureStorageService();

  Future<Map<String, dynamic>> requestOtp(String phone) async {
    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.otpRequest,
        data: {'phone': phone},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to request OTP. Please try again.',
      );
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) async {
    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.otpVerify,
        data: {
          'phone': phone,
          'otp': otp,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final user = data['user'] as Map<String, dynamic>;

      await _storage.saveAuthData(
        accessToken: accessToken,
        refreshToken: refreshToken,
        userId: user['id'] ?? user['_id'] ?? '',
        phone: user['phone'] ?? phone,
        name: user['name'],
      );

      return data;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Invalid OTP. Please check and try again.',
      );
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post(ApiEndpoints.logout);
    } catch (_) {}
    await _storage.clearAuthData();
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
