package com.example.mobile

import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.os.Build
import android.os.Bundle
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.nio.charset.Charset

class MainActivity : FlutterActivity() {

    private val CHANNEL = "modart/nfc"
    private var nfcAdapter: NfcAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // Intent initial (app ouverte via scan)
        handleIntent(intent, flutterEngine)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Intent quand app déjà ouverte (singleTop)
        handleIntent(intent, flutterEngine!!)
    }

    override fun onResume() {
        super.onResume()
        enableForegroundDispatch()
    }

    override fun onPause() {
        disableForegroundDispatch()
        super.onPause()
    }

    private fun enableForegroundDispatch() {
        val adapter = nfcAdapter ?: return
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(this, 0, intent, flags)

        val filters = arrayOf(
            IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED)
        )

        adapter.enableForegroundDispatch(this, pendingIntent, filters, null)
    }

    private fun disableForegroundDispatch() {
        nfcAdapter?.disableForegroundDispatch(this)
    }

    private fun handleIntent(intent: Intent, engine: FlutterEngine) {
        val action = intent.action ?: return

        if (action == NfcAdapter.ACTION_TAG_DISCOVERED ||
            action == NfcAdapter.ACTION_NDEF_DISCOVERED ||
            action == NfcAdapter.ACTION_TECH_DISCOVERED
        ) {
            val tag: Tag? = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            if (tag == null) return

            val text = readNdefText(tag)
            Log.d("MODART_NFC", "Scan action=$action text=$text")

            if (!text.isNullOrBlank()) {
                MethodChannel(engine.dartExecutor.binaryMessenger, CHANNEL)
                    .invokeMethod("onNfcScan", text.trim())
            }
        }
    }

    private fun readNdefText(tag: Tag): String? {
        val ndef = Ndef.get(tag) ?: return null
        return try {
            ndef.connect()
            val message: NdefMessage = ndef.ndefMessage ?: return null
            val record = message.records.firstOrNull { r ->
                r.tnf == NdefRecord.TNF_WELL_KNOWN && r.type.contentEquals(NdefRecord.RTD_TEXT)
            } ?: return null

            parseTextRecord(record)
        } catch (e: Exception) {
            Log.e("MODART_NFC", "readNdefText error", e)
            null
        } finally {
            try { ndef.close() } catch (_: Exception) {}
        }
    }

    private fun parseTextRecord(record: NdefRecord): String? {
        val payload = record.payload ?: return null
        if (payload.isEmpty()) return null

        // payload[0] = status byte (lang length + encoding)
        val langLength = payload[0].toInt() and 0x3F
        val textBytes = payload.copyOfRange(1 + langLength, payload.size)
        return String(textBytes, Charset.forName("UTF-8"))
    }
}