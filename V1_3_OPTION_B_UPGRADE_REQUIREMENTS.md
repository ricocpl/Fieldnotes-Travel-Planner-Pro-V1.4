# FIELDNOTES TRAVEL PLANNER — V1.3 UPGRADE
## OPTION B — Activity, Timetable Selection & Export Only

### 1. Overall Objective

Upgrade the existing **Fieldnotes Travel Planner from V1.2 to V1.3**.

This version focuses exclusively on three improvements:

1. Activity Colour Override — Standard and Custom Colours.
2. Timetable Select Mode — Single-Click Selection.
3. PNG Export, PDF Export and Printing Mode.

**Important: No Map Function Upgrade is required in V1.3.**

The objective is to improve timetable editing and output capabilities while preserving all existing functionality.

### Mandatory Development Principles

- Preserve every working feature from V1.2.
- Modify only the relevant application components.
- Do not redesign unrelated user interfaces.
- Maintain existing saved trips, activities and categories.
- Maintain compatibility with previous backups.
- Do not introduce unnecessary services or dependencies.
- Implement complete and functional features.
- Test new functionality and potential regressions.

---

### 2. Activity — Colour Override

**Priority: P0 — Mandatory**

Allow users to override the default activity category colour.

#### 2.1 Colour Selection

Enhance the existing Add/Edit Activity dialog.

Add a colour selection section containing:

**Option A — Category Colour**

Use the existing category colour.

This should remain the default behaviour for all existing activities.

**Option B — Standard Colours**

Provide a standard colour palette containing approximately 12–16 commonly used colours.

Users should be able to click a colour swatch to select it.

**Option C — Custom Colour**

Provide a custom colour picker allowing:

- Visual colour selection.
- Manual HEX colour input.
- Live colour preview.
- Validation of colour values.

#### 2.2 Activity Colour Behaviour

Each activity must support:

- Inherited category colour.
- Explicit custom colour.

Provide a **Reset to Category Colour** action.

When an activity has a custom colour:

- Display that colour in the timetable.
- Preserve it when moving the activity.
- Preserve it when resizing the activity.
- Preserve it when changing categories.
- Preserve it when duplicating the activity.
- Preserve it after refreshing the application.

Changing a category colour must only update activities that inherit that category's colour.

Custom overrides must remain unaffected.

#### 2.3 Colour Display

Ensure the selected colour is consistently displayed in:

- Timetable event blocks.
- Activity Details.
- Activity Editor.
- PNG exports.
- PDF / Print output.

Maintain accessible text contrast.

Automatically use an appropriate foreground text colour where necessary.

#### 2.4 Data Structure

Suggested additional properties:

`colourMode: "category" | "custom"`

`customColour: string | null`

Use a safe migration so existing activities continue using their original category colours.

Do not alter the existing Category Manager unnecessarily.

---

### 3. Timetable — Select Mode

**Priority: P0 — Mandatory**

Add a dedicated **Select Mode** to the existing timetable.

The purpose is to let users simply click an activity to select it, without triggering unwanted movement or resizing.

#### 3.1 Interaction Modes

Provide two mutually exclusive modes.

**Mode A — Select**

Used to select and inspect activities.

**Mode B — Move / Resize**

Used to change activity positions and durations.

Add both buttons to the existing timetable toolbar.

Clearly highlight the active mode.

Select Mode should be the default unless the user's previous preference has been saved.

#### 3.2 Select Mode Behaviour

When Select Mode is active:

- Single-click an activity to select it.
- Display a selection border.
- Show the selected activity's details.
- Allow access to Edit, Duplicate, Delete and Colour actions.
- Click another activity to change selection.
- Click an empty area to deselect.
- Press Escape to clear selection.

**Critical Requirement:**

When Select Mode is active, clicking and dragging an activity must not move or resize it.

Do not automatically start dragging simply because the user holds down the mouse button.

The selected activity should remain in its original position.

#### 3.3 Selected Activity Visual Feedback

Display a clear selection state.

Suggested styling:

- Highlighted border.
- Subtle selection outline.
- Optional small action toolbar.
- Active Activity Details panel.

Selection indicators must remain visible in both Light and Dark Modes.

Do not make selection dependent only on changing the activity background colour, because the user may have selected a custom activity colour.

#### 3.4 Activity Editing

Users should be able to edit a selected activity through:

- Double-click.
- An Edit button.
- An appropriate context menu, if already supported.

Preserve the existing Activity Editor.

Do not create unnecessary duplicate editing interfaces.

#### 3.5 Move / Resize Mode

When Move / Resize Mode is active:

- Allow dragging activities to another time.
- Allow dragging activities to another date.
- Allow resizing to extend or shorten duration.
- Preserve existing snapping settings.
- Display updated time ranges during interaction.
- Save changes correctly.

Maintain all V1.2 dragging and resizing functionality.

#### 3.6 Keyboard & Touch Support

- Escape: Deselect / Cancel.
- Enter: Open selected Activity Details or Edit action as appropriate.
- Delete: Delete the selected activity with suitable protection.
- Touch: Tap to select.
- Mobile: Provide accessible alternative editing controls.

Avoid interfering with browser or text-editing keyboard shortcuts.

#### 3.7 Persistence

Save the user's preferred interaction mode where appropriate.

Switching between modes must not modify existing activities.

---

### 4. PNG Export, PDF Export & Printing Mode

**Priority: P0 — Mandatory**

Add professional timetable export and printing capabilities.

The primary purpose is to allow users to save, print or share their travel timetable in a readable format.

#### 4.1 Export Toolbar

Add two controls:

- PNG
- PDF

A separate Print action may be provided within the PDF / Print dialog.

Recommended toolbar order:

1. Select.
2. Move / Resize.
3. Undo.
4. Redo.
5. PNG.
6. PDF.
7. Existing Timetable Controls.

Maintain consistent button styles and icons.

#### 4.2 Export / Print Settings

Create a dedicated Export / Print dialog.

Provide:

**Content Scope**

- Current Visible Timetable.
- Custom Date Range.
- Entire Trip Timetable.

**Export Format**

- PNG.
- PDF.
- Browser Print.

**Page Size**

- A4.
- A3.
- Letter.

**Orientation**

- Portrait.
- Landscape.

**Scale**

- Fit to Width.
- Fit to Page.
- Custom Scale.

**Optional Content**

- Trip Title.
- Date Range.
- Category Legend.
- Activity Notes.
- Print Date.

Remember the user's last-used export preferences where appropriate.

#### 4.3 Print Preview

Before exporting, display a preview of the output.

The preview should reflect the selected:

- Date Range.
- Orientation.
- Paper Size.
- Scale.
- Optional Content.

Users must be able to:

- Review the preview.
- Change print settings.
- Confirm export.
- Cancel without modifying their timetable.

#### 4.4 PNG Export

Generate an actual PNG image containing the requested timetable.

Requirements:

- Export the selected timetable range.
- Include activity titles.
- Include start and end times.
- Preserve category colours.
- Preserve custom activity colours.
- Preserve correct event positions.
- Handle overlapping activities.
- Use readable resolution.
- Avoid clipped or missing content.

Do not export only the visible portion of a scrollable timetable when the user has requested the complete date range.

For large exports, use suitable image dimensions or an appropriate multi-file strategy, with clear user feedback.

#### 4.5 PDF Export

Generate a valid PDF document or provide a properly implemented browser Print to PDF workflow.

Requirements:

- Correct paper dimensions.
- Appropriate margins.
- Readable activity text.
- Accurate dates and times.
- Consistent colours.
- Clear page breaks.
- No clipped events.
- No unnecessary UI controls.

If a date range contains too many columns for a readable single page, split the timetable across multiple pages.

Do not compress 15 days into an unreadable A4 page.

#### 4.6 Multi-Day Timetable Support

The existing V1.2 timetable supports 1–15 visible days.

The export system must support this range.

Examples:

- 1-Day Timetable.
- 3-Day Timetable.
- 7-Day Timetable.
- 10-Day Timetable.
- 15-Day Timetable.

When using a custom date range, support export beyond the current visible timetable where practical, using readable pagination.

The printed dates and times must match the stored timetable data.

Exporting must not modify the user's existing timetable date-range preferences.

#### 4.7 Print Layout

Create a dedicated print-specific layout instead of simply printing the entire application interface.

Exclude:

- Main navigation sidebar.
- Map panel.
- Resizing handles.
- Editing toolbars.
- Selection borders.
- Popup controls.
- Unnecessary buttons.

Include the selected travel schedule and chosen optional information.

Use print-friendly CSS and proper page-break handling.

#### 4.8 Export Reliability

Handle:

- Empty timetables.
- Large date ranges.
- Overlapping activities.
- Custom colours.
- Long activity titles.
- Browser scaling.
- Different screen sizes.
- Font rendering.
- Image/PDF generation failures.

Do not claim export success unless a valid output has been generated or the browser's print workflow has been opened successfully.

---

### 5. No Map Function Upgrade

**Priority: P0 — Strict Scope Restriction**

Do not modify the existing Map functionality in V1.3.

Specifically:

- Do not introduce Google Maps Embed API.
- Do not introduce Google Maps JavaScript API.
- Do not modify existing map providers.
- Do not alter map marker behaviour.
- Do not change existing pin positions.
- Do not change saved coordinates.
- Do not redesign the Map panel.
- Do not change map zoom or pan behaviour.
- Do not change map navigation.
- Do not change existing Activity-to-Map relationships.
- Do not introduce new map storage structures.
- Do not change the existing Places Library functionality.

All existing map-related functionality must remain operational.

**Important:** Do not remove the Map panel.

The Map panel should continue behaving exactly as it did in V1.2.

The new PNG/PDF export feature should focus on the timetable and must not capture or modify map content.

---

### 6. Preserve Existing V1.2 Functionality

The following features must remain unchanged and fully operational.

#### Timetable

- Custom Week Start Date.
- Adjustable Visible Days (1–15).
- Previous / Next Navigation.
- Direct Activity Creation.
- Activity Dragging.
- Activity Resizing.
- Time Snapping.
- Timetable Scrolling.

#### Activities

- Add Activity.
- Edit Activity.
- Delete Activity.
- Category Selection.
- Google Maps Link.
- Duration Calculation.
- Linked Places.
- Existing Notes and Metadata.

#### Category Manager

- Create Category.
- Rename Category.
- Change Category Colour.
- Delete / Reassign Category.
- Preserve Category IDs.

#### Workspace

- Resizable Places Library panel.
- Resizable Timetable panel.
- Resizable Map panel.
- Show / Hide Places Library.
- Show / Hide Map.
- Timetable-only layout.
- Persistent panel preferences.

#### Data Management

- Trip Management.
- Local Storage.
- Backup / Restore.
- Existing Data Relationships.
- Existing Import / Export Functions.

---

### 7. Storage & Backward Compatibility

Add only the data fields necessary for V1.3.

Required new information:

- Activity Colour Mode.
- Activity Custom Colour.
- Preferred Timetable Interaction Mode.
- Export / Printing Preferences.

Maintain the existing application data model wherever practical.

Existing activities without custom colours must continue inheriting their category colour.

Do not overwrite or reset:

- Trip data.
- Activity dates.
- Activity durations.
- Categories.
- Places.
- Map pins.
- Panel layout settings.
- Google Maps links.

Provide safe migration from the previous data schema.

Update `appVersion` appropriately and increment `schemaVersion` only if the data format actually changes.

Maintain compatibility with supported V1.2 backup files.

---

### 8. UI/UX Requirements

Use the existing application design language.

#### Colour Picker

- Clearly display the selected colour.
- Provide predefined swatches.
- Provide a custom colour picker.
- Support HEX input.
- Provide Reset to Category Colour.

#### Select Mode

- Clear active-state button.
- Consistent selection border.
- No accidental dragging.
- Keyboard support.
- Touch support.

#### Export Interface

- Simple PNG / PDF controls.
- Professional preview.
- Clear print settings.
- Correct paper-size selection.
- Responsive modal layout.

#### General

- Preserve Light Mode and Dark Mode.
- Maintain accessible text contrast.
- Avoid overcrowded toolbars.
- Keep all existing panels resizable.
- Do not change unrelated application layouts.

---

### 9. Acceptance Criteria

#### Test 1 — Standard Colour

Select a predefined colour for an activity.

Expected: The colour is displayed correctly in the timetable.

#### Test 2 — Custom Colour

Enter a valid custom HEX colour.

Expected: The activity immediately uses the selected colour.

#### Test 3 — Category Colour Inheritance

Change a category colour.

Expected: Activities using inherited colours update, while overridden activities retain their own colours.

#### Test 4 — Select Activity

Activate Select Mode and single-click an activity.

Expected: The activity becomes selected without moving.

#### Test 5 — Selection Protection

Drag an activity while Select Mode is active.

Expected: Its date, time and duration remain unchanged.

#### Test 6 — Move / Resize

Switch to Move / Resize Mode.

Expected: Existing V1.2 drag and resize functionality operates normally.

#### Test 7 — PNG Export

Export a timetable containing multiple categories and custom activity colours.

Expected: A complete, readable PNG is produced.

#### Test 8 — PDF Export

Export a seven-day timetable to PDF.

Expected: The PDF shows correct dates, times, activity titles and colours.

#### Test 9 — Fifteen-Day Printing

Export a 15-day timetable.

Expected: All requested activities appear on readable pages without missing columns or clipped content.

#### Test 10 — Panel Visibility

Hide the Map and Places Library panels.

Expected: The timetable remains usable and its export works correctly.

#### Test 11 — Map Regression

Verify existing map, pins and Activity-to-Map connections.

Expected: All original functionality remains unchanged.

#### Test 12 — Data Persistence

Save activity colours and preferences, then refresh the browser.

Expected: All new settings and existing data remain intact.

#### Test 13 — Backup Compatibility

Restore a valid V1.2 backup.

Expected: Existing data loads correctly, and V1.3 defaults are applied safely.

---

### 10. Final Development Instruction

Upgrade the existing **Fieldnotes Travel Planner to V1.3 — Option B**.

Implement only:

1. Activity Colour Override, including standard and custom colours.
2. Timetable Select Mode, with single-click selection.
3. PNG Export, PDF Export and Printing Mode.

**Do not upgrade, replace or modify any Map functionality.**

Preserve all existing V1.2 features, saved trips, activities, places, pins and category data.

Ensure that all new functions are fully operational and thoroughly tested.

Provide:

- Updated application files.
- V1.3 changelog.
- Data migration details where applicable.
- Test results.
- Known limitations.

**Primary Principle:**

V1.3 should improve timetable usability and export functionality without introducing unrelated changes or breaking previously working features.