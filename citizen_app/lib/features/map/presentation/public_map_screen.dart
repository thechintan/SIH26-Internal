import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:latlong2/latlong.dart';
import 'providers/map_reports_provider.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../my_reports/presentation/report_detail_screen.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/categories.dart';

class PublicMapScreen extends ConsumerStatefulWidget {
  const PublicMapScreen({super.key});

  @override
  ConsumerState<PublicMapScreen> createState() => _PublicMapScreenState();
}

class _PublicMapScreenState extends ConsumerState<PublicMapScreen> {
  final MapController _mapController = MapController();
  Map<String, dynamic>? _selectedReport;

  void _showFilterSheet() {
    final state = ref.read(mapReportsProvider);
    final filter = state.filter;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Filter Map Reports',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  TextButton(
                    onPressed: () {
                      ref.read(mapReportsProvider.notifier).updateFilter(
                            clearCategory: true,
                            clearStatus: true,
                          );
                      Navigator.pop(ctx);
                    },
                    child: const Text('Reset All'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Category',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: AppCategories.all.map((cat) {
                  final isSelected = filter.selectedCategory == cat.id;
                  return ChoiceChip(
                    label: Text(cat.title),
                    selected: isSelected,
                    onSelected: (selected) {
                      ref.read(mapReportsProvider.notifier).updateFilter(
                            category: selected ? cat.id : null,
                            clearCategory: !selected,
                          );
                      Navigator.pop(ctx);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              const Text(
                'Status',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['acknowledged', 'in_progress', 'resolved', 'verified'].map((st) {
                  final isSelected = filter.selectedStatus == st;
                  return ChoiceChip(
                    label: Text(st.replaceAll('_', ' ').toUpperCase()),
                    selected: isSelected,
                    onSelected: (selected) {
                      ref.read(mapReportsProvider.notifier).updateFilter(
                            status: selected ? st : null,
                            clearStatus: !selected,
                          );
                      Navigator.pop(ctx);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final mapState = ref.watch(mapReportsProvider);
    final authState = ref.watch(authProvider);

    // Generate markers
    final markers = mapState.reports.map((report) {
      final loc = report['location'];
      final coords = loc?['coordinates'] as List<dynamic>?;
      final lng = (coords != null && coords.isNotEmpty) ? (coords[0] as num).toDouble() : 72.5714;
      final lat = (coords != null && coords.length > 1) ? (coords[1] as num).toDouble() : 23.0225;
      final catId = report['category'] ?? 'other';
      final cat = AppCategories.getById(catId);

      return Marker(
        point: LatLng(lat, lng),
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap: () {
            setState(() => _selectedReport = report);
          },
          child: Container(
            decoration: BoxDecoration(
              color: cat.color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Icon(cat.icon, color: Colors.white, size: 20),
          ),
        ),
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Public Issue Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter Map',
            onPressed: _showFilterSheet,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => ref.read(mapReportsProvider.notifier).fetchMapReports(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // FlutterMap with MarkerClusterPlugin
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(23.0225, 72.5714), // Ahmedabad center
              initialZoom: 13.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.civicpulse.citizen',
              ),
              MarkerClusterLayerWidget(
                options: MarkerClusterLayerOptions(
                  maxClusterRadius: 45,
                  size: const Size(40, 40),
                  markers: markers,
                  builder: (context, clusterMarkers) {
                    return Container(
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.3),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          clusterMarkers.length.toString(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),

          // Guest Banner if browsing as guest
          if (authState.isGuest)
            Positioned(
              top: 10,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 6),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.primary, size: 18),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Browsing public map as guest',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      onPressed: () => ref.read(authProvider.notifier).logout(),
                      child: const Text('Sign In', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ),

          // Loading Overlay
          if (mapState.isLoading)
            Positioned(
              top: 70,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 8),
                      Text('Loading reports...', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
              ),
            ),

          // Summary Card for Selected Marker
          if (_selectedReport != null)
            Positioned(
              bottom: 20,
              left: 16,
              right: 16,
              child: _buildSummaryCard(_selectedReport!),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(Map<String, dynamic> report) {
    final catId = report['category'] ?? 'other';
    final cat = AppCategories.getById(catId);
    final status = report['status'] ?? 'submitted';
    final statusColor = AppColors.getStatusColor(status);
    final upvotes = report['upvote_count'] ?? 0;
    final address = report['address'] ?? 'Reported location';
    final reportId = report['_id']?.toString() ?? '';

    return Card(
      elevation: 6,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
                  child: Text(
                    cat.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
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
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => setState(() => _selectedReport = null),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              address,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    ref.read(mapReportsProvider.notifier).upvoteReport(reportId);
                    setState(() {
                      _selectedReport!['upvote_count'] = upvotes + 1;
                    });
                  },
                  icon: const Icon(Icons.thumb_up_alt_outlined, size: 16),
                  label: Text('Upvote ($upvotes)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ReportDetailScreen(
                          reportId: reportId,
                          initialReport: report,
                        ),
                      ),
                    );
                  },
                  child: const Text('View Details →'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
