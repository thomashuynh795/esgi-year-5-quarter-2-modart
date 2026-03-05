import '../models/cloth.dart';
import 'api_client.dart';
import 'token_storage.dart';

class LibraryApi {
  LibraryApi(this._client);

  final ApiClient _client;
  final _storage = const TokenStorage();

  Future<String> _requireToken() async {
    final token = await _storage.read();
    if (token == null || token.isEmpty) throw Exception('missing_token');
    return token;
  }

  Future<List<Cloth>> getLibrary() async {
    final token = await _requireToken();
    final data = await _client.getJson(
      '/library',
      headers: {'Authorization': 'Bearer $token'},
    );

    final items = (data['items'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    return items.map((e) => Cloth.fromJson(e)).toList();
  }

  Future<void> scanCloth(String clothId) async {
    final token = await _requireToken();
    await _client.postJson(
      '/library/scan',
      body: {'clothId': clothId},
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  Future<void> removeFromLibrary(String clothId) async {
    final token = await _requireToken();
    await _client.deleteJson(
      '/library/$clothId',
      headers: {'Authorization': 'Bearer $token'},
    );
  }
}
