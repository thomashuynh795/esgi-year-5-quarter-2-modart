# API Crate

This crate exposes the Axum API for the NFC anti-counterfeit MVP.

Key points:

- two supported tag modes: `dynamic_cmac` and `one_time_tokens`
- admin-protected operations use `X-Admin-Key`
- anti-replay state is anchored in the database
- no clear secrets are logged by the application code

Operator documentation:

- [Architecture audit](/Users/user/esgi-year-5-quarter-2-modart/anti-counterfeit-api/docs/ARCHITECTURE_AUDIT.md)
- [How to test](/Users/user/esgi-year-5-quarter-2-modart/anti-counterfeit-api/docs/HOW_TO_TEST.md)
