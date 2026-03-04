class Cloth {
  final String id;
  final String name;
  final String imageAsset;

  const Cloth({required this.id, required this.name, required this.imageAsset});

  factory Cloth.fromJson(Map<String, dynamic> json) {
    return Cloth(
      id: json['id'].toString(),
      name: json['name'] as String,
      imageAsset: 'assets/images/${json['name']}.webp',
    );
  }
}
