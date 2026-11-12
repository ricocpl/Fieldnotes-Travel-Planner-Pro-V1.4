# Fieldnotes Travel Planner Pro — V1.2 Changelog

## New and updated features

1. **Custom timetable start:** `trip.ui.startDate`, editable in Week view; no Monday/Sunday restriction. Previous/Next shift by selected visible days, Today resets to the current date.
2. **Custom number of days:** integer 1–15, aligned date columns, horizontal scrolling, sticky left time axis and date headers.
3. **Pointer-based activity dragging:** move between days/times, top/bottom edge resize, configurable snap (5/10/15/30/60 min), preview with date/time, Escape cancellation, single undoable mutation on drop, overlap warnings; activity editor remains the mobile alternative.
4. **Google Maps Link per activity:** optional validated HTTPS URL, opens separately and preserves geographic place ID and WGS84 coordinates.
5. **Trip-specific activity categories:** stable IDs, custom names, colours, icons, order, defaults, and reassignment on deletion. Updated colours propagate unless individual activity has a colour override. Places Library categories are unchanged.
6. **Three-pane workspace:** Places Library (default 20%), Timetable (45%), Map (35%); separate drag dividers, accessible keyboard resizing, Show/Hide and Reset Layout, per-trip saving; mobile Places tab added.

## Data model and compatibility

- `appVersion`: `1.2.0`.
- `schemaVersion`: `2`; migration accepts `schemaVersion=1` V1.0/V1.1 backups.
- New `state.categories` array with stable `id`, `tripId`, `name`, `color`, `icon`, and `order`.
- New `event.categoryId` and optional `event.googleMapsUrl`; legacy `event.category` name retained for compatibility.
- New per-trip `ui` record: `startDate`, `visibleDays`, `snapMinutes`, `layout` and `showPlaces/showMap`.
- On migration, previously stored trips, areas, events, places, timezone strings, notes, and place links are retained; categories are matched by old activity name, creating a custom category for any unknown legacy label.
- Browser IndexedDB database and state store names remain unchanged. Backups from newer schema versions are rejected rather than guessed at.
- All pre-existing map pin/area features and export workflow remain in the original code; V1.2 is a targeted upgrade, not a rebuild.

## Test status

See `TEST_RESULTS.md` for tests actually run, limitations, and unverified cases.
