PEX - Changelog
===============

## Version 0.2.0 (Beta)
- Add: PEX 0.5.0 support with bearer-token configuration and typed job status queries.
- Add: Per-print idempotency keys and asynchronous submission options.
- Update: Response types for normalized paper sizes, nullable defaults, jobs and replay results.
- Update: Preserve API error messages, codes and details in both exception modes.
- Update: Refresh development dependencies, including Vitest 4.1.12 and the Terser plugin 1.0.0.
- Update: Replace live printing tests with isolated HTTP contract and timeout tests.
- Update: Update authentication, printing, jobs and retry examples for PEX 0.5.0.
- Fix: Abort timed-out HTTP requests, including response-body reads; default deadline is 45 seconds, with a configurable maximum of 20 minutes.
- Fix: Send File/Blob payloads as binary uploads and preserve numeric/JSON-looking text lines.

## Version 0.1.1 (Beta)
- Add: Support for PEX Line definitions (as introduced in PEX 0.4.1).
- Update: package.json dependencies.

## Version 0.1.0 (Beta)
- Initial Release
