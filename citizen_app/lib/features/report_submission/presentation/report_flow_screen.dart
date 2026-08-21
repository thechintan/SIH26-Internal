import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/report_submission_provider.dart';
import 'steps/step1_media_capture.dart';
import 'steps/step2_location_picker.dart';
import 'steps/step3_category_details.dart';
import 'widgets/duplicate_dialog.dart';
import '../../../../core/constants/app_colors.dart';

class ReportFlowScreen extends ConsumerStatefulWidget {
  const ReportFlowScreen({super.key});

  @override
  ConsumerState<ReportFlowScreen> createState() => _ReportFlowScreenState();
}

class _ReportFlowScreenState extends ConsumerState<ReportFlowScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToStep(int step) {
    setState(() => _currentStep = step);
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _handleNext() {
    final state = ref.read(reportSubmissionProvider);

    if (_currentStep == 0) {
      if (state.selectedImages.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please capture or select at least 1 photo.')),
        );
        return;
      }
      _goToStep(1);
    } else if (_currentStep == 1) {
      _goToStep(2);
    } else if (_currentStep == 2) {
      if (state.category == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select an issue category.')),
        );
        return;
      }
      _submit();
    }
  }

  void _submit() async {
    await ref.read(reportSubmissionProvider.notifier).submitReport();
  }

  void _showDuplicateModal(List<dynamic> duplicates) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => DuplicateDialog(
        duplicates: duplicates,
        onUpvoteExisting: () async {
          Navigator.pop(ctx);
          final firstId = duplicates.first['id']?.toString() ?? '';
          if (firstId.isNotEmpty) {
            await ref
                .read(reportSubmissionProvider.notifier)
                .upvoteExistingDuplicate(firstId);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Upvoted existing issue! Thank you.')),
              );
              _finishSubmission();
            }
          }
        },
        onSubmitNew: () async {
          Navigator.pop(ctx);
          await ref
              .read(reportSubmissionProvider.notifier)
              .submitReport(bypassDuplicateCheck: true);
          if (mounted) {
            _finishSubmission();
          }
        },
      ),
    );
  }

  void _finishSubmission() {
    ref.read(reportSubmissionProvider.notifier).reset();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportSubmissionProvider);

    // Listen for state changes (duplicates, success, error)
    ref.listen<ReportSubmissionState>(reportSubmissionProvider, (prev, next) {
      if (next.status == SubmissionStatus.duplicateCheck &&
          next.potentialDuplicates != null) {
        _showDuplicateModal(next.potentialDuplicates!);
      } else if (next.status == SubmissionStatus.success) {
        final isOffline = next.submittedReport?['isOfflineDraft'] == true;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isOffline ? AppColors.statusPendingSync : Colors.green.shade700,
            content: Text(
              isOffline
                  ? 'Saved offline! Report will auto-sync when online.'
                  : 'Report submitted successfully!',
            ),
          ),
        );
        _finishSubmission();
      } else if (next.status == SubmissionStatus.error && next.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red.shade700,
            content: Text(next.errorMessage!),
          ),
        );
      }
    });

    final isSubmitting = state.status == SubmissionStatus.submitting;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quick Civic Report'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Step Progress Indicator
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              color: Colors.white,
              child: Row(
                children: [
                  _buildStepIndicator(0, 'Photo'),
                  _buildStepDivider(0),
                  _buildStepIndicator(1, 'Location'),
                  _buildStepDivider(1),
                  _buildStepIndicator(2, 'Details'),
                ],
              ),
            ),
            const Divider(height: 1),

            // Wizard Step Pages
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  Step1MediaCapture(
                    selectedImages: state.selectedImages,
                    onImagesChanged: (imgs) {
                      ref.read(reportSubmissionProvider.notifier).setImages(imgs);
                    },
                  ),
                  Step2LocationPicker(
                    currentLocation: state.location,
                    currentAddress: state.address,
                    accuracyMeters: state.accuracyMeters,
                    onLocationChanged: (loc, addr, acc) {
                      ref
                          .read(reportSubmissionProvider.notifier)
                          .setLocation(loc, addr, acc);
                    },
                  ),
                  Step3CategoryDetails(
                    selectedCategory: state.category,
                    description: state.description,
                    voiceNoteFile: state.voiceNoteFile,
                    onDetailsChanged: (cat, desc, voice) {
                      ref
                          .read(reportSubmissionProvider.notifier)
                          .setCategoryAndDetails(cat, desc, voice);
                    },
                  ),
                ],
              ),
            ),

            // Bottom Navigation Actions
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  if (_currentStep > 0) ...[
                    OutlinedButton(
                      onPressed: isSubmitting ? null : () => _goToStep(_currentStep - 1),
                      child: const Text('Back'),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: ElevatedButton(
                      onPressed: isSubmitting ? null : _handleNext,
                      child: isSubmitting
                          ? const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                ),
                                SizedBox(width: 10),
                                Text('Submitting Report...'),
                              ],
                            )
                          : Text(_currentStep == 2 ? 'Submit Report' : 'Continue'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int stepIndex, String title) {
    final isActive = _currentStep >= stepIndex;
    final isCurrent = _currentStep == stepIndex;

    return Row(
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive ? AppColors.primary : Colors.grey.shade300,
            border: isCurrent
                ? Border.all(color: AppColors.secondary, width: 2)
                : null,
          ),
          child: Center(
            child: Text(
              '${stepIndex + 1}',
              style: TextStyle(
                color: isActive ? Colors.white : Colors.grey.shade700,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w500,
            color: isActive ? AppColors.textPrimary : AppColors.textTertiary,
          ),
        ),
      ],
    );
  }

  Widget _buildStepDivider(int stepIndex) {
    final isPassed = _currentStep > stepIndex;
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.symmetric(horizontal: 6),
        color: isPassed ? AppColors.primary : Colors.grey.shade300,
      ),
    );
  }
}
