import 'package:flutter/material.dart';
import 'home_tabs_page.dart';
import '../services/auth_api.dart';

enum PasswordMode { login, signup }

class PasswordPage extends StatefulWidget {
  const PasswordPage({
    super.key,
    required this.email,
    required this.mode,
    required this.auth,
  });

  final String email;
  final PasswordMode mode;
  final AuthApi auth;

  @override
  State<PasswordPage> createState() => _PasswordPageState();
}

class _PasswordPageState extends State<PasswordPage> {
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _obscure = true;
  bool _loading = false;

  bool get _isSignup => widget.mode == PasswordMode.signup;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    final password = _passwordCtrl.text;

    if (password.length < 6) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('6 caractères minimum')));
      return;
    }

    if (_isSignup && _confirmCtrl.text != password) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Les mots de passe ne correspondent pas')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      if (_isSignup) {
        await widget.auth.register(widget.email, password);
      } else {
        await widget.auth.login(widget.email, password);
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_isSignup ? 'Compte créé' : 'Connecté')),
      );

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeTabsPage()),
        (route) => false,
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
    final title = _isSignup ? 'Create your account' : 'Enter your password';
    final subtitle = widget.email;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      IconButton(
                        onPressed: _loading
                            ? null
                            : () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(subtitle, style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 24),

                  const Text("Password", style: TextStyle(fontSize: 14)),
                  const SizedBox(height: 8),

                  TextField(
                    controller: _passwordCtrl,
                    obscureText: _obscure,
                    textInputAction: _isSignup
                        ? TextInputAction.next
                        : TextInputAction.done,
                    onSubmitted: (_) => _isSignup ? null : _continue(),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                      ),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                        ),
                      ),
                    ),
                  ),

                  if (_isSignup) ...[
                    const SizedBox(height: 14),
                    const Text(
                      "Confirm password",
                      style: TextStyle(fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _confirmCtrl,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _continue(),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 28),

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
                                valueColor: AlwaysStoppedAnimation<Color>(
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
  }
}
