import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/storage/hive_storage.dart';
import 'core/network/connectivity_service.dart';
import 'features/notifications/notification_service.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/phone_input_screen.dart';
import 'features/my_reports/presentation/my_reports_screen.dart';
import 'features/my_reports/presentation/report_detail_screen.dart';
import 'features/map/presentation/public_map_screen.dart';
import 'core/constants/app_colors.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize offline Hive storage
  await HiveStorageService().init();

  // Initialize connectivity monitor & background sync trigger
  await ConnectivityService().init();

  // Initialize notification service
  await NotificationService().init();

  runApp(
    const ProviderScope(
      child: CivicPulseApp(),
    ),
  );
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class CivicPulseApp extends ConsumerStatefulWidget {
  const CivicPulseApp({super.key});

  @override
  ConsumerState<CivicPulseApp> createState() => _CivicPulseAppState();
}

class _CivicPulseAppState extends ConsumerState<CivicPulseApp> {
  @override
  void initState() {
    super.initState();
    // Deep linking handler from notification taps
    NotificationService().onReportTap = (reportId) {
      navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (_) => ReportDetailScreen(reportId: reportId),
        ),
      );
    };
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'CivicPulse Citizen',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      theme: AppTheme.lightTheme,
      home: _buildHome(authState),
    );
  }

  Widget _buildHome(AuthState authState) {
    if (authState.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (authState.isGuest) {
      return const PublicMapScreen();
    }

    if (authState.isAuthenticated) {
      return const MainNavigationScreen();
    }

    return const PhoneInputScreen();
  }
}

class MainNavigationScreen extends ConsumerStatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  ConsumerState<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends ConsumerState<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    MyReportsScreen(),
    PublicMapScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primary.withOpacity(0.15),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: AppColors.primary),
            label: 'My Reports',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map, color: AppColors.primary),
            label: 'Public Map',
          ),
        ],
      ),
    );
  }
}
