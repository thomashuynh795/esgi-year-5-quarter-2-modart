class User {
  final int id;
  final String email;
  final DateTime createdAt;

  const User({required this.id, required this.email, required this.createdAt});

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: (json['id'] as num).toInt(),
    email: (json['email'] ?? '').toString(),
    createdAt: DateTime.parse((json['createdAt'] ?? '').toString()),
  );
}
