import 'package:flutter/material.dart';

class CategoryInfo {
  final String id;
  final String title;
  final String description;
  final IconData icon;
  final Color color;

  const CategoryInfo({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
  });
}

class AppCategories {
  static const List<CategoryInfo> all = [
    CategoryInfo(
      id: 'pothole',
      title: 'Pothole & Road',
      description: 'Potholes, broken roads, damaged asphalt',
      icon: Icons.traffic,
      color: Color(0xFFEA580C),
    ),
    CategoryInfo(
      id: 'streetlight',
      title: 'Streetlight',
      description: 'Dark bulb, flickering, damaged pole',
      icon: Icons.lightbulb,
      color: Color(0xFFCA8A04),
    ),
    CategoryInfo(
      id: 'garbage',
      title: 'Garbage & Waste',
      description: 'Overflowing bins, illegal dump, litter',
      icon: Icons.delete_sweep,
      color: Color(0xFF16A34A),
    ),
    CategoryInfo(
      id: 'water_leakage',
      title: 'Water Leakage',
      description: 'Pipe burst, continuous road flooding',
      icon: Icons.water_drop,
      color: Color(0xFF0284C7),
    ),
    CategoryInfo(
      id: 'drainage',
      title: 'Drainage & Sewage',
      description: 'Clogged drain, overflowing manhole',
      icon: Icons.waves,
      color: Color(0xFF7C3AED),
    ),
    CategoryInfo(
      id: 'stray_animal',
      title: 'Stray Animal',
      description: 'Aggressive strays, injured animal',
      icon: Icons.pets,
      color: Color(0xFFDB2777),
    ),
    CategoryInfo(
      id: 'other',
      title: 'Other Issue',
      description: 'Encroachment, public property damage',
      icon: Icons.grid_view_rounded,
      color: Color(0xFF475569),
    ),
  ];

  static CategoryInfo getById(String id) {
    return all.firstWhere(
      (cat) => cat.id.toLowerCase() == id.toLowerCase(),
      orElse: () => CategoryInfo(
        id: id,
        title: id.replaceAll('_', ' ').toUpperCase(),
        description: 'Civic issue',
        icon: Icons.report_problem,
        color: const Color(0xFF475569),
      ),
    );
  }
}
