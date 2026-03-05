import 'dart:async';

class NfcScan {
  NfcScan._();
  static final instance = NfcScan._();

  final _controller = StreamController<String>.broadcast();

  Stream<String> get stream => _controller.stream;

  void emit(String tagId) => _controller.add(tagId);

  void dispose() => _controller.close();
}
