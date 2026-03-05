import 'dart:convert';
import 'dart:io';

import 'package:crypt/crypt.dart';
import 'package:postgres/postgres.dart';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf_cors_headers/shelf_cors_headers.dart';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';

late final Connection _db;

Response _json(int status, Object body) => Response(
      status,
      body: jsonEncode(body),
      headers: {'content-type': 'application/json'},
    );

Future<Map<String, dynamic>> _readJson(Request req) async {
  final body = await req.readAsString();
  if (body.isEmpty) return {};
  return jsonDecode(body) as Map<String, dynamic>;
}

Future<Connection> _openDb() async {
  final host = Platform.environment['PGHOST'] ?? 'localhost';
  final db = Platform.environment['PGDATABASE'] ?? 'modart';
  final user = Platform.environment['PGUSER'] ?? 'postgres';
  final password = Platform.environment['PGPASSWORD'] ?? 'postgres';
  final port = int.tryParse(Platform.environment['PGPORT'] ?? '') ?? 5432;

  return Connection.open(
    Endpoint(
      host: host,
      database: db,
      username: user,
      password: password,
      port: port,
    ),
    settings: const ConnectionSettings(sslMode: SslMode.disable),
  );
}

Future<void> _ensureSchema() async {
  await _db.execute(Sql(r'''
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  '''));

  await _db.execute(Sql(r'''
    CREATE TABLE IF NOT EXISTS clothes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  '''));

  await _db.execute(Sql(r'''
    CREATE TABLE IF NOT EXISTS user_library (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cloth_id TEXT NOT NULL REFERENCES clothes(id) ON DELETE CASCADE,
      scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, cloth_id)
    );
  '''));
}

String _jwtSecret() => Platform.environment['JWT_SECRET'] ?? 'dev-secret';

String _createJwt({required int userId, required String email}) {
  final jwt = JWT(
    {
      'sub': userId,
      'email': email,
    },
    issuer: 'modart-backend',
  );

  return jwt.sign(
    SecretKey(_jwtSecret()),
    algorithm: JWTAlgorithm.HS256,
    expiresIn: const Duration(days: 7),
  );
}

JWT _verifyJwt(String token) {
  return JWT.verify(token, SecretKey(_jwtSecret()));
}

String? _readBearerToken(Request req) {
  final h = req.headers['authorization'] ?? req.headers['Authorization'];
  if (h == null) return null;
  final v = h.trim();
  if (!v.toLowerCase().startsWith('bearer ')) return null;
  return v.substring(7).trim();
}

int? _userIdFromJwt(Request req) {
  final token = _readBearerToken(req);
  if (token == null || token.isEmpty) return null;

  try {
    final jwt = _verifyJwt(token);
    final sub = jwt.payload['sub'];
    final userId = sub is int ? sub : int.tryParse(sub.toString());
    return userId;
  } on JWTException {
    return null;
  } on JWTExpiredException {
    return null;
  } catch (_) {
    return null;
  }
}

Router buildRouter() {
  final r = Router();

  r.get('/health', (Request req) => _json(200, {'ok': true}));

  r.post('/collection/sync', (Request req) async {
    final data = await _readJson(req);
    final items = (data['items'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>()
        .map((e) => {
              'id': (e['id'] ?? '').toString(),
              'name': (e['name'] ?? '').toString(),
            })
        .where((e) => e['id']!.isNotEmpty && e['name']!.isNotEmpty)
        .toList();

    if (items.isEmpty) return _json(400, {'error': 'items_required'});

    for (final it in items) {
      await _db.execute(
        Sql.named(r'''
          INSERT INTO clothes(id, name, updated_at)
          VALUES (@id, @name, now())
          ON CONFLICT (id)
          DO UPDATE SET name=EXCLUDED.name, updated_at=now()
        '''),
        parameters: {'id': it['id'], 'name': it['name']},
      );
    }

    final ids = items.map((e) => e['id']).toList();
    await _db.execute(
      Sql.named(r'''
        DELETE FROM clothes
        WHERE id <> ALL(@ids::text[])
      '''),
      parameters: {'ids': ids},
    );

    return _json(200, {'ok': true, 'count': items.length});
  });

  r.get('/collection', (Request req) async {
    final result =
        await _db.execute(Sql('SELECT id, name FROM clothes ORDER BY id'));
    final items = result.map((row) {
      final m = row.toColumnMap();
      return {'id': m['id'].toString(), 'name': m['name'].toString()};
    }).toList();
    return _json(200, {'items': items});
  });

  r.post('/auth/email-status', (Request req) async {
    final data = await _readJson(req);
    final email = (data['email'] ?? '').toString().trim().toLowerCase();
    if (email.isEmpty) return _json(400, {'error': 'email_required'});

    final rows = await _db.execute(
      Sql.named('SELECT 1 FROM users WHERE lower(email)=@email LIMIT 1'),
      parameters: {'email': email},
    );

    return _json(200, {'exists': rows.isNotEmpty});
  });

  r.get('/auth/checkAuth', (Request req) async {
    final token = _readBearerToken(req);
    if (token == null || token.isEmpty) {
      return _json(401, {'error': 'missing_token'});
    }

    try {
      final jwt = _verifyJwt(token);

      final sub = jwt.payload['sub'];
      final userId = sub is int ? sub : int.tryParse(sub.toString());

      if (userId == null) return _json(401, {'error': 'invalid_token'});

      final result = await _db.execute(
        Sql.named(
            'SELECT id, email, created_at FROM users WHERE id=@id LIMIT 1'),
        parameters: {'id': userId},
      );

      if (result.isEmpty) return _json(401, {'error': 'user_not_found'});

      final row = result.first.toColumnMap();
      final createdAt = (row['created_at'] as DateTime).toUtc();

      return _json(200, {
        'user': {
          'id': row['id'],
          'email': row['email'],
          'createdAt': createdAt.toIso8601String(),
        },
      });
    } on JWTExpiredException {
      return _json(401, {'error': 'token_expired'});
    } on JWTException {
      return _json(401, {'error': 'invalid_token'});
    } catch (_) {
      return _json(500, {'error': 'server_error'});
    }
  });

  r.post('/auth/register', (Request req) async {
    final data = await _readJson(req);
    final email = (data['email'] ?? '').toString().trim().toLowerCase();
    final password = (data['password'] ?? '').toString();

    if (email.isEmpty) return _json(400, {'error': 'email_required'});
    if (password.length < 6) return _json(400, {'error': 'password_too_short'});

    final hash = Crypt.sha256(password, rounds: 12).toString();

    try {
      final result = await _db.execute(
        Sql.named(
          'INSERT INTO users(email, password_hash) VALUES (@email, @password_hash) '
          'RETURNING id, email, created_at',
        ),
        parameters: {'email': email, 'password_hash': hash},
      );

      final row = result.first.toColumnMap();
      final id = (row['id'] as int);
      final createdAt = (row['created_at'] as DateTime).toUtc();

      final accessToken =
          _createJwt(userId: id, email: row['email'].toString());

      return _json(201, {
        'user': {
          'id': id,
          'email': row['email'],
          'createdAt': createdAt.toIso8601String(),
        },
        'accessToken': accessToken,
      });
    } on UniqueViolationException {
      return _json(409, {'error': 'email_already_exists'});
    } on ServerException {
      return _json(500, {'error': 'db_error'});
    }
  });

  r.post('/auth/login', (Request req) async {
    final data = await _readJson(req);
    final email = (data['email'] ?? '').toString().trim().toLowerCase();
    final password = (data['password'] ?? '').toString();

    final result = await _db.execute(
      Sql.named(
        'SELECT id, email, password_hash, created_at '
        'FROM users WHERE lower(email)=@email LIMIT 1',
      ),
      parameters: {'email': email},
    );

    if (result.isEmpty) return _json(401, {'error': 'invalid_credentials'});

    final row = result.first.toColumnMap();
    final storedHash = (row['password_hash'] ?? '').toString();

    final ok = Crypt(storedHash).match(password);
    if (!ok) return _json(401, {'error': 'invalid_credentials'});

    final id = (row['id'] as int);
    final createdAt = (row['created_at'] as DateTime).toUtc();
    final accessToken = _createJwt(userId: id, email: row['email'].toString());

    return _json(200, {
      'user': {
        'id': id,
        'email': row['email'],
        'createdAt': createdAt.toIso8601String(),
      },
      'accessToken': accessToken,
    });
  });

  r.get('/library', (Request req) async {
    final userId = _userIdFromJwt(req);
    if (userId == null) return _json(401, {'error': 'unauthorized'});

    final result = await _db.execute(
      Sql.named(r'''
        SELECT c.id, c.name, ul.scanned_at
        FROM user_library ul
        JOIN clothes c ON c.id = ul.cloth_id
        WHERE ul.user_id = @uid
        ORDER BY ul.scanned_at DESC
      '''),
      parameters: {'uid': userId},
    );

    final items = result.map((row) {
      final m = row.toColumnMap();
      return {
        'id': m['id'].toString(),
        'name': m['name'].toString(),
        'scannedAt': (m['scanned_at'] as DateTime).toUtc().toIso8601String(),
      };
    }).toList();

    return _json(200, {'items': items});
  });

  r.delete('/library/<clothId>', (Request req, String clothId) async {
    final token = _readBearerToken(req);
    if (token == null || token.isEmpty) {
      return _json(401, {'error': 'missing_token'});
    }

    try {
      final jwt = _verifyJwt(token);

      final sub = jwt.payload['sub'];
      final userId = sub is int ? sub : int.tryParse(sub.toString());
      if (userId == null) return _json(401, {'error': 'invalid_token'});

      await _db.execute(
        Sql.named(
          'DELETE FROM user_library WHERE user_id=@uid AND cloth_id=@cid',
        ),
        parameters: {'uid': userId, 'cid': clothId},
      );

      return _json(200, {'ok': true});
    } on JWTExpiredException {
      return _json(401, {'error': 'token_expired'});
    } on JWTException {
      return _json(401, {'error': 'invalid_token'});
    } catch (_) {
      return _json(500, {'error': 'server_error'});
    }
  });

  r.post('/library/scan', (Request req) async {
    final userId = _userIdFromJwt(req);
    if (userId == null) return _json(401, {'error': 'unauthorized'});

    final data = await _readJson(req);
    final clothId = (data['clothId'] ?? '').toString().trim();
    if (clothId.isEmpty) return _json(400, {'error': 'clothId_required'});

    final found = await _db.execute(
      Sql.named('SELECT id, name FROM clothes WHERE id=@id LIMIT 1'),
      parameters: {'id': clothId},
    );

    if (found.isEmpty) return _json(404, {'error': 'not_in_collection'});

    await _db.execute(
      Sql.named(r'''
        INSERT INTO user_library(user_id, cloth_id)
        VALUES (@uid, @cid)
        ON CONFLICT (user_id, cloth_id) DO NOTHING
      '''),
      parameters: {'uid': userId, 'cid': clothId},
    );

    final m = found.first.toColumnMap();
    return _json(200, {
      'added': true,
      'cloth': {'id': m['id'], 'name': m['name']}
    });
  });

  return r;
}

Future<void> main(List<String> args) async {
  _db = await _openDb();
  await _ensureSchema();

  final router = buildRouter();

  final handler = Pipeline()
      .addMiddleware(logRequests())
      .addMiddleware(corsHeaders())
      .addHandler(router.call);

  final port = int.tryParse(Platform.environment['PORT'] ?? '') ?? 8081;
  final server = await shelf_io.serve(handler, InternetAddress.anyIPv4, port);

  print('Backend running on http://${server.address.host}:$port');
}
