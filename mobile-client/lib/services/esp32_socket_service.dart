import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

class SensorData {
  final double temperature;
  final double humidity;

  const SensorData({required this.temperature, required this.humidity});
}

class Esp32SocketService {
  Esp32SocketService._();
  static final Esp32SocketService instance = Esp32SocketService._();

  WebSocketChannel? _channel;
  StreamSubscription? _sub;

  final _controller = StreamController<SensorData>.broadcast();
  Stream<SensorData> get stream => _controller.stream;

  bool get isConnected => _channel != null;

  void connect(String url) {
    if (_channel != null) return;

    _channel = WebSocketChannel.connect(Uri.parse(url));

    _sub = _channel!.stream.listen(
      (event) {
        try {
          final data = jsonDecode(event.toString());
          final temp = (data['temp'] as num).toDouble();
          final hum = (data['humidity'] as num).toDouble();
          _controller.add(SensorData(temperature: temp, humidity: hum));
        } catch (_) {
          // ignore parse errors
        }
      },
      onError: (_) {},
      onDone: () {
        _sub?.cancel();
        _sub = null;
        _channel = null;
      },
      cancelOnError: false,
    );
  }

  Future<void> disconnect() async {
    await _sub?.cancel();
    _sub = null;
    await _channel?.sink.close();
    _channel = null;
  }
}
