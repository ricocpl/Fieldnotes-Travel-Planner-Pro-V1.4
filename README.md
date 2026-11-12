# Fieldnotes Travel Planner Pro V1.4 — Browser-Only

## Quick start (Windows Edge / Chrome)

1. Extract the complete ZIP.
2. Keep **index.html**, **app.js**, and **styles.css** in the same folder.
3. Double-click **index.html** to open in Edge or Chrome. **No Python, Node.js, terminal commands, or locally installed server** are required.
4. For Google Maps, choose **Map → Google Maps → API Setup**. The original **Interactive Map** remains the default and needs no Google API key.

The app is *browser-only*, not fully offline. MapLibre/OpenFreeMap map layers, geographic search, and Google Maps Embed require an internet connection. Browsers or networks may block some third-party resources.

## New in V1.4

The map pane now supports a choice of **Interactive Map (MapLibre + OpenFreeMap)** and **Google Maps (official Maps Embed API)**. This is a *viewer-only* Google mode and does not replace the editable map:

- **Interactive Map**: original search, draggable georeferenced custom pins, selectable and saved WGS84 rectangle areas, pin filters, zoom/pan, Map/calendar links. This is also the mode for adding or moving pins.
- **Google Maps**: `Destination` (trip destination or a default reference view), `Selected place` (a saved place's exact latitude/longitude), and `Directions` (between two different saved places). Standard zoom/pan is handled by the official Google iframe. **Open Maps** opens the current location or route on the Google Maps website.
- Selecting an activity with a linked saved place while Google mode is active updates the iframe location to that place. Activities with no linked place use the trip destination; existing user-entered Google Maps URLs remain independent.
- Clicking a saved map area while Google mode is active returns to **Interactive Map**, preserving the area drawing and fit-to-bounds workflow. Google Maps Embed cannot display the app's complete editable pin/area layers.
- A missing API key displays setup guidance and never blocks timetable data, print/export, or the original map.

All V1.3 colour overrides, Select / Move-Resize modes, 1–15-day timetable, editable Categories, Google Maps event links, three-pane layout, PNG/PDF print, and backup/restore are retained.

## Google Maps Embed API configuration

1. Create or select your [Google Cloud project](https://console.cloud.google.com/google/maps-apis).
2. Link a billing account and enable **Maps Embed API**.
3. Create a **separate Maps Embed API key** in Google Cloud Console > APIs & Services > Credentials.
4. Restrict **API restrictions** to **Maps Embed API only**. When deploying to an HTTPS site, also apply **Websites / HTTP referrer restrictions** to the authorised site origins, as recommended by Google.
5. In Fieldnotes, switch to **Google Maps**, choose **API Setup**, paste the key, and save. If the map fails, check key restrictions, enabled API, billing, browser console, connectivity, and embedded content restrictions.

Official references:
- https://developers.google.com/maps/documentation/embed/get-started
- https://developers.google.com/maps/documentation/embed/embedding-map
- https://developers.google.com/maps/documentation/embed/usage-and-billing
- https://developers.google.com/maps/api-security-best-practices

**Key and security notes**

- The key is passed in the iframe URL and is therefore **browser-visible**, not a private server secret. **Do not paste an unrestricted key.**
- Fieldnotes stores the key in this browser's localStorage when permitted; if denied, it is usable only for the current page session. The key is **not** included in JSON or ZIP trip backups, so you must configure it separately after restoring on another browser.
- **`file://` caveat:** Browsers may omit HTTP `Referer` for locally opened files, which can cause a **website-restricted** Maps key to fail. The safe/recommended path for dependable Google Maps viewing is to host these three static files on **HTTPS** (GitHub Pages or an approved internal static host). This still needs no Python or application server. Do not loosen key restrictions merely to make local files work.
- Maps Embed requests currently have no usage charge under Google's published pricing, **but require an API key and billing setup**. Other Google Cloud APIs can have charges if separately enabled/used.
- Google Maps Embed is cross-origin; Fieldnotes **cannot observe arbitrary clicks inside it, edit its pins or capture its tiles into timetable exports**. The existing MapLibre map is the editing tool; timetable PNG/PDF never includes map imagery.

## Backup & upgrade from V1.3

1. In V1.3: **Export / Backup → Full JSON Backup**.
2. Open V1.4 and choose **Restore Backup (⇧)**.
3. Confirm after exporting any existing V1.4 trip data you want to keep.
4. The V1.3 file is migrated without changing existing places, event IDs, coordinates, category IDs, map areas, or panel layout. `mapProvider` defaults to `openfree` for V1.3 files.
5. The appVersion is **1.4.0**. The JSON schema stays **3** because the new map preferences are backward-compatible optional fields.

`file://` browser storage is not guaranteed to persist across browser policies, folder moves, devices, or different URLs. **Use JSON backups regularly.** No cloud sync is provided.

For iOS Safari, HTTPS static hosting is recommended instead of opening a local HTML preview in Files.

## Known limitations and testing

- This release was tested with local Chromium using inline V1.4 HTML/CSS/JavaScript and a **mocked** Google iframe response. Official URL generation and UI workflows were verified; **a live Google Embed API key / actual map tile delivery were not verified**.
- Due to test-environment restrictions, persistence on a normal same-origin HTTPS site, local `file://` navigation, mobile touch, and live MapLibre rendering were not verifiable. See TEST_RESULTS_V1_4.md.
- Google Maps directions are rendered by the provider with `mode=driving` when two saved place coordinates are chosen; route conditions and travel time are Google's output, not a guarantee from Fieldnotes.
- This release did not implement Google Maps JS API, Google location search within the app, custom Google iframe pins, or map export. Such functionality is outside the supplied Maps Embed API scope.
