# Fieldnotes Travel Planner Pro V1.1 — Browser Only

**No Python. No Node.js. No terminal. No account. No installed local server.**

## Start in Edge or Chrome (Windows)

1. Unzip the full `Fieldnotes_Travel_Planner_Pro_V1_1_Browser_Only.zip` file.
2. Keep `index.html`, `styles.css` and `app.js` in the same extracted folder.
3. **Double-click `index.html`**. The default web browser will open Fieldnotes Travel Planner Pro.
4. Connect to the internet to display the interactive map or search for places; the app remains local-first.
5. Before clearing browser data, moving the app to another folder/device or upgrading, choose **Export / Backup → Full JSON Backup**.

You do not need to run `start_windows.bat`, `python -m http.server`, npm, or a backend.

### Map error shown in V1.0 (HTTP 403)

The V1.0 map used `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, which displays a block notice in some contexts because OSM's volunteer-operated public tile service has its own usage policy. The app's saved latitude/longitude coordinates were *not* the cause.

**V1.1 replaces that raster tile service with:**

- **Map engine:** MapLibre GL JS 5.24.0 (loaded directly via the browser from the pinned CDN URL).
- **Map service:** OpenFreeMap / Liberty vector style (`https://tiles.openfreemap.org/styles/liberty`), which does not require an API key or registration for its public instance.
- **Attribution:** OpenStreetMap contributors and other map provider credits remain available in the map.

The map will require an internet connection and functional access to the CDN and OpenFreeMap domains. A map's inability to load does not delete stored places or itinerary data.

## Map Area Selection (real coordinates)

1. Pan and zoom the map.
2. Click **Select Map Area**.
3. Drag a rectangle; the app converts both corners from screen pixels to WGS84 geographic coordinates by using MapLibre's `map.unproject`.
4. Name the area and press **Save**.
5. The Saved Map Areas panel shows the area and the count of saved places within its geographic bounds.
6. Click an area to reopen it. `fitBounds` zooms to its original real coordinates. Use **Show all** to clear the filter.
7. Click **Add Pin** or **+ Place** to save locations. Drag markers in Navigate mode to reposition them; linked calendar event IDs stay intact.

Map areas are **not screenshots**, and save no underlying map images. Selecting a region does not mass-download or prefetch map data. Boxes that cross the international date line are not supported in this version.

## Storage and backups

- The primary local storage is **IndexedDB**. If IndexedDB is unavailable for this browser/file origin, the app attempts a **localStorage fallback**.
- Browser storage may be limited or unavailable for local (`file://`) HTML pages, private browsing, restrictive policies, or low device storage; inspect the save indicator at the top. Regular JSON backups are essential.
- The browser-native JSON backup contains trip records, places, itinerary events, saved map-area bounds, settings and stable IDs.
- **Restore from old V1.0 data:** Open V1.0 using the *same* address/origin that was used previously. Export **Full JSON Backup**. Then open V1.1 and use the **⇧ Restore Backup** button to import the `.json` file. This is particularly important when migrating from `http://localhost` to `file://`, because these are different browser storage origins.
- JSON backup works without additional libraries. ZIP backup requires fetching JSZip from a CDN when first used. Print and ICS exports are browser-native.
- **No cloud synchronisation.** Browser storage is specific to the device, browser profile and origin.

## iPhone and other mobile browsers

The interface is responsive and offers Map / Itinerary tabs, but **opening local HTML directly from iOS Files is not a reliable way to use a modern web app**. For iPhone, host the same static HTML, CSS and JS files through an HTTPS static host (e.g. GitHub Pages). Such hosting requires **no Python runtime or application backend**. The map still requires internet, and storage is browser-/origin-specific. Mobile map interaction should be tested on the target iPhone before relying on it.

## Full feature summary

- Multiple trips; create, edit, duplicate and archive.
- Day / Week / Agenda itinerary, event editing and drag-and-drop scheduling.
- Independent Places Library with geographic coordinates, notes and scheduling links.
- Saved geospatial rectangles with automatic bounds fitting and area filtering.
- Day-based pin highlighting/filtering, manual pin creation, and optional place search (submitted manually via Nominatim).
- Browser IndexedDB/localStorage, JSON/ZIP import and export, ICS, print-to-PDF, undo/redo, themes, resizable panels.

## Limitations and policy notes

- V1.1 does not include real-time routing, travel time estimates, paid API geocoding, offline map tiles, or cloud sharing.
- OpenFreeMap is provided by a third party and has no guarantee of continued availability; consider a dedicated provider if publishing for high-volume or commercial use.
- Public Nominatim limits usage and may reject browser `file://`/opaque-origin requests in some browsers. Use manually entered coordinates if search is unavailable, or deploy to HTTPS with a suitable geocoding provider for reliable shared usage. Do not implement disallowed autocomplete or bulk requests.
- Browser-origin storage and live vector map access from `file://` can differ by OS, browser security settings and local policy. The app itself has no backend requirement, but online map services still impose browser/network constraints.
- This release has been checked through JavaScript syntax validation and browser-interaction simulation with a stubbed map engine. It has **not** been end-to-end verified against the live OpenFreeMap service from this isolated test environment. See `TEST_RESULTS.md`.

**Relevant services:**

- https://openfreemap.org/
- https://maplibre.org/maplibre-gl-js/docs/
- https://operations.osmfoundation.org/policies/tiles/
- https://operations.osmfoundation.org/policies/nominatim/
