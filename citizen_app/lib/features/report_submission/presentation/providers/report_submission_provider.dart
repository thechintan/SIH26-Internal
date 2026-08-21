import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:uuid/uuid.dart';
import '../../data/report_repository.dart';
import '../../../../core/network/connectivity_service.dart';
import '../../../../core/storage/hive_storage.dart';
import '../../../../core/storage/models/offline_report.dart';
import '../../../../core/utils/s3_uploader.dart';

enum SubmissionStatus { initial, submitting, duplicateCheck, success, error }

class ReportSubmissionState {
  final List<File> selectedImages;
  final LatLng? location;
  final String? address;
  final double? accuracyMeters;
  final String? category;
  final String? description;
  final File? voiceNoteFile;
  final SubmissionStatus status;
  final String? errorMessage;
  final List<dynamic>? potentialDuplicates;
  final Map<String, dynamic>? submittedReport;

  ReportSubmissionState({
    this.selectedImages = const [],
    this.location,
    this.address,
    this.accuracyMeters,
    this.category,
    this.description,
    this.voiceNoteFile,
    this.status = SubmissionStatus.initial,
    this.errorMessage,
    this.potentialDuplicates,
    this.submittedReport,
  });

  ReportSubmissionState copyWith({
    List<File>? selectedImages,
    LatLng? location,
    String? address,
    double? accuracyMeters,
    String? category,
    String? description,
    File? voiceNoteFile,
    SubmissionStatus? status,
    String? errorMessage,
    List<dynamic>? potentialDuplicates,
    Map<String, dynamic>? submittedReport,
  }) {
    return ReportSubmissionState(
      selectedImages: selectedImages ?? this.selectedImages,
      location: location ?? this.location,
      address: address ?? this.address,
      accuracyMeters: accuracyMeters ?? this.accuracyMeters,
      category: category ?? this.category,
      description: description ?? this.description,
      voiceNoteFile: voiceNoteFile ?? this.voiceNoteFile,
      status: status ?? this.status,
      errorMessage: errorMessage,
      potentialDuplicates: potentialDuplicates ?? this.potentialDuplicates,
      submittedReport: submittedReport ?? this.submittedReport,
    );
  }
}

class ReportSubmissionNotifier extends StateNotifier<ReportSubmissionState> {
  final ReportRepository _repo;
  final HiveStorageService _hiveStorage = HiveStorageService();
  final S3Uploader _s3Uploader = S3Uploader();

  ReportSubmissionNotifier(this._repo) : super(ReportSubmissionState());

  void setImages(List<File> images) {
    state = state.copyWith(selectedImages: images);
  }

  void setLocation(LatLng loc, String address, double accuracy) {
    state = state.copyWith(
      location: loc,
      address: address,
      accuracyMeters: accuracy,
    );
  }

  void setCategoryAndDetails(String cat, String desc, File? voice) {
    state = state.copyWith(
      category: cat,
      description: desc,
      voiceNoteFile: voice,
    );
  }

  /// Fast optimistic submission flow with S3 direct upload & offline fallback
  Future<void> submitReport({bool bypassDuplicateCheck = false}) async {
    if (state.selectedImages.isEmpty) {
      state = state.copyWith(
        status: SubmissionStatus.error,
        errorMessage: 'Please select at least 1 photo.',
      );
      return;
    }

    if (state.category == null) {
      state = state.copyWith(
        status: SubmissionStatus.error,
        errorMessage: 'Please select an issue category.',
      );
      return;
    }

    state = state.copyWith(status: SubmissionStatus.submitting, errorMessage: null);

    final isOnline = ConnectivityService().isOnline.value;

    if (!isOnline) {
      // ── OFFLINE HANDLING ─────────────────────────────────────────
      final offlineReport = OfflineReport(
        localId: const Uuid().v4(),
        category: state.category!,
        description: state.description,
        localImagePaths: state.selectedImages.map((f) => f.path).toList(),
        localVoiceNotePath: state.voiceNoteFile?.path,
        lat: state.location?.latitude ?? 23.0225,
        lng: state.location?.longitude ?? 72.5714,
        address: state.address,
        createdAt: DateTime.now(),
      );

      await _hiveStorage.saveOfflineReport(offlineReport);
      state = state.copyWith(
        status: SubmissionStatus.success,
        submittedReport: {
          '_id': offlineReport.localId,
          'status': 'pending_sync',
          'category': offlineReport.category,
          'description': offlineReport.description,
          'isOfflineDraft': true,
        },
      );
      return;
    }

    // ── ONLINE SUBMISSION ──────────────────────────────────────────
    try {
      // 1. Upload media files directly to S3 via pre-signed URLs
      final mediaUrls = await _s3Uploader.uploadReportMedia(
        imageFiles: state.selectedImages,
        voiceNoteFile: state.voiceNoteFile,
      );

      final List<String> imageUrls = (mediaUrls['images'] as List<String>).isNotEmpty
          ? (mediaUrls['images'] as List<String>)
          : ['https://civicpulse-uploads.s3.ap-south-1.amazonaws.com/default.jpg'];

      // 2. Submit to POST /reports
      final result = await _repo.submitReport(
        category: state.category!,
        description: state.description,
        voiceNoteUrl: mediaUrls['voice_note_url'],
        images: imageUrls,
        lat: state.location?.latitude ?? 23.0225,
        lng: state.location?.longitude ?? 72.5714,
        address: state.address,
      );

      final duplicates = result['potential_duplicates'] as List<dynamic>?;

      if (!bypassDuplicateCheck && duplicates != null && duplicates.isNotEmpty) {
        state = state.copyWith(
          status: SubmissionStatus.duplicateCheck,
          potentialDuplicates: duplicates,
          submittedReport: result['report'],
        );
      } else {
        state = state.copyWith(
          status: SubmissionStatus.success,
          submittedReport: result['report'],
        );
      }
    } catch (e) {
      // If error occurs during network call, fallback save to offline queue
      final offlineReport = OfflineReport(
        localId: const Uuid().v4(),
        category: state.category!,
        description: state.description,
        localImagePaths: state.selectedImages.map((f) => f.path).toList(),
        localVoiceNotePath: state.voiceNoteFile?.path,
        lat: state.location?.latitude ?? 23.0225,
        lng: state.location?.longitude ?? 72.5714,
        address: state.address,
        createdAt: DateTime.now(),
        lastError: e.toString(),
      );

      await _hiveStorage.saveOfflineReport(offlineReport);

      state = state.copyWith(
        status: SubmissionStatus.success,
        submittedReport: {
          '_id': offlineReport.localId,
          'status': 'pending_sync',
          'category': offlineReport.category,
          'description': offlineReport.description,
          'isOfflineDraft': true,
        },
      );
    }
  }

  Future<void> upvoteExistingDuplicate(String reportId) async {
    try {
      await _repo.upvoteReport(reportId);
      state = state.copyWith(status: SubmissionStatus.success);
    } catch (e) {
      state = state.copyWith(
        status: SubmissionStatus.error,
        errorMessage: 'Failed to upvote duplicate issue.',
      );
    }
  }

  void reset() {
    state = ReportSubmissionState();
  }
}

final reportRepositoryProvider = Provider<ReportRepository>((ref) => ReportRepository());

final reportSubmissionProvider =
    StateNotifierProvider<ReportSubmissionNotifier, ReportSubmissionState>((ref) {
  return ReportSubmissionNotifier(ref.read(reportRepositoryProvider));
});
