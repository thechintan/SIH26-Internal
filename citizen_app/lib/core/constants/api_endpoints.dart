class ApiEndpoints {
  // Configurable base URL:
  // With `adb reverse tcp:3000 tcp:3000` or web/desktop, http://localhost:3000 connects directly
  // In addition, users can configure a custom IP from the in-app settings icon on the login screen.
  static String baseUrl = 'http://localhost:3000';

  // Auth
  static String get otpRequest => '$baseUrl/auth/citizen/otp-request';
  static String get otpVerify => '$baseUrl/auth/citizen/otp-verify';
  static String get refreshToken => '$baseUrl/auth/refresh';
  static String get logout => '$baseUrl/auth/logout';

  // Reports
  static String get reports => '$baseUrl/reports';
  static String reportDetail(String id) => '$baseUrl/reports/$id';
  static String upvoteReport(String id) => '$baseUrl/reports/$id/upvote';
  static String get mapReports => '$baseUrl/map/reports';

  // Uploads
  static String get presignedUrl => '$baseUrl/uploads/presigned-url';

  // Categories
  static String get categories => '$baseUrl/admin/categories';
}
