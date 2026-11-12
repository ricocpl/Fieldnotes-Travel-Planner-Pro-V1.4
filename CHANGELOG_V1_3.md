# V1.3 (Option B) — Changelog

**Application version:** `1.3.0`  
**Schema version:** `3` (up from `2` in V1.2)

## Scope

Only:
1. Per-activity colour inheritance / overrides.
2. Timetable Select Mode, plus existing Move / Resize Mode.
3. Timetable PNG export, PDF print workflow, and print preview.

The underlying map functions, map provider, pin coordinates, saved rectangles, Places Library behaviour and geolocation data structures are unchanged. Source-to-source comparison confirmed the V1.2 map implementation section was retained byte-for-byte.

## Activity changes

- Added `colourMode: 'category' | 'custom'` and `customColour: string | null`.
- Original V1.2 `color` remains available to support migration; V1.3 keeps it synchronized on save for compatibility.
- Added 16-colour palette, native picker, HEX field, reset control, preview and colour contrast logic.
- Timetable uses category/override colour; SVG PNG/PDF output uses the identical selected activity colour.
- No changes to category ID associations or Category Manager CRUD.

## Timetable changes

- Added persistent `trip.ui.timetableMode` with default `select`.
- In Select Mode, pointer dragging and resize interactions are disabled; single-click selects rather than automatically opening the editor.
- Added selection details bar with Edit, Duplicate, Colour, Delete and Deselect.
- Double-click/two quick clicks edits; keyboard Escape clears selection and Delete requests confirmation when not typing.
- Existing pointer-based drag/resize and snap settings remain active in Move / Resize Mode.
- Dedicated controls in timetable toolbar: Select, Move / Resize, Undo, Redo, PNG, PDF.

## Export implementation

- Added `trip.ui.exportSettings` to remember scope, date range, page format, orientation, density, optional fields.
- Uses browser-generated SVG as a common source for preview, raster PNG and the print-specific PDF workflow. No map screenshots or map tiles.
- PNG uses `<canvas>` and `toBlob()`; multi-page range is vertically stacked when practical, with ZIP/multi-part handling for very large outputs.
- PDF uses browser **Print / Save as PDF**. It does not pretend a binary PDF file was saved automatically.
- Pagination separates day columns according to page aspect ratio and density, supports overlapping events, notes pages and an auxiliary listing for events too short for readable grid labels.
- Print-only HTML excludes the application UI, map, edit controls and side panels.

## Migration and compatibility

- `normalize()` accepts schema versions `1`, `2`, and `3`.
- Schema 2 events with a valid legacy `color` migrate to `colourMode='custom'`, `customColour=<legacy color>`.
- Schema 1/2 events with no valid custom override migrate to `colourMode='category'`, `customColour=null`.
- Existing trip UI properties are merged with new V1.3 defaults; map preferences and stored location data are not rewritten.
- The existing JSON import/export and ZIP backup controls remain.

## Known limitations

- On-screen print preview shows the first 15 pages for very long ranges; output includes every generated page up to the 366-day export limit.
- Browser print requires popups and manual selection of **Save as PDF**.
- `file://` persistence, full device/browser interoperability, and live network map provider were not verified in isolated tests; backups remain recommended.
- Multiple-part PNG ZIP requires JSZip network availability; otherwise browsers may prompt for multiple PNG downloads.
- Map Area Selection is unchanged, including its existing geographic limits.
