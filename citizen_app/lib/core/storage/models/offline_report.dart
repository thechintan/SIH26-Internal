import 'dart:convert';

class OfflineReport {
  final String localId;
  final String category;
  final String? description;
  final List<String> localImagePaths;
  final String? localVoiceNotePath;
  final double lat;
  final double lng;
  final String? address;
  final DateTime createdAt;
  final int retryCount;
  final String? lastError;

  OfflineReport({
    required this.localId,
    required this.category,
    this.description,
    required this.localImagePaths,
    this.localVoiceNotePath,
    required this.lat,
    required this.lng,
    this.address,
    required this.createdAt,
    this.retryCount = 0,
    this.lastError,
  });

  Map<String, dynamic> toMap() {
    return {
      'localId': localId,
      'category': category,
      'description': description,
      'localImagePaths': localImagePaths,
      'localVoiceNotePath': localVoiceNotePath,
      'lat': lat,
      'lng': lng,
      'address': address,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
      'lastError': lastError,
    };
  }

  factory OfflineReport.fromMap(Map<String, dynamic> map) {
    return OfflineReport(
      localId: map['localId'] as String,
      category: map['category'] as String,
      description: map['description'] as String?,
      localImagePaths: List<String>.from(map['localImagePaths'] ?? []),
      localVoiceNotePath: map['localVoiceNotePath'] as String?,
      lat: (map['lat'] as num).toDouble(),
      lng: (map['lng'] as num).toDouble(),
      address: map['address'] as String?,
      createdAt: DateTime.parse(map['createdAt'] as String),
      retryCount: map['retryCount'] as int? ?? 0,
      lastError: map['lastError'] as String?,
    );
  }

  String toJson() => json.encode(toMap());

  factory OfflineReport.fromJson(String source) =>
      OfflineReport.fromMap(json.decode(source) as Map<String, dynamic>);

  OfflineReport copyWith({
    int? retryCount,
    String? lastError,
  }) {
    return OfflineReport(
      localId: localId,
      category: category,
      description: description,
      localImagePaths: localImagePaths,
      localVoiceNotePath: localVoiceNotePath,
      lat: lat,
      lng: lng,
      address: address,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
    );
  }
}
