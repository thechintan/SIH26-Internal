import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const String _keyAccessToken = 'access_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyUserId = 'user_id';
  static const String _keyUserPhone = 'user_phone';
  static const String _keyUserName = 'user_name';

  Future<void> saveAuthData({
    required String accessToken,
    required String refreshToken,
    required String userId,
    required String phone,
    String? name,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _refreshTokenKey(refreshToken), value: refreshToken);
    await _storage.write(key: _keyUserId, value: userId);
    await _storage.write(key: _keyUserPhone, value: phone);
    if (name != null) {
      await _storage.write(key: _keyUserName, value: name);
    }
  }

  String _refreshTokenKey(String token) => _keyRefreshToken;

  Future<String?> getAccessToken() async => await _storage.read(key: _keyAccessToken);
  Future<String?> getRefreshToken() async => await _storage.read(key: _keyRefreshToken);
  Future<String?> getUserId() async => await _storage.read(key: _keyUserId);
  Future<String?> getUserPhone() async => await _storage.read(key: _keyUserPhone);
  Future<String?> getUserName() async => await _storage.read(key: _keyUserName);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  Future<void> clearAuthData() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyUserId);
    await _storage.delete(key: _keyUserPhone);
    await _storage.delete(key: _keyUserName);
  }
}
