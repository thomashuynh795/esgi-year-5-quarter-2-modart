import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/services.dart';

import 'pages/auth_gate.dart';
import 'services/nfc_scan.dart';
import 'services/pending_scans.dart';
import 'services/esp32_socket_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: "assets/config/app.env");

  const nfcChannel = MethodChannel('modart/nfc');
  nfcChannel.setMethodCallHandler((call) async {
    if (call.method == "onNfcScan") {
      final tagId = (call.arguments ?? '').toString();
      if (tagId.isEmpty) return;
      await PendingScans.instance.add(tagId);
      NfcScan.instance.emit(tagId);
    }
  });

  runApp(const ClothesLibraryApp());
}

class ClothesLibraryApp extends StatelessWidget {
  const ClothesLibraryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Clothes Library',
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
      ),
      home: const AuthGate(),
    );
  }
}
