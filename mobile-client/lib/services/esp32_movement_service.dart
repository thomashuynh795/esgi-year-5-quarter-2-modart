import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

class SensorDataMovement {
  final double ax;
  final double ay;
  final double az;
  final double resultantG;
  final double gx;
  final double gy;
  final double gz;

  const SensorDataMovement({
    required this.ax,
    required this.ay,
    required this.az,
    required this.resultantG,
    required this.gx,
    required this.gy,
    required this.gz,
  });
}

class Esp32MovementService {
  Esp32MovementService._();
  static final Esp32MovementService instance = Esp32MovementService._();

  WebSocketChannel? _channel;
  StreamSubscription? _sub;

  final _controller = StreamController<SensorDataMovement>.broadcast();
  Stream<SensorDataMovement> get stream => _controller.stream;

  bool get isConnected => _channel != null;

  void connect(String url) {
    if (_channel != null) return;

    try {
      _channel = WebSocketChannel.connect(Uri.parse(url));

      _sub = _channel!.stream.listen(
        (event) {
          try {
            final data = jsonDecode(event.toString());
            final ax = (data['ax'] as num).toDouble();
            final ay = (data['ay'] as num).toDouble();
            final az = (data['az'] as num).toDouble();
            final resultantG = (data['resultant_g'] as num).toDouble();
            final gx = (data['gx'] as num).toDouble();
            final gy = (data['gy'] as num).toDouble();
            final gz = (data['gz'] as num).toDouble();

            _controller.add(
              SensorDataMovement(
                ax: ax,
                ay: ay,
                az: az,
                resultantG: resultantG,
                gx: gx,
                gy: gy,
                gz: gz,
              ),
            );
          } catch (e) {}
        },
        onError: (e) async {
          await disconnect();
        },
        onDone: () async {
          await disconnect();
        },
        cancelOnError: true,
      );
    } catch (e) {
      _channel = null;
    }
  }

  Future<void> disconnect() async {
    await _sub?.cancel();
    _sub = null;
    await _channel?.sink.close();
    _channel = null;
  }
}
