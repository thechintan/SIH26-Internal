# CivicPulse Citizen Mobile App (Flutter)

Modern, high-contrast, offline-first citizen-facing mobile application for the **CivicPulse** Community Issue Reporting & Municipal Response Platform.

---

## 📱 Features

1. **⚡ Fast 3-Step Report Submission (< 30 seconds)**:
   - **Step 1: Media Capture**: Capture or pick 1–3 photos with live thumbnail strip and deletion.
   - **Step 2: Interactive Location Pin**: Auto-fetches high-accuracy GPS coordinates, alerts if accuracy is low (>50m), and lets the citizen drag/tap on the interactive OpenStreetMap (OSM) to adjust the pin.
   - **Step 3: Category & Voice Note**: Grid of high-contrast category cards (Pothole, Streetlight, Garbage, Water Leakage, Drainage, Stray Animals, etc.), 500-character description, and optional 60-second voice note recorder with playback preview.
   - **Duplicate Detection**: Flags existing open reports within 50m and allows instant 1-tap **Upvote** instead of duplicate creation.
2. **📶 Offline-First Resilient Architecture**:
   - Stores drafts locally in encrypted Hive storage when offline or on network failure.
   - Shows a prominent **"Pending Sync"** badge in *My Reports*.
   - Automatically monitors network state via `connectivity_plus` and syncs pending offline queue items with S3 & backend when connection restores.
3. **🗺️ Interactive Public Map**:
   - Clustered marker display via `flutter_map_marker_cluster` without needing external Google Maps API keys.
   - Filter by Category and Status.
   - Tap marker for summary card with 1-tap Upvote.
4. **📋 My Reports & Resolution Timeline**:
   - List citizen's reports with real-time status chips (`Acknowledged`, `In Progress`, `Resolved`, `Verified`, `Pending Sync`).
   - Detailed progress timeline mirroring backend `status_history`.
   - Pull-to-refresh.
5. **🔐 Authentication & Guest Mode**:
   - OTP Login with `+91` mobile verification and secure JWT token storage in `flutter_secure_storage`.
   - **Browse as Guest** mode to explore the public map without logging in.
6. **🔔 Push Notifications & Deep Linking**:
   - Handles FCM push notifications for status updates and deep-links directly to the report's progress timeline.

---

## 🛠️ Stack & Architecture

- **Framework**: Flutter 3.35+ (Dart 3.9+)
- **State Management**: `flutter_riverpod` (v2.6)
- **HTTP Client**: `Dio` with auto token attachment & 401 refresh interceptor
- **Offline Storage**: `hive` & `hive_flutter`
- **Secure Token Storage**: `flutter_secure_storage`
- **Maps**: `flutter_map` + `flutter_map_marker_cluster` + `latlong2` (OpenStreetMap)
- **Location & Sensors**: `geolocator`, `geocoding`, `image_picker`, `record`, `audioplayers`
- **Network & Notifications**: `connectivity_plus`, `flutter_local_notifications`, `firebase_messaging`

---

## 🚀 Getting Started

### 1. Prerequisites
- Flutter SDK installed (`flutter --version`)
- Android Studio / VS Code with Flutter extensions
- Running CivicPulse NestJS backend (`http://localhost:3000` or `http://10.0.2.2:3000`)

### 2. Install Dependencies
```bash
cd citizen_app
flutter pub get
```

### 3. Configure Backend Base URL
The app comes with a server configuration modal accessible via the ⚙️ icon on the login screen or via `lib/core/constants/api_endpoints.dart`:

| Environment | Base URL |
|---|---|
| **Android Emulator** | `http://10.0.2.2:3000` *(Default)* |
| **iOS Simulator / Chrome / macOS** | `http://localhost:3000` |
| **Physical Phone via WiFi** | `http://<YOUR_LOCAL_IP>:3000` (e.g. `http://192.168.1.15:3000`) |

### 4. Run the App
```bash
# Android
flutter run -d android

# Web / Chrome
flutter run -d chrome

# Windows Desktop
flutter run -d windows
```

### 5. Seed Test Citizen Logins
Use any seeded test mobile number (dev OTP will automatically display):
- `9876543210` (OTP: `123456`)
- `9876543211` (OTP: `123456`)
- `9876543212` (OTP: `123456`)

---

## 🔥 Firebase Setup for Push Notifications

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Add an Android app with package name `com.civicpulse.citizen`.
3. Download `google-services.json` and place it in `citizen_app/android/app/`.
4. For iOS: Download `GoogleService-Info.plist` and place it in `citizen_app/ios/Runner/`.
5. In your NestJS backend `.env`, configure `FCM_SERVICE_ACCOUNT_PATH` with your Firebase Admin Service Account credentials.
