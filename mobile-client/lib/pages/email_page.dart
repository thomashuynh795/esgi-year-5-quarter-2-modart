import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/auth_api.dart';
import 'password_page.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:async';
import '../services/nfc_scan.dart';
import '../services/pending_scans.dart';

class EmailPage extends StatefulWidget {
  const EmailPage({super.key});

  @override
  State<EmailPage> createState() => _EmailPageState();
}

class _EmailPageState extends State<EmailPage> {
  @override
  void initState() {
    super.initState();

    _loadPendingScanAndShowBanner();

    _nfcSub = NfcScan.instance.stream.listen((name) async {
      _pendingScanName = name.trim();
      if (_pendingScanName!.isEmpty) return;

      _showAuthBanner(_pendingScanName!);
    });
  }

  Future<void> _loadPendingScanAndShowBanner() async {
    final list = await PendingScans.instance.readAll();
    if (!mounted) return;

    if (list.isNotEmpty) {
      _pendingScanName = list.last.trim();
      if (_pendingScanName!.isNotEmpty) {
        // On attend que le widget soit monté visuellement
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _showAuthBanner(_pendingScanName!);
        });
      }
    }
  }

  void _showAuthBanner(String name) {
    // Nettoie l’ancien banner si déjà affiché
    ScaffoldMessenger.of(context).clearMaterialBanners();

    ScaffoldMessenger.of(context).showMaterialBanner(
      MaterialBanner(
        backgroundColor: Colors.black,
        content: Align(
          alignment: Alignment.centerRight,
          child: Text(
            'Veuillez vous authentifier, pour ajouter le vêtement $name à votre collection.',
            textAlign: TextAlign.right,
            style: const TextStyle(color: Colors.white),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () =>
                ScaffoldMessenger.of(context).clearMaterialBanners(),
            child: const Text('OK', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  late final AuthApi _auth = AuthApi(
    ApiClient(baseUrl: dotenv.env['BASE_URL']!),
  );
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  StreamSubscription<String>? _nfcSub;
  String? _pendingScanName;

  @override
  void dispose() {
    _nfcSub?.cancel();
    _emailCtrl.dispose();
    super.dispose();
  }

  bool _isValidEmail(String value) {
    final v = value.trim();
    return v.contains('@') && v.contains('.');
  }

  Future<void> _continue() async {
    final email = _emailCtrl.text.trim().toLowerCase();
    if (!_isValidEmail(email)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Email invalide')));
      return;
    }
    ScaffoldMessenger.of(context).clearMaterialBanners();
    setState(() => _loading = true);
    try {
      final exists = await _auth.emailExists(email);

      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PasswordPage(
            email: email,
            mode: exists ? PasswordMode.login : PasswordMode.signup,
            auth: _auth,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 40),
                          const Text(
                            "Log in or sign up",
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          // const SizedBox(height: 24),
                          // _SocialButton(
                          //   text: "Continue with Google",
                          //   icon: Icons.g_mobiledata,
                          //   onPressed: () {},
                          // ),
                          // const SizedBox(height: 12),
                          // _SocialButton(
                          //   text: "Continue with Apple",
                          //   icon: Icons.apple,
                          //   onPressed: () {},
                          // ),
                          // const SizedBox(height: 24),
                          // Row(
                          //   children: const [
                          //     Expanded(child: Divider(thickness: 1)),
                          //     Padding(
                          //       padding: EdgeInsets.symmetric(horizontal: 12),
                          //       child: Text(
                          //         "or",
                          //         style: TextStyle(color: Colors.grey),
                          //       ),
                          //     ),
                          //     Expanded(child: Divider(thickness: 1)),
                          //   ],
                          // ),
                          const SizedBox(height: 24),
                          const Text("Email", style: TextStyle(fontSize: 14)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _loading ? null : _continue(),
                            decoration: InputDecoration(
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),
                          SizedBox(
                            height: 52,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4A6CF7),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: _loading ? null : _continue,
                              child: _loading
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                      ),
                                    )
                                  : const Text(
                                      "Continue",
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.white,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  final String text;
  final IconData icon;
  final VoidCallback onPressed;

  const _SocialButton({
    required this.text,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.black),
        label: Text(
          text,
          style: const TextStyle(color: Colors.black, fontSize: 14),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFFE0E0E0)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }
}
