import '../models/user.dart';
import 'api_client.dart';
import 'token_storage.dart';

class AuthApi {
  AuthApi(this._client);

  final ApiClient _client;
  final _storage = const TokenStorage();

  Future<bool> emailExists(String email) async {
    final data = await _client.postJson(
      '/auth/email-status',
      body: {'email': email},
    );
    return data['exists'] == true;
  }

  Future<User> register(String email, String password) async {
    final data = await _client.postJson(
      '/auth/register',
      body: {'email': email, 'password': password},
    );

    final token = (data['accessToken'] ?? '').toString();
    if (token.isNotEmpty) {
      await _storage.write(token);
    }

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<User> login(String email, String password) async {
    final data = await _client.postJson(
      '/auth/login',
      body: {'email': email, 'password': password},
    );

    final token = (data['accessToken'] ?? '').toString();
    if (token.isNotEmpty) {
      await _storage.write(token);
    }

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<String?> readToken() => _storage.read();

  Future<void> logout() => _storage.delete();

  Future<User> checkAuth() async {
    final token = await readToken();
    if (token == null || token.isEmpty) {
      throw Exception('missing_token');
    }

    final data = await _client.getJson(
      '/auth/checkAuth',
      headers: {'Authorization': 'Bearer $token'},
    );

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }
}
