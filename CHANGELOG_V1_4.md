# Changelog — Fieldnotes Travel Planner Pro V1.4 (Option A)

**Upgrade baseline:** V1.3 Option B, not a rebuild from V1.2. The user-provided original Option A specification was labelled V1.3 but explicitly designated **V1.4** for this upgrade.

## Added

- Provider picker in Map panel: **Interactive Map** (existing MapLibre/OpenFreeMap) vs **Google Maps** (optional Maps Embed API iframe).
- Google **Destination**, **Selected place**, and **Directions** display modes, with separate origin and destination selectors based on saved WGS84 coordinates.
- **Open Maps** external navigation link for the selected location/route even if the embed key is missing.
- Google API key settings modal with key-format validation, saved-key removal, local `file://` HTTP referrer warning, and Google Cloud setup documentation.
- Stored non-secret Google map UI preferences per trip: `mapProvider`, `googleMapView`, `googlePlaceId`, `googleOriginId`, and `googleDestinationId`.
- Optional per-browser API key in localStorage; explicitly excluded from trip JSON/ZIP backups.
- When Google mode is active, selecting a linked event or focusing a saved place updates the embedded map. Opening a saved area returns to the existing editable MapLibre mode.
- Map unavailable / missing-key fallbacks; original editable map remains available without a Google key.

## Preserved

- Existing MapLibre implementation, OpenFreeMap style, geographic coordinate storage, pin drag/edit/search, saved geographic areas, map filters, day linking and area polygon source.
- V1.3 Activity Colour Override, timetable Select / Move/Resize, PNG and PDF/Print exports.
- V1.2 1–15 day timetable, date controls, categories and resizable/hideable panels.
- Existing backup, restore, trip, place and event IDs, relationships and notes.

## Version & migration

- `appVersion`: `1.4.0`.
- `schemaVersion`: **3**, unchanged. Backups with supported schemas 1, 2, and 3 are still accepted. Optional new UI preferences default to `openfree` when absent.
- No Google API key or map tile is written to a backup.

## Deliberate limitations

- Google Embed is a display-only iframe, not a full drawing or marker editor.
- Cannot verify an iframe's successful Google API authentication from parent JavaScript due cross-origin limits; troubleshoot with Google Cloud and browser console.
- `file://` website-referrer-restricted keys may fail. HTTPS hosting is recommended for Google's embed mode.
- Timetable exports continue to omit all map imagery.
