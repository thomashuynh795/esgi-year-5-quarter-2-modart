import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/cloth.dart';

class ClothesService {
  Future<List<Cloth>> loadClothes() async {
    final jsonString = await rootBundle.loadString('assets/data/clothes.json');
    final data = jsonDecode(jsonString) as List<dynamic>;

    return data.cast<Map<String, dynamic>>().map(Cloth.fromJson).toList();
  }
}
