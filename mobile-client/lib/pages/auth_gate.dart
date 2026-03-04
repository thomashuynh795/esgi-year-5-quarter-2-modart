import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/auth_api.dart';
import 'email_page.dart';
import 'home_tabs_page.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final AuthApi _auth = AuthApi(
    ApiClient(baseUrl: dotenv.env['BASE_URL']!),
  );

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final token = await _auth.readToken();
    debugPrint('TOKEN AT BOOT: $token');

    if (token == null || token.isEmpty) {
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const EmailPage()));
      return;
    }

    try {
      await _auth.checkAuth();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeTabsPage()),
      );
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        await _auth.logout();
        if (!mounted) return;
        Navigator.of(
          context,
        ).pushReplacement(MaterialPageRoute(builder: (_) => const EmailPage()));
      } else {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeTabsPage()),
        );
      }
    } catch (_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeTabsPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
