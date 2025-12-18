import 'package:equatable/equatable.dart';

class User extends Equatable {
  final int id;
  final String name;
  final String email;
  final String? role;
  final int? roleId;
  final String? profilePhoto;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.role,
    this.roleId,
    this.profilePhoto,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String?,
      roleId: json['roleId'] as int?,
      profilePhoto: json['profilePhoto'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'roleId': roleId,
      'profilePhoto': profilePhoto,
    };
  }

  @override
  List<Object?> get props => [id, name, email, role, roleId, profilePhoto];
}
