# Fieldnotes Travel Planner Pro V1.3 — Option B

**Direct browser launch on Windows. No Python, Node.js, installer, terminal command, or local server is required.**

## Quick start / 開啟方法

1. Download and **extract the entire ZIP** into a folder.
2. Keep `index.html`, `app.js`, and `styles.css` in **the same folder**.
3. Double-click `index.html` and open it with **Microsoft Edge or Chrome**.
4. Internet is necessary for the existing MapLibre/OpenFreeMap basemap and live place search; the V1.3 timetable editing and PNG rendering use browser APIs.

**重要：** 轉版本前，請先喺 V1.2 用 **Export / Backup → Full JSON Backup** 保存資料。然後喺 V1.3 用右上角 **⇧ Restore Backup** 還原。

Local `file://` storage may be denied or isolated by browsers, versions, device policies, or file paths. Watch the save indicator. Back up before switching folders, clearing browser data, using incognito mode, or moving to another device. The app does not provide cloud sync.

For iPhone/iPad Safari, use HTTPS static hosting for these three static files. Opening `index.html` from the iOS Files preview is not a reliably supported runtime. No server-side application or Python is needed, but a hosted origin is recommended for persistent storage and service loading.

## V1.3 Feature A — Activity colour override

Open an existing activity (select it and press **Edit**, or double-click) or add one with **+ Activity**. The Activity Editor now offers:

- **Use category colour** (default; inherits future category colour changes).
- **Custom override** with 16 selectable swatches, native colour picker, and a `#RRGGBB` hexadecimal input.
- Live preview, validation, and **Reset to Category Colour**.

A custom colour persists when activities are moved, resized, duplicated, backed up, or when their category colour changes. Events migrated from V1.2 with a valid legacy `color` value keep their custom colour. Existing events without a legacy override inherit their category's colour.

## V1.3 Feature B — Select and Move modes

Above the timetable, use:

- **Select** (default). Click/tap an activity to select and inspect it. The inline details bar offers Edit, Duplicate, Colour, Delete, and Deselect. Dragging in Select mode does not change dates or times. Click an empty time slot, press Escape, or use × to deselect. Double-click/tap twice to edit; Enter on a focused event opens the editor. Delete or Backspace when the activity is selected requests deletion confirmation. Input fields preserve their normal keyboard behaviour.
- **Move / Resize**. Drag activity bodies to shift start time/day, or drag their upper/lower handles to change duration. V1.2 snapping remains unchanged. Mobile users can always edit the date/time fields directly in the Activity Editor.

The last interaction mode is saved per trip. Data edits, undo/redo, map/calendar links and original activity metadata are preserved.

## V1.3 Feature C — Timetable PNG / PDF / Print

Use the **PNG** or **PDF** toolbar control to open the timetable export dialog, or access it through **Export / Backup → Timetable PNG / PDF / Print**.

Settings include:

- Scope: current visible timetable, chosen date range, or entire trip.
- Paper: A4, A3, Letter; portrait or landscape.
- Scale/density: Fit to Width, Fit to Page, or custom density percentage (60–160%). Adjusting density changes the number of day columns per sheet to keep them legible.
- Optional trip title, dates, category legend, activity notes appendix, and print date.
- Scrolling on-screen preview of the first 15 pages (if more, **all** pages are still included in export).

**Download PNG** generates an actual `.png` image using the same vector timetable as preview. Several timetable pages are stacked into one image, with multi-image ZIP (requires the existing JSZip CDN) for large ranges. If ZIP is unavailable, the browser attempts separate PNG-part downloads; it may ask permission to download multiple files. PNG/PDF never include the map or map tiles.

**Print / Save as PDF** opens a **dedicated, print-only browser tab** and launches the system print dialog. Choose **Save as PDF** as your destination to get a PDF. PDF saving is **not automatic**; the browser controls the final save. Page size, orientation, column pagination, event colours and overlaps follow the preview. The optional notes appendix includes full user-entered activity notes. Very short or unusually long-title activities also receive a supplementary detail list if their grid labels cannot fit readably.

The export operation does not alter your trip dates, timetable view, calendar event positions, map or panels.

## Browser and functionality notes

- All V1.2 timetable / category / workspace / Places Library / map functions are retained. **No V1.3 map engine or provider changes.**
- Printing must be allowed to open a new tab / popup. If blocked, enable pop-ups for the app page then try again.
- Some printers may need **Print backgrounds** enabled to preserve solid colour blocks, depending on the browser/print destination; print CSS requests exact colours.
- All generated dates/times are based on the trip's saved local date/time fields, without pretending to fetch live travel data.
- Maximum single export range: 366 days to avoid browser memory/performance overload. Large exports may require ZIP packaging or permission to download multiple images.
- Browser-only file launch and full persistence after reload were **not verified** under an unrestricted desktop browser environment here: the isolated test runner blocks `file://` navigation and cross-origin map networking. Direct UI, PDF and PNG logic were tested in an isolated browser page using the same JavaScript.
- No new external JavaScript libraries were added for PNG or PDF. Existing MapLibre CDN and optional JSZip for ZIP backups/paged PNGs remain as in V1.2.

Read `CHANGELOG_V1_3.md` and `TEST_RESULTS_V1_3.md` for exact changes, migration and validation.
