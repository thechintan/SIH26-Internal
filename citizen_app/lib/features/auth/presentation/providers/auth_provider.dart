import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_repository.dart';
import '../../../../core/storage/secure_storage.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final bool isGuest;
  final String? phone;
  final String? userId;
  final String? error;
  final String? devOtp;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.isGuest = false,
    this.phone,
    this.userId,
    this.error,
    this.devOtp,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    bool? isGuest,
    String? phone,
    String? userId,
    String? error,
    String? devOtp,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isGuest: isGuest ?? this.isGuest,
      phone: phone ?? this.phone,
      userId: userId ?? this.userId,
      error: error,
      devOtp: devOtp ?? this.devOtp,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  final SecureStorageService _storage;

  AuthNotifier(this._repo, this._storage) : super(AuthState()) {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);
    final isAuth = await _repo.isAuthenticated();
    final phone = await _storage.getUserPhone();
    final userId = await _storage.getUserId();
    state = state.copyWith(
      isLoading: false,
      isAuthenticated: isAuth,
      phone: phone,
      userId: userId,
    );
  }

  Future<bool> requestOtp(String phone) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _repo.requestOtp(phone);
      final devOtp = res['otp'] as String?;
      state = state.copyWith(
        isLoading: false,
        phone: phone,
        devOtp: devOtp,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  Future<bool> verifyOtp(String otp) async {
    if (state.phone == null) return false;
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _repo.verifyOtp(state.phone!, otp);
      final user = res['user'] as Map<String, dynamic>;
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        isGuest: false,
        userId: user['id'] ?? user['_id'],
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  void continueAsGuest() {
    state = state.copyWith(
      isGuest: true,
      isAuthenticated: false,
    );
  }

  Future<void> logout() async {
    await _repo.logout();
    state = AuthState();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository());
final secureStorageProvider = Provider<SecureStorageService>((ref) => SecureStorageService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.read(authRepositoryProvider),
    ref.read(secureStorageProvider),
  );
});
