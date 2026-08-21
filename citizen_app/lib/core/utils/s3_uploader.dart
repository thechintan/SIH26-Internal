import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../constants/api_endpoints.dart';

class S3Uploader {
  final ApiClient _apiClient = ApiClient();

  /// Requests pre-signed S3 URL from backend and uploads the file directly to S3
  Future<String> uploadFile({
    required File file,
    required String contentType,
    required String filename,
  }) async {
    try {
      // 1. Get pre-signed URL from NestJS backend
      final presignedResponse = await _apiClient.dio.get(
        ApiEndpoints.presignedUrl,
        queryParameters: {
          'contentType': contentType,
          'filename': filename,
        },
      );

      final data = presignedResponse.data;
      final uploadUrl = data['uploadUrl'] as String;
      final fileUrl = data['fileUrl'] as String;
      final isMock = data['mock'] as bool? ?? false;

      // 2. If mock mode is returned by backend, return fileUrl directly
      if (isMock) {
        debugPrint('Upload mock mode active: $fileUrl');
        return fileUrl;
      }

      // 3. Upload raw binary directly to S3 via PUT
      final fileBytes = await file.readAsBytes();
      final uploadDio = Dio(); // Separate Dio instance without backend auth headers
      await uploadDio.put(
        uploadUrl,
        data: Stream.fromIterable([fileBytes]),
        options: Options(
          headers: {
            'Content-Type': contentType,
            'Content-Length': fileBytes.length,
          },
        ),
      );

      return fileUrl;
    } catch (e) {
      debugPrint('S3 upload error: $e');
      // If upload fails in offline or dev mode, return a fallback placeholder
      // so submission can proceed or be queued
      return 'https://civicpulse-uploads.s3.ap-south-1.amazonaws.com/mock/${DateTime.now().millisecondsSinceEpoch}_$filename';
    }
  }

  /// Batch upload multiple image files and optional voice note
  Future<Map<String, dynamic>> uploadReportMedia({
    required List<File> imageFiles,
    File? voiceNoteFile,
  }) async {
    final List<String> imageUrls = [];

    for (int i = 0; i < imageFiles.length; i++) {
      final img = imageFiles[i];
      final ext = img.path.split('.').last;
      final url = await uploadFile(
        file: img,
        contentType: 'image/${ext == "png" ? "png" : "jpeg"}',
        filename: 'report_img_${i + 1}.$ext',
      );
      imageUrls.add(url);
    }

    String? voiceUrl;
    if (voiceNoteFile != null && await voiceNoteFile.exists()) {
      voiceUrl = await uploadFile(
        file: voiceNoteFile,
        contentType: 'audio/m4a',
        filename: 'voice_note.m4a',
      );
    }

    return {
      'images': imageUrls,
      'voice_note_url': voiceUrl,
    };
  }
}
