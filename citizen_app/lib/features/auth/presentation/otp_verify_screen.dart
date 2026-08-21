import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/auth_provider.dart';
import '../../../../core/constants/app_colors.dart';

class OtpVerifyScreen extends ConsumerStatefulWidget {
  final String phone;
  const OtpVerifyScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final TextEditingController _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final devOtp = ref.read(authProvider).devOtp;
      if (devOtp != null && devOtp.isNotEmpty) {
        _otpController.text = devOtp;
      }
    });
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _handleVerify() async {
    final otp = _otpController.text.trim();
    if (otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a 6-digit OTP code')),
      );
      return;
    }

    final success = await ref.read(authProvider.notifier).verifyOtp(otp);
    if (success && mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Mobile'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 28.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              const Icon(
                Icons.mark_email_read_outlined,
                size: 56,
                color: AppColors.secondary,
              ),
              const SizedBox(height: 20),
              const Text(
                'Enter Verification Code',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Sent 6-digit OTP to ${widget.phone}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 28),

              if (authState.devOtp != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.amber.shade300),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.code, color: Colors.amber, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Backend Dev OTP: ${authState.devOtp}',
                          style: TextStyle(
                            color: Colors.amber.shade900,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              if (authState.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    authState.error!,
                    style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                style: const TextStyle(
                  fontSize: 28,
                  letterSpacing: 10,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
                decoration: const InputDecoration(
                  hintText: '------',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 28),

              ElevatedButton(
                onPressed: authState.isLoading ? null : _handleVerify,
                child: authState.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Verify & Continue'),
              ),
              const SizedBox(height: 16),

              TextButton(
                onPressed: () {
                  ref.read(authProvider.notifier).requestOtp(widget.phone);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('OTP Resent!')),
                  );
                },
                child: const Text('Resend OTP'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
