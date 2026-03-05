import 'package:shared_preferences/shared_preferences.dart';

class PendingScans {
  static const _key = 'pending_nfc_scans';
  PendingScans._();
  static final instance = PendingScans._();

  Future<void> add(String value) async {
    final v = value.trim();
    if (v.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? <String>[];

    if (list.isNotEmpty && list.last == v) return;

    list.add(v);
    await prefs.setStringList(_key, list);
  }

  Future<List<String>> readAll() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_key) ?? <String>[];
  }

  Future<void> replaceAll(List<String> values) async {
    final prefs = await SharedPreferences.getInstance();
    if (values.isEmpty) {
      await prefs.remove(_key);
    } else {
      await prefs.setStringList(_key, values);
    }
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
