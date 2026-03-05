import 'dart:convert';
import 'package:flutter/services.dart';
import 'api_client.dart';

class CollectionSyncService {
  CollectionSyncService(this._client);
  final ApiClient _client;

  Future<void> syncFromAssets() async {
    final jsonString = await rootBundle.loadString('assets/data/clothes.json');
    final data = (jsonDecode(jsonString) as List<dynamic>)
        .cast<Map<String, dynamic>>();

    final items = data
        .map(
          (e) => {
            'id': (e['id'] ?? '').toString(),
            'name': (e['name'] ?? '').toString(),
          },
        )
        .toList();

    await _client.postJson('/collection/sync', body: {'items': items});
  }
}
