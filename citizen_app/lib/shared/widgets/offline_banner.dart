import 'package:flutter/material.dart';
import '../../core/network/connectivity_service.dart';
import '../../core/constants/app_colors.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final conn = ConnectivityService();

    return ValueListenableBuilder<bool>(
      valueListenable: conn.isOnline,
      builder: (context, online, child) {
        if (online) {
          // Check if syncing
          return ValueListenableBuilder<bool>(
            valueListenable: conn.isSyncing,
            builder: (context, syncing, child) {
              if (!syncing) return const SizedBox.shrink();
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                color: AppColors.statusAcknowledged,
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Syncing pending offline reports...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
          color: AppColors.statusPendingSync,
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.wifi_off, size: 16, color: Colors.white),
              SizedBox(width: 8),
              Text(
                'You are offline. Reports will be saved and synced automatically.',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
