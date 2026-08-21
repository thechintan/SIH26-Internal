import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../report_submission/data/report_repository.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/categories.dart';

class ReportDetailScreen extends StatefulWidget {
  final String reportId;
  final Map<String, dynamic>? initialReport;

  const ReportDetailScreen({
    super.key,
    required this.reportId,
    this.initialReport,
  });

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  final ReportRepository _repo = ReportRepository();
  Map<String, dynamic>? _report;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _report = widget.initialReport;
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    if (widget.reportId.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      final data = await _repo.getReportDetail(widget.reportId);
      if (mounted) {
        setState(() {
          _report = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleUpvote() async {
    try {
      final res = await _repo.upvoteReport(widget.reportId);
      final newCount = res['upvote_count'] ?? ((_report?['upvote_count'] ?? 0) + 1);
      setState(() {
        if (_report != null) {
          _report!['upvote_count'] = newCount;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report upvoted! Priority recalculated.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final report = _report;
    final catId = report?['category'] ?? 'other';
    final cat = AppCategories.getById(catId);
    final status = report?['status'] ?? 'submitted';
    final statusColor = AppColors.getStatusColor(status);
    final history = (report?['status_history'] as List<dynamic>?) ?? [];
    final images = (report?['images'] as List<dynamic>?) ?? [];
    final address = report?['address'] ?? 'Reported location';
    final upvotes = report?['upvote_count'] ?? 0;
    final tier = report?['priority_tier'] ?? 'medium';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Report #${widget.reportId.isNotEmpty ? widget.reportId.substring(widget.reportId.length >= 6 ? widget.reportId.length - 6 : 0).toUpperCase() : ""}',
        ),
      ),
      body: _isLoading && report == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Images Carousel / Horizontal list
                  if (images.isNotEmpty) ...[
                    SizedBox(
                      height: 200,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: images.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 10),
                        itemBuilder: (context, index) {
                          final imgUrl = images[index].toString();
                          return ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: CachedNetworkImage(
                              imageUrl: imgUrl,
                              width: 280,
                              height: 200,
                              fit: BoxFit.cover,
                              placeholder: (_, __) => Container(
                                color: Colors.grey.shade200,
                                child: const Center(child: CircularProgressIndicator()),
                              ),
                              errorWidget: (_, __, ___) => Container(
                                color: Colors.grey.shade300,
                                width: 280,
                                child: const Icon(Icons.broken_image, size: 40),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Category & Status Header Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: cat.color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(cat.icon, color: cat.color, size: 22),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cat.title,
                                      style: const TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      'Priority: ${tier.toString().toUpperCase()}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.getPriorityColor(tier.toString()),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: statusColor),
                                ),
                                child: Text(
                                  status.toString().replaceAll('_', ' ').toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: statusColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          const Divider(),
                          const SizedBox(height: 8),

                          Row(
                            children: [
                              const Icon(Icons.place_outlined, size: 18, color: AppColors.textSecondary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  address,
                                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                                ),
                              ),
                            ],
                          ),

                          if (report?['description'] != null &&
                              (report!['description'] as String).isNotEmpty) ...[
                            const SizedBox(height: 12),
                            Text(
                              report['description'],
                              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                            ),
                          ],

                          const SizedBox(height: 16),
                          Row(
                            children: [
                              ElevatedButton.icon(
                                onPressed: _handleUpvote,
                                icon: const Icon(Icons.thumb_up_alt_outlined, size: 16),
                                label: Text('Upvote ($upvotes)'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.secondary,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Status History Timeline
                  const Text(
                    'Status & Resolution Timeline',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (history.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Text('No updates recorded yet.'),
                    )
                  else
                    ...history.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final item = entry.value as Map<String, dynamic>;
                      final stepStatus = item['status'] ?? 'submitted';
                      final note = item['note'] ?? '';
                      final timestampStr = item['timestamp'];
                      final formattedTime = timestampStr != null
                          ? DateFormat.yMMMd().add_jm().format(DateTime.parse(timestampStr))
                          : '';
                      final isLast = idx == history.length - 1;
                      final stepColor = AppColors.getStatusColor(stepStatus);

                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Timeline icon and connector line
                          Column(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: stepColor,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check, size: 16, color: Colors.white),
                              ),
                              if (!isLast)
                                Container(
                                  width: 2,
                                  height: 48,
                                  color: Colors.grey.shade300,
                                ),
                            ],
                          ),
                          const SizedBox(width: 12),

                          // Timeline text detail
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 16.0),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          stepStatus.toString().replaceAll('_', ' ').toUpperCase(),
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 13,
                                            color: stepColor,
                                          ),
                                        ),
                                        Text(
                                          formattedTime,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textTertiary,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (note.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        note,
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    }),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
