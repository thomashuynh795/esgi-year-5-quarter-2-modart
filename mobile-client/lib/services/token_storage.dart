import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _key = 'accessToken';
  const TokenStorage();

  Future<void> write(String token) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, token);
      return;
    }
    const secure = FlutterSecureStorage();
    await secure.write(key: _key, value: token);
  }

  Future<String?> read() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_key);
    }
    const secure = FlutterSecureStorage();
    return secure.read(key: _key);
  }

  Future<void> delete() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_key);
      return;
    }
    const secure = FlutterSecureStorage();
    await secure.delete(key: _key);
  }
}
