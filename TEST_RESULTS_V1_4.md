# V1.4 Validation Results — 12 November 2026

## Executed checks (restricted Chromium browser harness)

| Test | Result |
|---|---|
| Syntax verification with Node.js `--check` | PASS |
| App UI identifies itself as V1.4 | PASS |
| Old provider remains default | PASS (`openfree`) |
| Without key, Google mode shows clear fallback and leaves iframe hidden | PASS |
| Existing editable map and Select Map Area controls retained | PASS (DOM verified) |
| Maps Embed `view` URL built for default map centre | PASS (mocked Google response) |
| Maps Embed `place` URL built for trip destination | PASS (mocked Google response) |
| Maps Embed `place` URL built from saved lat/long | PASS (mocked Google response) |
| Maps Embed `directions` URL built from two saved places | PASS (mocked Google response) |
| External Google Maps search and directions URLs built | PASS |
| Select a calendar event with linked place → Google selected place mode | PASS |
| V1.3 activity colour override in timetable | PASS |
| JSON backup reports `appVersion=1.4.0`, `schemaVersion=3` | PASS |
| Full JSON backup excludes API key | PASS |
| Restore V1.4 backup and retain trip places/provider preferences | PASS |
| V1.3 backup missing Google UI fields defaults to editable map | PASS |
| Saved area reopen from Google switches to MapLibre mode | PASS |
| No uncaught JavaScript page errors during test | PASS |

## Not fully tested

- Actual Google Maps iframe with a real key and active Google Cloud billing: **NOT TESTED** (only official URL construction was exercised, iframe response was mocked).
- Real MapLibre/OpenFreeMap tile loading and live Nominatim search: **NOT TESTED** due blocked external resources.
- Local `file://` navigation, normal same-origin IndexedDB/localStorage durability and key persistence after browser restart: **NOT TESTED**; test runner blocks such navigation and treats inline documents as an opaque origin.
- iOS Safari touch, print to physical printer and all browser/platform combinations: **NOT TESTED**.
- Comprehensive V1.3 PNG/PDF export regression: **NOT RE-EXECUTED** in V1.4; original unchanged code retained.

Do not interpret a successful mocked iframe load as proof of actual Google API credentials, Google billing or production map operation.
