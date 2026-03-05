import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String error;
  ApiException(this.statusCode, this.error);

  @override
  String toString() => 'ApiException($statusCode, $error)';
}

class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;

  Future<Map<String, dynamic>> postJson(
    String path, {
    required Map<String, dynamic> body,
    Map<String, String>? headers,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.post(
      uri,
      headers: {'content-type': 'application/json', ...?headers},
      body: jsonEncode(body),
    );

    final Map<String, dynamic> data =
        (res.body.isEmpty ? {} : jsonDecode(res.body)) as Map<String, dynamic>;

    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    throw ApiException(
      res.statusCode,
      (data['error'] ?? 'http_${res.statusCode}').toString(),
    );
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.delete(
      uri,
      headers: {'content-type': 'application/json', ...?headers},
    );

    Map<String, dynamic> data = {};
    if (res.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic>) data = decoded;
      } catch (_) {
        data = {'error': res.body};
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    throw ApiException(
      res.statusCode,
      (data['error'] ?? 'http_${res.statusCode}').toString(),
    );
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.get(
      uri,
      headers: {'content-type': 'application/json', ...?headers},
    );

    final Map<String, dynamic> data =
        (res.body.isEmpty ? {} : jsonDecode(res.body)) as Map<String, dynamic>;

    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    throw ApiException(
      res.statusCode,
      (data['error'] ?? 'http_${res.statusCode}').toString(),
    );
  }
}
