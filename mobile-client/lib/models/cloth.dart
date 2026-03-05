class Cloth {
  final String id;
  final String name;
  final String imageAsset;

  final String? origin;
  final String? reference;
  final String? matiere;
  final List<String>? entretien;
  final String? shop;
  final String? taille;

  const Cloth({
    required this.id,
    required this.name,
    required this.imageAsset,
    this.origin,
    this.reference,
    this.matiere,
    this.entretien,
    this.shop,
    this.taille,
  });

  bool get hasDetails {
    return origin != null ||
        reference != null ||
        matiere != null ||
        (entretien != null && entretien!.isNotEmpty) ||
        shop != null ||
        taille != null;
  }

  factory Cloth.fromJson(Map<String, dynamic> json) {
    final entretienRaw = json['entretien'];
    final entretien = entretienRaw is List
        ? entretienRaw.map((e) => e.toString()).toList()
        : null;

    final matiere = (json['matière'] ?? json['matiere'])?.toString();
    final taille = (json['Taille'] ?? json['taille'])?.toString();
    return Cloth(
      id: json['id'].toString(),
      name: (json['name'] ?? '').toString(),
      imageAsset: 'assets/images/${json['name']}.webp',
      origin: json['origin']?.toString(),
      reference: json['reference']?.toString(),
      matiere: matiere,
      entretien: entretien,
      shop: json['shop']?.toString(),
      taille: taille,
    );
  }
}
