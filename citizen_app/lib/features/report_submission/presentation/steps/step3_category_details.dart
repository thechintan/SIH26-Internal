import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/categories.dart';
import '../widgets/voice_recorder_widget.dart';

class Step3CategoryDetails extends StatefulWidget {
  final String? selectedCategory;
  final String? description;
  final File? voiceNoteFile;
  final Function(String category, String description, File? voiceFile) onDetailsChanged;

  const Step3CategoryDetails({
    super.key,
    required this.selectedCategory,
    required this.description,
    required this.voiceNoteFile,
    required this.onDetailsChanged,
  });

  @override
  State<Step3CategoryDetails> createState() => _Step3CategoryDetailsState();
}

class _Step3CategoryDetailsState extends State<Step3CategoryDetails> {
  String? _selectedCategory;
  late final TextEditingController _descController;
  File? _voiceFile;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.selectedCategory;
    _descController = TextEditingController(text: widget.description ?? '');
    _voiceFile = widget.voiceNoteFile;
  }

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  void _notifyChange() {
    if (_selectedCategory != null) {
      widget.onDetailsChanged(_selectedCategory!, _descController.text, _voiceFile);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Step 3 of 3: Category & Details',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.secondary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Select Issue Category',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Choose the most relevant category to ensure immediate routing.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),

            // Category Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: AppCategories.all.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 2.3,
              ),
              itemBuilder: (context, index) {
                final cat = AppCategories.all[index];
                final isSelected = _selectedCategory == cat.id;

                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedCategory = cat.id);
                    _notifyChange();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.border,
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.2),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.white.withOpacity(0.2)
                                : cat.color.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            cat.icon,
                            size: 20,
                            color: isSelected ? Colors.white : cat.color,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            cat.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? Colors.white : AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),

            // Optional Description (Max 500 chars)
            const Text(
              'Description (Optional)',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descController,
              maxLines: 3,
              maxLength: 500,
              onChanged: (_) => _notifyChange(),
              decoration: const InputDecoration(
                hintText: 'Provide any additional details or landmark info (max 500 chars)...',
              ),
            ),
            const SizedBox(height: 12),

            // Voice Note Recorder
            VoiceRecorderWidget(
              onAudioRecorded: (file) {
                _voiceFile = file;
                _notifyChange();
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
