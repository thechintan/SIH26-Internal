import 'package:flutter/material.dart';

class AppColors {
  // High-contrast primary palette (ideal for outdoor daylight use)
  static const Color primary = Color(0xFF003366); // Deep Navy Blue
  static const Color primaryDark = Color(0xFF001F3F);
  static const Color primaryLight = Color(0xFF1E88E5);
  
  // Secondary / Accent (High visibility safety amber/orange)
  static const Color secondary = Color(0xFFFF6F00); // Safety Amber
  static const Color secondaryLight = Color(0xFFFF9E40);
  static const Color secondaryDark = Color(0xFFC43E00);

  // Surface & Backgrounds
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color card = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE2E8F0);

  // High contrast text
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textTertiary = Color(0xFF94A3B8);

  // Status colors
  static const Color statusSubmitted = Color(0xFF64748B);
  static const Color statusAcknowledged = Color(0xFF0284C7);
  static const Color statusInProgress = Color(0xFFF59E0B);
  static const Color statusResolved = Color(0xFF10B981);
  static const Color statusVerified = Color(0xFF8B5CF6);
  static const Color statusReopened = Color(0xFFEF4444);
  static const Color statusPendingSync = Color(0xFFD97706);

  // Priority colors
  static const Color priorityCritical = Color(0xFFDC2626);
  static const Color priorityHigh = Color(0xFFEA580C);
  static const Color priorityMedium = Color(0xFFD97706);
  static const Color priorityLow = Color(0xFF16A34A);

  // Helper for status color
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return statusSubmitted;
      case 'acknowledged':
        return statusAcknowledged;
      case 'in_progress':
        return statusInProgress;
      case 'resolved':
        return statusResolved;
      case 'verified':
        return statusVerified;
      case 'reopened':
        return statusReopened;
      case 'pending_sync':
      case 'pending':
        return statusPendingSync;
      default:
        return statusSubmitted;
    }
  }

  // Helper for priority color
  static Color getPriorityColor(String tier) {
    switch (tier.toLowerCase()) {
      case 'critical':
        return priorityCritical;
      case 'high':
        return priorityHigh;
      case 'medium':
        return priorityMedium;
      case 'low':
        return priorityLow;
      default:
        return priorityMedium;
    }
  }
}
