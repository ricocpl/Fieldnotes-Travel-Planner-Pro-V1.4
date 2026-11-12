# Fieldnotes Travel Planner Pro V1.1 — Test Results

## Executed

- PASS: `node --check app.js` — syntax validation.
- PASS: Chromium browser DOM smoke test with a **mock** MapLibre map object, without an internet connection.
- PASS: Creation of a trip on first load in the mocked browser test.
- PASS: Manual creation of a georeferenced pin (name, latitude, longitude).
- PASS: Selection-mode drag rectangle produces numeric WGS84 bounds via `unproject`.
- PASS: Naming and saving a new map area, displaying it in the Saved Map Areas panel.
- PASS: Full JSON export includes the named geographic area and its north/south/east/west bounds.
- PASS: No uncaught JavaScript exceptions during the executed browser smoke test.

## Not tested or not verified

- Live OpenFreeMap vector map loading or HTTP response behavior; isolated testing environment cannot load public map/CDN network resources.
- End-to-end `file://` navigation in the automated browser; the testing sandbox blocks direct file and loopback navigation. Tested browser code with a locally injected HTML/document instead. The user should verify direct file opening on Edge/Chrome.
- Persistent storage across browser restarts with a `file://` origin; the sandbox does not allow an end-to-end origin-persistent test.
- Nominatim search from `file://`; availability and CORS depend on browser/provider.
- Safari/iPhone launch and touch interaction; requires tests on physical devices.

## Recommended acceptance tests on a user machine

1. Unzip the folder and double-click `index.html` in Windows Edge or Chrome.
2. Confirm the map shows normal geographic imagery, **not** the OpenStreetMap HTTP 403 block screen.
3. Zoom and pan, search for a place or enter coordinates; save a place.
4. Select Map Area and draw a rectangle containing that place. Save and reopen the area. Verify the place appears in the area and retains coordinates after zooming.
5. Refresh/close/reopen the page: verify saved places and areas remain (or follow browser storage warnings).
6. Export JSON; import it and verify trip, areas, pins, and calendar events remain linked.
7. Verify Day/Week/Agenda, light/dark modes, and mobile tab switching.
