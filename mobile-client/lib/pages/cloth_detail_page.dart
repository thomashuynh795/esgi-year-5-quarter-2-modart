import 'package:flutter/material.dart';
import '../models/cloth.dart';
import 'package:url_launcher/url_launcher.dart';

class ClothDetailPage extends StatelessWidget {
  const ClothDetailPage({
    super.key,
    required this.cloth,
    required this.showShopLink,
    required this.canDelete,
    this.onDelete,
  });

  final Cloth cloth;
  final bool showShopLink;

  final bool canDelete;
  final Future<void> Function(String clothId)? onDelete;

  @override
  @override
  Widget build(BuildContext context) {
    final labelStyle = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: Colors.black.withOpacity(0.55),
      height: 1.2,
    );

    final valueStyle = const TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      height: 1.25,
      color: Colors.black,
    );

    final bodyTextStyle = const TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 1.35,
      color: Colors.black,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F7),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF6F6F7),
        foregroundColor: Colors.black,
        elevation: 0,
        centerTitle: true,
        title: Text(
          cloth.name,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          if (canDelete)
            IconButton(
              tooltip: 'Supprimer',
              icon: const Icon(Icons.delete_outline),
              onPressed: () async {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (_) => AlertDialog(
                    title: const Text('Supprimer ce vêtement ?'),
                    content: Text(
                      'Retirer ${cloth.name} de la collection de vos vetements.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Annuler'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Supprimer'),
                      ),
                    ],
                  ),
                );

                if (ok != true) return;

                try {
                  if (onDelete != null) {
                    await onDelete!(cloth.id);
                  }
                  if (!context.mounted) return;

                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${cloth.name} supprimé')),
                  );
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur suppression: $e')),
                  );
                }
              },
            ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Expanded(
              child: Center(
                child: Image.asset(
                  cloth.imageAsset,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFEAEAEA)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.image_outlined),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            _card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: cloth.hasDetails
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (cloth.origin != null) ...[
                            _kv(
                              'Origine',
                              cloth.origin!,
                              labelStyle,
                              valueStyle,
                            ),
                            const SizedBox(height: 14),
                          ],
                          if (cloth.reference != null) ...[
                            _kv(
                              'Reference',
                              cloth.reference!,
                              labelStyle,
                              valueStyle,
                            ),
                            const SizedBox(height: 14),
                          ],
                          if (cloth.taille != null) ...[
                            Text('Taille ${cloth.taille}', style: valueStyle),
                            const SizedBox(height: 14),
                          ],
                          if (cloth.matiere != null) ...[
                            _kv(
                              'Matière',
                              cloth.matiere!,
                              labelStyle,
                              valueStyle,
                            ),
                            const SizedBox(height: 14),
                          ],
                          if (cloth.entretien != null &&
                              cloth.entretien!.isNotEmpty) ...[
                            Text('Entretien', style: labelStyle),
                            const SizedBox(height: 10),
                            ...cloth.entretien!.map(
                              (e) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text('• $e', style: bodyTextStyle),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                          if (cloth.shop != null) ...[
                            const SizedBox(height: 10),

                            if (showShopLink)
                              SizedBox(
                                height: 44,
                                width: double.infinity,
                                child: FilledButton(
                                  style: FilledButton.styleFrom(
                                    backgroundColor: Colors.black,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  onPressed: () async {
                                    final uri = Uri.parse(cloth.shop!);
                                    final ok = await launchUrl(
                                      uri,
                                      mode: LaunchMode.externalApplication,
                                    );
                                    if (!ok && context.mounted) {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            "Impossible d’ouvrir le lien.",
                                          ),
                                        ),
                                      );
                                    }
                                  },
                                  child: const Text(
                                    'Achetez',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ],
                      )
                    : Text(
                        "Détail pas encore disponible. Reviens plus tard.",
                        style: bodyTextStyle.copyWith(
                          color: Colors.black.withOpacity(0.7),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _kv(
    String label,
    String value,
    TextStyle labelStyle,
    TextStyle valueStyle,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: labelStyle),
        const SizedBox(height: 6),
        Text(value, style: valueStyle),
      ],
    );
  }
}
