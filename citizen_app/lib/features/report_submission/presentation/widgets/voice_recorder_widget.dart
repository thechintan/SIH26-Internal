import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import '../../../../core/constants/app_colors.dart';

class VoiceRecorderWidget extends StatefulWidget {
  final Function(File? audioFile) onAudioRecorded;

  const VoiceRecorderWidget({
    super.key,
    required this.onAudioRecorded,
  });

  @override
  State<VoiceRecorderWidget> createState() => _VoiceRecorderWidgetState();
}

class _VoiceRecorderWidgetState extends State<VoiceRecorderWidget> {
  final AudioRecorder _audioRecorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();

  bool _isRecording = false;
  bool _isPlaying = false;
  int _recordSeconds = 0;
  Timer? _timer;
  String? _audioPath;

  @override
  void dispose() {
    _timer?.cancel();
    _audioRecorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final dir = await getTemporaryDirectory();
        final path = '${dir.path}/civic_voice_${DateTime.now().millisecondsSinceEpoch}.m4a';

        await _audioRecorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc),
          path: path,
        );

        setState(() {
          _isRecording = true;
          _recordSeconds = 0;
          _audioPath = null;
        });

        _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
          setState(() {
            _recordSeconds++;
            if (_recordSeconds >= 60) {
              _stopRecording();
            }
          });
        });
      }
    } catch (e) {
      debugPrint('Voice record error: $e');
    }
  }

  Future<void> _stopRecording() async {
    _timer?.cancel();
    try {
      final path = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
        _audioPath = path;
      });
      if (path != null) {
        widget.onAudioRecorded(File(path));
      }
    } catch (e) {
      debugPrint('Voice record stop error: $e');
    }
  }

  Future<void> _togglePlayback() async {
    if (_audioPath == null) return;

    if (_isPlaying) {
      await _audioPlayer.pause();
      setState(() => _isPlaying = false);
    } else {
      await _audioPlayer.play(DeviceFileSource(_audioPath!));
      setState(() => _isPlaying = true);
      _audioPlayer.onPlayerComplete.listen((_) {
        if (mounted) setState(() => _isPlaying = false);
      });
    }
  }

  void _deleteAudio() {
    _audioPlayer.stop();
    setState(() {
      _audioPath = null;
      _recordSeconds = 0;
      _isPlaying = false;
    });
    widget.onAudioRecorded(null);
  }

  @override
  Widget build(BuildContext context) {
    if (_audioPath != null) {
      // Audio playback preview card
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green.shade300),
        ),
        child: Row(
          children: [
            IconButton(
              icon: Icon(
                _isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                color: Colors.green.shade700,
                size: 32,
              ),
              onPressed: _togglePlayback,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Voice Note Recorded',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: Colors.black87,
                    ),
                  ),
                  Text(
                    'Duration: $_recordSeconds sec',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: _deleteAudio,
            ),
          ],
        ),
      );
    }

    if (_isRecording) {
      // Recording active
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.shade300),
        ),
        child: Row(
          children: [
            const Icon(Icons.mic, color: Colors.red, size: 24),
            const SizedBox(width: 12),
            Text(
              'Recording: 00:${_recordSeconds.toString().padLeft(2, '0')} / 60s',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Colors.red,
                fontSize: 14,
              ),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _stopRecording,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              ),
              child: const Text('Stop', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
    }

    // Default start button
    return OutlinedButton.icon(
      onPressed: _startRecording,
      icon: const Icon(Icons.mic, color: AppColors.primary),
      label: const Text('Add 60s Voice Note (Optional)'),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 12),
      ),
    );
  }
}
