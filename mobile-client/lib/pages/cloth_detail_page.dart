import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/cloth.dart';
import '../services/esp32_movement_service.dart';

class ClothDetailPage extends StatefulWidget {
  const ClothDetailPage({
    super.key,
    required this.cloth,
    required this.showShopLink,
    required this.canDelete,
    required this.enableLiveGraphs,
    this.onDelete,
  });

  final Cloth cloth;
  final bool showShopLink;

  final bool canDelete;
  final bool enableLiveGraphs;
  final Future<void> Function(String clothId)? onDelete;

  @override
  State<ClothDetailPage> createState() => _ClothDetailPageState();
}

class _ClothDetailPageState extends State<ClothDetailPage> {
  StreamSubscription? _sensorSub;

  static const int _maxPoints = 120;

  final List<double> _ax = [];
  final List<double> _ay = [];
  final List<double> _az = [];

  final List<double> _gx = [];
  final List<double> _gy = [];
  final List<double> _gz = [];

  final List<double> _rg = [];

  bool _hasData = false;

  void _push(List<double> list, double v) {
    list.add(v);
    if (list.length > _maxPoints) {
      list.removeRange(0, list.length - _maxPoints);
    }
  }

  @override
  void initState() {
    super.initState();

    final canShow =
        widget.enableLiveGraphs && widget.cloth.name.trim() == 'T.002';
    if (!canShow) return;
    final isT002 = (widget.cloth.name.trim() == 'T.002');
    if (!isT002) return;

    const url = 'ws://10.213.255.72:81';
    Esp32MovementService.instance.connect(url);

    _sensorSub = Esp32MovementService.instance.stream.listen(
      (data) {
        if (!mounted) return;
        setState(() {
          _hasData = true;

          _push(_ax, data.ax);
          _push(_ay, data.ay);
          _push(_az, data.az);

          _push(_gx, data.gx);
          _push(_gy, data.gy);
          _push(_gz, data.gz);

          _push(_rg, data.resultantG);
        });
      },
      onError: (_) {
        if (!mounted) return;
        setState(() => _hasData = false);
      },
    );
  }

  @override
  void dispose() {
    _sensorSub?.cancel();
    Esp32MovementService.instance.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cloth = widget.cloth;
    final showShopLink = widget.showShopLink;
    final canDelete = widget.canDelete;
    final onDelete = widget.onDelete;

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

    final showLiveGraphs =
        widget.enableLiveGraphs && cloth.name.trim() == 'T.002';

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
                    await onDelete(cloth.id);
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
            Center(
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

            if (showLiveGraphs) ...[
              const SizedBox(height: 12),
              _card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Mouvement (live)',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          Text(
                            _hasData ? 'OK' : 'En attente…',
                            style: TextStyle(
                              fontSize: 12,
                              color: _hasData ? Colors.green : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      const Text(
                        'Accélération (X / Y / Z)',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        height: 130,
                        width: double.infinity,
                        child: _TripleChart(
                          a: _ax,
                          b: _ay,
                          c: _az,
                          mode: _ChartMode.acc,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Courbes : X = gauche/droite (bleu) • Y = avant/arrière (rose) • Z = haut/bas (gravité incluse)',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),

                      const SizedBox(height: 12),
                      const Text(
                        'Rotation (X / Y / Z)',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        height: 130,
                        width: double.infinity,
                        child: _TripleChart(
                          a: _gx,
                          b: _gy,
                          c: _gz,
                          mode: _ChartMode.gyro,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Courbes : X = roulis (bleu) • Y = tangage (rose) • Z = lacet (rotations du capteur)',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),

                      const SizedBox(height: 12),
                      const Text(
                        'Intensité du mouvement',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),

                      const SizedBox(height: 6),
                      SizedBox(
                        height: 100,
                        width: double.infinity,
                        child: _SingleChart(values: _rg),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Plus la courbe monte, plus le vêtement bouge.',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ],
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

enum _ChartMode { acc, gyro }

class _TripleChart extends StatelessWidget {
  const _TripleChart({
    required this.a,
    required this.b,
    required this.c,
    required this.mode,
  });

  final List<double> a;
  final List<double> b;
  final List<double> c;
  final _ChartMode mode;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _TriplePainter(a: a, b: b, c: c, mode: mode),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFEAEAEA)),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

class _SingleChart extends StatelessWidget {
  const _SingleChart({required this.values});
  final List<double> values;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _SinglePainter(values: values),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFEAEAEA)),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

class _TriplePainter extends CustomPainter {
  _TriplePainter({
    required this.a,
    required this.b,
    required this.c,
    required this.mode,
  });

  final List<double> a;
  final List<double> b;
  final List<double> c;
  final _ChartMode mode;

  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()..color = const Color(0xFFF6F6F7);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(12),
      ),
      bg,
    );

    final grid = Paint()
      ..color = const Color(0x22000000)
      ..strokeWidth = 1;
    for (int i = 1; i <= 3; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final minY = mode == _ChartMode.acc ? -2.0 : -250.0;
    final maxY = mode == _ChartMode.acc ? 2.0 : 250.0;

    void draw(List<double> data, int color) {
      if (data.length < 2) return;

      final p = Paint()
        ..color = Color(color)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;

      final path = Path();
      final n = data.length;

      for (int i = 0; i < n; i++) {
        final x = (i / (n - 1)) * size.width;
        final v = data[i].clamp(minY, maxY);
        final t = (v - minY) / (maxY - minY);
        final y = size.height * (1 - t);

        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(path, p);
    }

    draw(a, 0xFF1E88E5);
    draw(b, 0xFFD81B60);
    draw(c, 0xFF43A047);
  }

  @override
  bool shouldRepaint(covariant _TriplePainter oldDelegate) => true;
}

class _SinglePainter extends CustomPainter {
  _SinglePainter({required this.values});
  final List<double> values;

  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()..color = const Color(0xFFF6F6F7);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(12),
      ),
      bg,
    );

    final grid = Paint()
      ..color = const Color(0x22000000)
      ..strokeWidth = 1;
    for (int i = 1; i <= 2; i++) {
      final y = size.height * i / 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    if (values.length < 2) return;

    const minY = 0.0;
    const maxY = 3.0;

    final paint = Paint()
      ..color = const Color(0xFF6A1B9A)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final path = Path();
    final n = values.length;

    for (int i = 0; i < n; i++) {
      final x = (i / (n - 1)) * size.width;
      final v = values[i].clamp(minY, maxY);
      final t = (v - minY) / (maxY - minY);
      final y = size.height * (1 - t);

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SinglePainter oldDelegate) => true;
}
