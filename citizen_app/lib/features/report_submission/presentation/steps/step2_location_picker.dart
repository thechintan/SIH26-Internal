import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../../../core/constants/app_colors.dart';

class Step2LocationPicker extends StatefulWidget {
  final LatLng? currentLocation;
  final String? currentAddress;
  final double? accuracyMeters;
  final Function(LatLng location, String address, double accuracy) onLocationChanged;

  const Step2LocationPicker({
    super.key,
    required this.currentLocation,
    required this.currentAddress,
    required this.accuracyMeters,
    required this.onLocationChanged,
  });

  @override
  State<Step2LocationPicker> createState() => _Step2LocationPickerState();
}

class _Step2LocationPickerState extends State<Step2LocationPicker> {
  final MapController _mapController = MapController();
  LatLng _pinLocation = const LatLng(23.0225, 72.5714); // Ahmedabad default
  String _address = 'Detecting address...';
  double _accuracy = 10.0;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.currentLocation != null) {
      _pinLocation = widget.currentLocation!;
      _address = widget.currentAddress ?? 'Selected Location';
      _accuracy = widget.accuracyMeters ?? 10.0;
    } else {
      _fetchCurrentGps();
    }
  }

  Future<void> _fetchCurrentGps() async {
    setState(() => _isLoading = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) {
        setState(() {
          _isLoading = false;
          _address = 'Location permission denied. Please tap map to set pin.';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      final newLatLng = LatLng(position.latitude, position.longitude);
      _pinLocation = newLatLng;
      _accuracy = position.accuracy;

      _mapController.move(newLatLng, 17.0);
      await _reverseGeocode(newLatLng);
    } catch (e) {
      await _reverseGeocode(_pinLocation);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _reverseGeocode(LatLng latLng) async {
    try {
      final placemarks = await placemarkFromCoordinates(
        latLng.latitude,
        latLng.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final parts = [p.name, p.subLocality, p.locality, p.postalCode]
            .where((s) => s != null && s.isNotEmpty)
            .toList();
        _address = parts.join(', ');
      } else {
        _address = '${latLng.latitude.toStringAsFixed(4)}, ${latLng.longitude.toStringAsFixed(4)}';
      }
    } catch (e) {
      _address = '${latLng.latitude.toStringAsFixed(4)}, ${latLng.longitude.toStringAsFixed(4)}';
    }

    widget.onLocationChanged(_pinLocation, _address, _accuracy);
    if (mounted) setState(() {});
  }

  void _onMapTap(TapPosition tapPosition, LatLng latLng) {
    setState(() {
      _pinLocation = latLng;
      _accuracy = 5.0; // Manual pin is precise
    });
    _reverseGeocode(latLng);
  }

  @override
  Widget build(BuildContext context) {
    final bool isLowAccuracy = _accuracy > 50.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Step 2 of 3: Confirm Location',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.secondary,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Pinpoint the exact location',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'GPS coordinates are auto-detected. Tap anywhere or drag to adjust pin.',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // Low accuracy alert banner
          if (isLowAccuracy) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade100,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.shade400),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Location accuracy is low (~${_accuracy.round()}m). Please tap the map to place the pin precisely.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.amber.shade900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Mini Map Container
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _pinLocation,
                      initialZoom: 16.0,
                      onTap: _onMapTap,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.civicpulse.citizen',
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _pinLocation,
                            width: 48,
                            height: 48,
                            child: const Icon(
                              Icons.location_on,
                              size: 48,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Recalculate GPS FAB
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: FloatingActionButton.small(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primary,
                      onPressed: _isLoading ? null : _fetchCurrentGps,
                      child: _isLoading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Address Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.place, color: AppColors.primary, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Detected Address',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _address,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
