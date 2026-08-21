import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'providers/my_reports_provider.dart';
import 'report_detail_screen.dart';
import '../../report_submission/presentation/report_flow_screen.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/categories.dart';
import '../../../../shared/widgets/offline_banner.dart';

class MyReportsScreen extends ConsumerWidget {
  const MyReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(myReportsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reports'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(myReportsProvider.notifier).fetchMyReports();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () =>
                    ref.read(myReportsProvider.notifier).fetchMyReports(showLoading: false),
                child: _buildBody(context, state),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ReportFlowScreen()),
          );
          ref.read(myReportsProvider.notifier).fetchMyReports(showLoading: false);
        },
        icon: const Icon(Icons.add_a_photo),
        label: const Text(
          'Quick Report',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, MyReportsState state) {
    if (state.isLoading && state.reports.isEmpty && state.pendingOfflineReports.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final totalItems = state.pendingOfflineReports.length + state.reports.length;

    if (totalItems == 0) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.2),
          Center(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.assignment_turned_in_outlined,
                    size: 64,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'No reports submitted yet',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40.0),
                  child: Text(
                    'Spot a road defect, broken lamp, or garbage dump? Tap below to report in under 30 seconds.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        // Pending offline queue section
        if (state.pendingOfflineReports.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 6.0),
            child: Row(
              children: [
                Icon(Icons.cloud_upload_outlined, size: 18, color: AppColors.statusPendingSync),
                SizedBox(width: 6),
                Text(
                  'Pending Sync (Offline Drafts)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.statusPendingSync,
                  ),
                ),
              ],
            ),
          ),
          ...state.pendingOfflineReports.map((offline) {
            final cat = AppCategories.getById(offline.category);
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.statusPendingSync.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(cat.icon, color: AppColors.statusPendingSync),
                ),
                title: Text(
                  cat.title,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Text(
                  'Saved locally • Auto-syncing when online\n${DateFormat.yMMMd().add_jm().format(offline.createdAt)}',
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.statusPendingSync.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Pending Sync',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.statusPendingSync,
                    ),
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 12),
          const Divider(),
        ],

        // Server reports section
        ...state.reports.map((report) {
          final catId = report['category'] ?? 'other';
          final cat = AppCategories.getById(catId);
          final status = report['status'] ?? 'submitted';
          final statusColor = AppColors.getStatusColor(status);
          final upvotes = report['upvote_count'] ?? 0;
          final dateStr = report['createdAt'];
          final dateFormatted = dateStr != null
              ? DateFormat.yMMMd().format(DateTime.parse(dateStr))
              : '';
          final address = report['address'] ?? 'Report Location';
          final reportId = report['_id']?.toString() ?? '';

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ReportDetailScreen(
                      reportId: reportId,
                      initialReport: report,
                    ),
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: cat.color.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(cat.icon, color: cat.color, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                cat.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                '#${reportId.isNotEmpty ? reportId.substring(reportId.length >= 6 ? reportId.length - 6 : 0).toUpperCase() : ""} • $dateFormatted',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textTertiary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: statusColor.withOpacity(0.4)),
                          ),
                          child: Text(
                            status.toString().replaceAll('_', ' ').toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      address,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.thumb_up_alt_outlined, size: 14, color: AppColors.textTertiary),
                            const SizedBox(width: 4),
                            Text(
                              '$upvotes upvotes',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                        const Spacer(),
                        const Text(
                          'View Progress Timeline →',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryLight,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}
