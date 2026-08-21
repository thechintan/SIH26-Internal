import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class DuplicateDialog extends StatelessWidget {
  final List<dynamic> duplicates;
  final VoidCallback onUpvoteExisting;
  final VoidCallback onSubmitNew;

  const DuplicateDialog({
    super.key,
    required this.duplicates,
    required this.onUpvoteExisting,
    required this.onSubmitNew,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Row(
        children: [
          Icon(Icons.content_copy_outlined, color: AppColors.secondary, size: 28),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Similar Issue Nearby!',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'We found existing open reports within 50 meters for this category. Upvoting helps escalate municipal priority faster without duplicate tracking.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 16),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: duplicates.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final dup = duplicates[index];
                  final distance = dup['distance_meters'] ?? dup['distance'] ?? 0;
                  final status = dup['status'] ?? 'Acknowledged';

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.pin_drop, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Report #${dup['id']?.toString().substring(0, 6).toUpperCase() ?? "NEARBY"}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                '${distance.toStringAsFixed(1)}m away • Status: $status',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      actions: [
        OutlinedButton(
          onPressed: onSubmitNew,
          child: const Text('No, Submit New Report'),
        ),
        ElevatedButton.icon(
          onPressed: onUpvoteExisting,
          icon: const Icon(Icons.thumb_up_alt_outlined, size: 18),
          label: const Text('Upvote Existing Issue'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondary,
          ),
        ),
      ],
    );
  }
}
