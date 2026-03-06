import 'package:flutter/material.dart';

import '../models/cloth.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/auth_api.dart';
import '../services/clothes_service.dart';
import '../services/library_api.dart';
import '../services/collection_sync_service.dart';
import 'email_page.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:async';
import '../services/nfc_scan.dart';
import '../services/pending_scans.dart';
import 'cloth_detail_page.dart';
import '../services/esp32_socket_service.dart';
import '../services/token_storage.dart';

class HomeTabsPage extends StatefulWidget {
  const HomeTabsPage({super.key});

  @override
  State<HomeTabsPage> createState() => _HomeTabsPageState();
}

class _HomeTabsPageState extends State<HomeTabsPage>
    with WidgetsBindingObserver {
  late final ApiClient _client = ApiClient(baseUrl: dotenv.env['BASE_URL']!);

  late final AuthApi _auth = AuthApi(_client);
  late final LibraryApi _libraryApi = LibraryApi(_client);
  late final CollectionSyncService _sync = CollectionSyncService(_client);

  final _service = ClothesService();

  StreamSubscription<String>? _nfcSub;

  late final Future<List<Cloth>> _clothesFuture;
  Future<List<Cloth>>? _libraryFuture;

  User? _me;
  bool _meLoading = true;

  Map<String, String> _nameToId = {};
  final Map<String, Cloth> _idToCloth = {};
  final Map<String, Cloth> _nameToCloth = {};
  Set<String> _libraryIds = {};
  @override
  void initState() {
    super.initState();
    Esp32SocketService.instance.connect('ws://10.247.101.49:82');
    Esp32SocketService.instance.stream.listen(
      (data) {
        debugPrint('TEMP/HUM reçu: T=${data.temperature} H=${data.humidity}');
      },
      onError: (e) {
        debugPrint('TEMP/HUM erreur: $e');
      },
    );
    WidgetsBinding.instance.addObserver(this);
    _clothesFuture = _service.loadClothes();

    _clothesFuture.then((clothes) {
      if (!mounted) return;
      setState(() {
        _nameToId = {for (final c in clothes) c.name: c.id};
        _idToCloth
          ..clear()
          ..addEntries(clothes.map((c) => MapEntry(c.id, c)));
        _nameToCloth
          ..clear()
          ..addEntries(clothes.map((c) => MapEntry(c.name, c)));
      });
    });

    _loadMe();
    _syncFromJsonAndReloadLibrary();
    _libraryFuture = _fetchAndEnrichLibrary();

    _consumePendingScans();
    _reloadLibrary();
    _nfcSub = NfcScan.instance.stream.listen(
      (name) async {
        if (!mounted) return;

        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Tag détecté : ${name.trim()}')));

        await PendingScans.instance.add(name);
        await _consumePendingScans();
      },
      onError: (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erreur NFC: $e')));
      },
    );
  }

  void _openSensorsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => const _SensorsSheet(),
    );
  }

  Future<List<Cloth>> _fetchAndEnrichLibrary() async {
    final items = await _libraryApi.getLibrary();

    if (_idToCloth.isEmpty || _nameToCloth.isEmpty) {
      final clothes = await _clothesFuture;
      _idToCloth
        ..clear()
        ..addEntries(clothes.map((c) => MapEntry(c.id, c)));
      _nameToCloth
        ..clear()
        ..addEntries(clothes.map((c) => MapEntry(c.name, c)));
    }

    _libraryIds = items.map((c) => c.id).toSet();

    return items
        .map((c) => _idToCloth[c.id] ?? _nameToCloth[c.name] ?? c)
        .toList();
  }

  bool _consuming = false;
  String? _lastScanName;
  DateTime? _lastScanAt;
  bool _openingDetail = false;

  Future<void> _consumePendingScans() async {
    if (_openingDetail) return;
    if (_consuming) return;

    _consuming = true;

    try {
      final token = await const TokenStorage().read();
      if (token == null || token.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                "Vous n'êtes pas connecté. Reconnecte-toi puis rescane.",
              ),
            ),
          );
        }
        return;
      }

      if (_nameToId.isEmpty) {
        final clothes = await _clothesFuture;
        if (!mounted) return;
        _nameToId = {for (final c in clothes) c.name: c.id};
      }

      final pending = await PendingScans.instance.readAll();
      if (pending.isEmpty) return;

      final remaining = List<String>.from(pending);

      for (final scannedName in pending) {
        if (!mounted) return;

        try {
          await _processOneScan(scannedName);

          remaining.remove(scannedName);
          await PendingScans.instance.replaceAll(remaining);
        } catch (_) {
          break;
        }
      }
    } finally {
      _consuming = false;
    }
  }

  Future<void> _processOneScan(String scannedName) async {
    if (_openingDetail) return;
    final now = DateTime.now();
    final name = scannedName.trim();

    if (_lastScanName == name &&
        _lastScanAt != null &&
        now.difference(_lastScanAt!).inMilliseconds < 800) {
      return;
    }
    _lastScanName = name;
    _lastScanAt = now;
    final clothId = _nameToId[name];

    if (clothId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("$name : pas dans la collection")));
      return;
    }

    final current = await _libraryApi.getLibrary();
    _libraryIds = current.map((c) => c.id).toSet();

    if (_libraryIds.contains(clothId)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Vêtement $name est déjà scanné")));
      return;
    }

    try {
      await _libraryApi.scanCloth(clothId);
      if (!mounted) return;
      _libraryIds.add(clothId);
      await _reloadLibrary();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("$name ajouté à la collection de vos vetements"),
        ),
      );
      await _openDetailForClothId(clothId, fromLibrary: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Erreur ajout $name: ${e.error}")));
    } catch (e) {
      await _dropPendingScan(name);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Backend indisponible, rescane le vêtement."),
        ),
      );
      return;
    }
  }

  Future<void> _openDetailForClothId(
    String clothId, {
    required bool fromLibrary,
  }) async {
    if (_openingDetail) return;
    _openingDetail = true;
    try {
      if (_idToCloth.isEmpty || _nameToCloth.isEmpty) {
        final clothes = await _clothesFuture;
        _idToCloth
          ..clear()
          ..addEntries(clothes.map((c) => MapEntry(c.id, c)));
        _nameToCloth
          ..clear()
          ..addEntries(clothes.map((c) => MapEntry(c.name, c)));
      }

      final cloth = _idToCloth[clothId];
      if (cloth == null) return;
      if (!mounted) return;

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ClothDetailPage(
            cloth: cloth,
            showShopLink: false,
            canDelete: fromLibrary,
            enableLiveGraphs: fromLibrary,
            onDelete: fromLibrary
                ? (id) async {
                    await _libraryApi.removeFromLibrary(id);

                    _libraryIds.remove(id);
                    _lastScanName = null;
                    _lastScanAt = null;

                    await _reloadLibrary();
                  }
                : null,
          ),
        ),
      );
    } finally {
      _openingDetail = false;
    }
  }

  @override
  void dispose() {
    _nfcSub?.cancel();
    Esp32SocketService.instance.disconnect();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_openingDetail) {
      _consumePendingScans();
    }
  }

  Future<void> _syncFromJsonAndReloadLibrary() async {
    try {
      await _sync.syncFromAssets();
    } catch (_) {}
    await _reloadLibrary();
  }

  Future<void> _reloadLibrary() async {
    final future = _fetchAndEnrichLibrary();
    if (!mounted) return;
    setState(() {
      _libraryFuture = future;
    });
    await future;
  }

  Future<void> _loadMe() async {
    setState(() => _meLoading = true);
    try {
      final me = await _auth.checkAuth();
      if (!mounted) return;
      setState(() => _me = me);
    } catch (_) {
      if (!mounted) return;
      setState(() => _me = null);
    } finally {
      if (mounted) setState(() => _meLoading = false);
    }
  }

  Future<void> _logout() async {
    await _auth.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const EmailPage()),
      (route) => false,
    );
  }

  void _openSettingsDrawer() {
    Scaffold.of(context).openEndDrawer();
  }

  Future<void> _dropPendingScan(String scannedName) async {
    final list = await PendingScans.instance.readAll();
    list.remove(scannedName.trim());
    await PendingScans.instance.replaceAll(list);
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final isMobile = w < 600;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        endDrawer: _SettingsDrawer(email: _me?.email),
        body: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 8),

              if (isMobile) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      const Spacer(),
                      Builder(
                        builder: (context) {
                          final controller = DefaultTabController.of(context);
                          return AnimatedBuilder(
                            animation: controller,
                            builder: (_, __) {
                              final onMaCollection = controller.index == 0;
                              if (!onMaCollection)
                                return const SizedBox.shrink();

                              return IconButton(
                                tooltip: 'Capteurs',
                                icon: const Icon(Icons.sensors_outlined),
                                onPressed: () => _openSensorsSheet(context),
                              );
                            },
                          );
                        },
                      ),
                      _AccountMenu(
                        email: _me?.email,
                        loading: _meLoading,
                        onLogout: _logout,
                        onOpenSettings: _openSettingsDrawer,
                        onRefreshMe: _loadMe,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: _CenteredMinimalTabs(),
                ),
              ] else ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      const Expanded(child: SizedBox()),
                      const Expanded(flex: 2, child: _CenteredMinimalTabs()),
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: _AccountMenu(
                            email: _me?.email,
                            loading: _meLoading,
                            onLogout: _logout,
                            onOpenSettings: _openSettingsDrawer,
                            onRefreshMe: _loadMe,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 12),

              Expanded(
                child: FutureBuilder<List<Cloth>>(
                  future: _clothesFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    if (snapshot.hasError) {
                      return Center(child: Text('Erreur: ${snapshot.error}'));
                    }

                    final clothes = snapshot.data ?? [];

                    return TabBarView(
                      children: [
                        FutureBuilder<List<Cloth>>(
                          future: _libraryFuture,
                          builder: (context, libSnap) {
                            if (libSnap.connectionState ==
                                ConnectionState.waiting) {
                              return const Center(
                                child: CircularProgressIndicator(),
                              );
                            }
                            if (libSnap.hasError) {
                              return Center(
                                child: Text('Erreur: ${libSnap.error}'),
                              );
                            }
                            final library = libSnap.data ?? <Cloth>[];
                            return ClothesGridPage(
                              clothes: library,
                              emptyText:
                                  'Aucun vêtement scanné pour le moment.',
                              showShopLink: false,
                              onDeleteFromLibrary: (clothId) async {
                                await _libraryApi.removeFromLibrary(clothId);
                                _libraryIds.remove(clothId);
                                _lastScanName = null;
                                _lastScanAt = null;
                                await _reloadLibrary();
                              },
                            );
                          },
                        ),
                        ClothesGridPage(
                          clothes: clothes,
                          emptyText: 'Aucun vêtement dans la collection.',
                          showShopLink: true,
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SensorsPanel extends StatelessWidget {
  const _SensorsPanel();

  String _riskTemp(double t) {
    return (t >= 0 && t <= 80) ? 'Risque faible' : 'Risque très élevé';
  }

  String _riskHum(double h) {
    return (h >= 20 && h <= 60) ? 'Risque faible' : 'Risque très élevé';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: StreamBuilder<SensorData>(
        stream: Esp32SocketService.instance.stream,
        builder: (context, snap) {
          final data = snap.data;

          final temp = data?.temperature;
          final hum = data?.humidity;

          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'BlueBox',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),

              _row(
                label: 'Température',
                value: temp == null ? '—' : '${temp.toStringAsFixed(0)}°',
                risk: temp == null ? '—' : _riskTemp(temp),
              ),
              const SizedBox(height: 10),
              _row(
                label: 'Humidité',
                value: hum == null ? '—' : '${hum.toStringAsFixed(0)}%',
                risk: hum == null ? '—' : _riskHum(hum),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _row({
    required String label,
    required String value,
    required String risk,
  }) {
    const cellStyle = TextStyle(fontSize: 14, fontWeight: FontWeight.w500);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFEAEAEA)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(flex: 2, child: Text(label, style: cellStyle)),
          Expanded(
            child: Text(value, style: cellStyle, textAlign: TextAlign.right),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Text(risk, style: cellStyle, textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }
}

class _SensorsSheet extends StatelessWidget {
  const _SensorsSheet();

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.35,
      minChildSize: 0.25,
      maxChildSize: 0.9,
      builder: (context, scrollController) {
        return ListView(
          controller: scrollController,
          children: const [_SensorsPanel()],
        );
      },
    );
  }
}

class _CenteredMinimalTabs extends StatelessWidget {
  const _CenteredMinimalTabs();

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final isMobile = w < 600;

    final labelStyle = TextStyle(
      fontSize: isMobile ? 14 : 15,
      fontWeight: FontWeight.w500,
      letterSpacing: isMobile ? 0.2 : 0.5,
    );

    return SizedBox(
      height: 44,
      child: TabBar(
        isScrollable: false,
        splashFactory: NoSplash.splashFactory,
        overlayColor: const WidgetStatePropertyAll(Colors.transparent),
        enableFeedback: false,

        labelStyle: labelStyle,
        unselectedLabelStyle: labelStyle,

        labelColor: Colors.black,
        unselectedLabelColor: const Color(0xFFBDBDBD),

        indicatorSize: TabBarIndicatorSize.label,
        indicatorColor: Colors.black,
        indicatorWeight: 2.0,

        dividerColor: Colors.transparent,

        tabs: const [
          Tab(
            child: Align(
              alignment: Alignment.center,
              child: Text(
                'My Collection',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          Tab(
            child: Align(
              alignment: Alignment.center,
              child: Text('Shop', maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountMenu extends StatelessWidget {
  const _AccountMenu({
    required this.email,
    required this.loading,
    required this.onLogout,
    required this.onOpenSettings,
    required this.onRefreshMe,
  });

  final String? email;
  final bool loading;
  final Future<void> Function() onLogout;
  final VoidCallback onOpenSettings;
  final Future<void> Function() onRefreshMe;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Compte',
      icon: const Icon(Icons.account_circle_outlined),
      onSelected: (value) async {
        if (value == 'logout') await onLogout();
      },
      itemBuilder: (_) => [
        PopupMenuItem<String>(
          enabled: false,
          value: 'noop',
          child: Row(
            children: [
              const Icon(Icons.person_outline, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  loading ? 'Chargement…' : (email ?? 'Utilisateur'),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem(
          value: 'logout',
          child: Row(
            children: [
              Icon(Icons.logout, size: 18),
              SizedBox(width: 10),
              Text('Se déconnecter'),
            ],
          ),
        ),
      ],
    );
  }
}

class _SettingsDrawer extends StatelessWidget {
  const _SettingsDrawer({this.email});

  final String? email;

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final isMobile = w < 600;

    return Drawer(
      width: isMobile ? w * 0.85 : 360,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Paramètres',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              if (email != null) ...[
                const Text(
                  'Compte',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.black54,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  email!,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
              ],
              const Text('Ajoute ici tes options : profil, thème, etc.'),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.close),
                label: const Text('Fermer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ClothesGridPage extends StatefulWidget {
  const ClothesGridPage({
    super.key,
    required this.clothes,
    required this.emptyText,
    this.pageSize = 10,
    required this.showShopLink,
    this.onDeleteFromLibrary,
  });

  final List<Cloth> clothes;
  final String emptyText;
  final int pageSize;
  final bool showShopLink;
  final Future<void> Function(String clothId)? onDeleteFromLibrary;
  @override
  State<ClothesGridPage> createState() => _ClothesGridPageState();
}

class _ClothesGridPageState extends State<ClothesGridPage> {
  int _page = 0;

  int get _pageCount {
    final total = widget.clothes.length;
    if (total == 0) return 1;
    return (total / widget.pageSize).ceil();
  }

  List<Cloth> get _currentPageItems {
    final start = _page * widget.pageSize;
    final end = (start + widget.pageSize).clamp(0, widget.clothes.length);
    if (start >= widget.clothes.length) return [];
    return widget.clothes.sublist(start, end);
  }

  void _goPrev() =>
      setState(() => _page = (_page - 1).clamp(0, _pageCount - 1));
  void _goNext() =>
      setState(() => _page = (_page + 1).clamp(0, _pageCount - 1));

  @override
  void didUpdateWidget(covariant ClothesGridPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_page > _pageCount - 1) {
      _page = (_pageCount - 1).clamp(0, _pageCount - 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.clothes.isEmpty) {
      return Center(child: Text(widget.emptyText, textAlign: TextAlign.center));
    }

    final items = _currentPageItems;

    return Column(
      children: [
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final w = constraints.maxWidth;

              int crossAxisCount = 2;
              if (w >= 1200) {
                crossAxisCount = 6;
              } else if (w >= 900) {
                crossAxisCount = 5;
              } else if (w >= 650) {
                crossAxisCount = 4;
              } else if (w >= 420) {
                crossAxisCount = 3;
              }

              return GridView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  mainAxisSpacing: 28,
                  crossAxisSpacing: 28,
                  childAspectRatio: 1 / 1.15,
                ),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final c = items[index];
                  return _ClothTile(
                    cloth: c,
                    showShopLink: widget.showShopLink,
                    onDeleteFromLibrary: widget.onDeleteFromLibrary,
                  );
                },
              );
            },
          ),
        ),
        if (widget.clothes.length > widget.pageSize)
          Padding(
            padding: const EdgeInsets.only(bottom: 12, top: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: _page == 0 ? null : _goPrev,
                  icon: const Icon(Icons.chevron_left),
                ),
                Text(
                  'Page ${_page + 1} / $_pageCount',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                IconButton(
                  onPressed: _page >= _pageCount - 1 ? null : _goNext,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _ClothTile extends StatelessWidget {
  const _ClothTile({
    required this.cloth,
    required this.showShopLink,
    this.onDeleteFromLibrary,
  });

  final Cloth cloth;
  final bool showShopLink;
  final Future<void> Function(String clothId)? onDeleteFromLibrary;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ClothDetailPage(
              cloth: cloth,
              showShopLink: showShopLink,
              canDelete: onDeleteFromLibrary != null,
              enableLiveGraphs: onDeleteFromLibrary != null,
              onDelete: onDeleteFromLibrary,
            ),
          ),
        );
      },
      child: Column(
        children: [
          Expanded(
            child: Center(
              child: Image.asset(
                cloth.imageAsset,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stack) {
                  return Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFEAEAEA)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.image_outlined),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            cloth.taille != null
                ? '${cloth.name} (${cloth.taille})'
                : cloth.name,
            style: const TextStyle(
              fontSize: 13,
              letterSpacing: 0.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
