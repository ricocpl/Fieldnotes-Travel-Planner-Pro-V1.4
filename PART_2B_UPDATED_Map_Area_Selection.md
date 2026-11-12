# PART 2B — FIELDNOTES TRAVEL PLANNER PRO
## Recommended Best-Practice Travel Planning Application

### A. Application Information

**Application Name:** Fieldnotes Travel Planner Pro

**Application Type:** New Web-Based Application

**Initial Version:** V1.0

**Primary Objective:**

Develop a professional, interactive travel itinerary planning application that seamlessly integrates a calendar-based itinerary with an interactive geographic map.

The application should allow users to discover and save places, organise them into daily schedules, visualise travel locations, and manage the complete trip within one connected workspace.

The core user experience should be:

**Create Trip → Add Places → Organise Schedule → View Map → Refine Itinerary → Save / Export.**

**Primary Users:** Individuals, couples, and small groups planning personal holidays.

**Primary Platform:** Desktop browser.

**Secondary Platform:** Mobile and tablet browsers.

**Storage Preference:** Local-first with online map services.

**Design Philosophy:** Simple enough for everyday travel planning, while providing advanced controls when necessary.

---

### B. Recommended Application Concept

#### B1. Overall Concept

Create a split-screen Travel Planning Workspace combining:

**Left Side — Smart Itinerary Planner**

A flexible schedule supporting:

- Day View.
- Week View.
- List / Agenda View.
- Drag-and-drop scheduling.
- Unscheduled Places.
- Event and activity editing.

**Right Side — Interactive Map**

A real interactive map supporting:

- Place Search.
- Custom Location Pins.
- Map Zoom / Pan.
- Location Editing.
- Day-Based Pin Colours.
- Linked Schedule Selection.
- Optional Route Visualisation.
- Select Map Area (drag rectangle, save coordinates, and reopen named regions).

Unlike the screenshot-based concept, all geographic pins should be stored using real latitude and longitude coordinates.

Pins must remain geographically accurate when the map is moved, resized, or zoomed.

#### B2. Primary User Workflow

**Step 1 — Create Trip**

User enters the destination, travel dates, and trip time zone.

**Step 2 — Explore Map**

User searches for destinations or browses the map.

**Step 3 — Save Interesting Places**

User adds location pins to an Unscheduled Places collection.

**Step 4 — Build the Itinerary**

User drags saved places into the calendar and assigns dates and times.

**Step 5 — Review the Map**

The map displays the selected day's places with appropriate markers.

**Step 6 — Refine the Plan**

User changes the sequence, dates, durations, or locations.

**Step 7 — Save and Export**

User saves the complete trip and optionally exports an itinerary for travel use.

---

### C. Functional Requirements

#### C1. Trip Management

**Priority: P0 — Mandatory**

Allow users to create multiple independent trips.

Each trip should include:

- Unique Trip ID.
- Trip Name.
- Country / Destination.
- Start Date.
- End Date.
- Trip Time Zone.
- Optional Travellers.
- Description / Notes.
- Creation Date.
- Last Modified Date.

Support:

- Create.
- Edit.
- Duplicate.
- Archive.
- Delete with confirmation.
- Open previously saved trips.

Each trip must contain its own places, schedules, notes, and map preferences.

#### C2. Interactive Geographic Map

**Priority: P0 — Mandatory**

Provide a live interactive map.

Preferred provider: Google Maps JavaScript API.

Use an alternative licensed mapping solution if it offers a more suitable implementation or cost model.

Required functions:

- Pan Map.
- Zoom In / Out.
- Search for Locations.
- Select a Map Location.
- Add Location Pin.
- Drag and Reposition Custom Pin.
- Remove Custom Pin.
- Fit Map to Selected Places.
- Centre Map on Selected Place.
- Display Selected Day's Locations.
- Show All Trip Locations.
- Save the user's map view preferences.

Use geographic coordinates for every map location.

Example data model:

`latitude: number`

`longitude: number`

A user's saved pin should remain attached to the correct geographic location regardless of browser window size or map zoom.

Do not use absolute screen coordinates as the primary geographic data model.

#### C2A. Geographic Map Area Selection and Saved Areas

**Priority: P0 — Mandatory for V1.0**

Add a clearly labelled **Select Map Area** tool to the interactive geographic map. This is a geographic bounding-box selection feature, **not a screenshot cropping workflow**.

**Core interaction:**

1. The user pans and zooms the live map to a preferred view.
2. The user activates Select Map Area. The interface switches from map navigation to area selection mode, with an explicit cursor and visual state.
3. Using click-and-drag on desktop, or an appropriate touch drag/gesture on mobile, the user draws a rectangular selection over the map.
4. Show a live, semi-transparent rectangle and visible selection border during drawing.
5. Convert both opposite corners from viewport/container pixels to real geographic coordinates using currently supported map projection/events APIs.
6. Validate and calculate the geographic bounds: **north, south, east, west**. Save these values as numbers using WGS84 latitude/longitude; do not save pixels, screenshot-relative coordinates, or only the current zoom level.
7. Prompt the user to enter a descriptive area name (e.g., "Central Kyoto", "Rome Historic Centre").
8. On confirmation, save the area to the active trip. On cancellation or Escape, discard the draft selection without creating an area.
9. List all saved areas in a **Saved Map Areas** panel, with area names and dynamic saved-pin counts.
10. Clicking a saved area must restore its geographic rectangle and **automatically fit the map viewport to its bounds**, regardless of the current screen size or zoom level.
11. Show every saved trip location pin whose actual latitude/longitude lies inside the bounds. The place list and map markers must stay linked to the original Place IDs and schedule events.
12. Allow the user to rename, delete, and switch between saved areas. Deleting an area must **never** delete underlying pins, scheduled activities, or trip information.
13. Provide **Show All / Clear Area Filter** to return to the full-trip map.

**Data model — SavedMapArea**

- `id`: stable unique ID.
- `tripId`: owning trip ID.
- `name`: editable area name.
- `north`, `south`, `east`, `west`: numeric geographic bounds (EPSG:4326 / WGS84).
- `createdAt`, `updatedAt`: versioned timestamps where appropriate.
- Optional `notes`, `colour`, and last selected view metadata.

Area membership must be **calculated from current pin coordinates**, not stored as an immutable set of pin copies. Moving a place into or out of a selected area must update the displayed area pin count and matching places without breaking links.

**Interaction rules:**

- Provide mutually exclusive modes: Navigate Map, Add Pin, Select Map Area.
- Do not accidentally create a pin while the user is drawing a rectangle.
- Do not pan the map while actively selecting an area; restore normal pan/zoom after selection or cancellation.
- Retain an adjustable view through normal map zooming/panning before area selection.
- Handle small/invalid selections, coordinate bounds, and relevant edge cases (including regions crossing the antimeridian) explicitly; do not silently save invalid geometry.
- Display saved area boundaries using supported rectangular geographic overlays.
- Provide keyboard cancellation, sensible touch controls, and accessible list-based alternatives to map-only navigation.
- Ensure map areas, names, bounds, selected-area state, and links survive autosave, restart, backup, import and restore.

**Supported mapping implementation:**

Use actively supported APIs such as **MapLibre GL JS events, `map.unproject`, GeoJSON polygon layers and `map.fitBounds`**, or equivalent supported mapping APIs with custom pointer drawing. Do **not** depend on Google's discontinued Drawing Library / `DrawingManager`. Use provider-compliant map overlays or a maintained library if needed.

**Future enhancement — optional, not V1.0:**

Export an annotated static image of the selected map area with pinned locations and labels only if the chosen mapping provider explicitly permits the specific capture, rendering, attribution and export workflow. The V1.0 save-area feature must **not** download, scrape, cache or export map tiles for offline use.

#### C3. Place Search

**Priority: P0 — Mandatory**

Allow users to search for locations by:

- Place Name.
- Address.
- City.
- Coordinates.

Use a supported geographic search / autocomplete provider.

When a result is selected:

1. Centre the map.
2. Display the selected place.
3. Allow the user to add it to the trip.
4. Save supported location information.

Where available and permitted, record:

- Place Name.
- Address.
- Latitude / Longitude.
- Provider Place ID.
- Place Category.
- Source Information.

Do not assume all returned place fields can be stored permanently.

Respect the selected provider's data retention and attribution requirements.

Allow users to manually create places through map clicks and coordinate entry.

#### C4. Personal Places Library

**Priority: P0 — Mandatory**

Each trip should have a dedicated Places Library.

This is the collection of locations that the user is considering visiting.

Each place should support:

| Field | Description |
|---|---|
| Place ID | Stable unique ID |
| Name | Editable |
| Address | Optional |
| Latitude | Geographic coordinate |
| Longitude | Geographic coordinate |
| Category | Sightseeing / Dining / Hotel / Other |
| Notes | Editable |
| Favourite | Yes / No |
| Status | Unscheduled / Scheduled / Visited / Skipped |
| Colour | Optional |
| Linked Events | Zero or more schedule events |
| Source | Manual / Map Provider |

Allow users to:

- Add Places.
- Edit Places.
- Remove Places.
- Search Places.
- Filter by Category.
- Mark Favourites.
- Display on Map.
- Add to Schedule.
- Move Back to Unscheduled.

Keep places separate from calendar events.

A single place may be visited multiple times during the same trip.

Removing one scheduled visit must not automatically delete the underlying saved place.

#### C5. Unscheduled Places Panel

**Priority: P0 — Mandatory**

Provide a dedicated Unscheduled Places area.

This should work like a planning backlog.

Users can collect interesting destinations without immediately deciding when to visit.

Each unscheduled item should display:

- Place Name.
- Category.
- Optional Notes.
- Quick Add to Calendar.
- Show on Map.

Users should be able to:

1. Search for a place.
2. Save it to Unscheduled Places.
3. Drag it into a calendar date or time slot.
4. Create a schedule event linked to the selected place.
5. Move an event back into an unscheduled state if no longer planned.

Unscheduled places should remain visible on the map when the user chooses to display all locations.

#### C6. Calendar & Itinerary Views

**Priority: P0 — Mandatory**

Provide three complementary itinerary views.

**Day View**

Optimised for detailed daily travel planning.

Display:

- Time axis.
- Scheduled Activities.
- Start / End Times.
- Duration.
- Category Colour.
- Location.
- Optional Travel / Buffer Entries.

Allow drag-and-drop scheduling and vertical event resizing.

**Week View**

Inspired by Microsoft Outlook Calendar.

Display:

- Seven-day grid.
- Time slots.
- Colour-coded events.
- Overlapping schedules.
- Previous / Next Week.

Allow clicking a time slot to create a new event.

**Agenda / List View**

Display activities in chronological order for each day.

Each activity should show:

- Time.
- Place Name.
- Category.
- Address where available.
- Notes.
- Edit / Delete actions.

Provide quick reordering and direct access to the linked map location.

The app should remember the user's preferred view.

#### C7. Schedule Event Management

**Priority: P0 — Mandatory**

Each schedule event should support:

- Event ID.
- Trip ID.
- Date.
- Title.
- Start Time.
- End Time.
- Calculated Duration.
- Category.
- Optional Linked Place ID.
- Description.
- Notes.
- Colour.
- Status.
- Optional Booking Reference.
- Optional Estimated Cost.
- Last Modified Date.

Actions:

- Add.
- Edit.
- Duplicate.
- Delete.
- Drag to Another Time.
- Move to Another Day.
- Change Duration.
- Reorder.
- Link / Unlink Place.
- Copy to Another Day.

Support overnight events such as flights, trains, or hotel check-ins.

Events without geographic locations must be allowed.

Store event times with explicit time-zone information.

Display the schedule in the destination's local time zone by default.

Handle daylight saving changes correctly.

#### C8. Two-Way Map and Calendar Synchronisation

**Priority: P0 — Mandatory**

This is the application's most important interaction.

**Schedule to Map**

When the user selects a calendar event:

1. Identify its linked place.
2. Highlight the corresponding map pin.
3. Pan the map to the location if necessary.
4. Open a compact location information card.
5. Keep the schedule selection visible.

**Map to Schedule**

When the user clicks a location pin:

1. Display the place details.
2. Show its scheduled visits.
3. Allow the user to open the relevant event.
4. Switch the itinerary to the correct date if requested.
5. Highlight the corresponding event.

**Map to New Event**

Allow users to:

1. Click a map location.
2. Save it as a place.
3. Select Add to Itinerary.
4. Choose Date, Start Time, and Duration.
5. Confirm.
6. Immediately display the new event in the calendar.

**Calendar to New Location**

Allow users to:

1. Create an itinerary event.
2. Select Add Location.
3. Search or select a point on the map.
4. Save the linked place.
5. Return to the calendar.

All relationships must use stable IDs.

Changing an event title should not accidentally rename the underlying geographic place.

#### C9. Map Pin Visualisation

**Priority: P0 — Mandatory**

Use clear, customisable markers.

Users should be able to:

- View all saved places.
- View places for one selected day.
- Highlight the currently selected activity.
- Distinguish scheduled and unscheduled places.
- Filter pins by category.
- Show / Hide labels.

**Recommended Marker System**

- Colour by travel day.
- Selected pin visually emphasised.
- Unscheduled places shown in a neutral style.
- Optional visit-order number for the selected day.

When visit-order numbers are used, update them when the event sequence changes.

Maintain accessible map alternatives through the linked itinerary list.

Avoid clutter when many pins are close together.

Where practical, group or cluster nearby markers.

#### C10. Day-Based Map Filtering

**Priority: P0 — Mandatory**

Provide map filters:

- All Days.
- Day 1.
- Day 2.
- Day 3.
- Unscheduled Places.
- Selected Category.

When the user selects a date in the calendar, the map should optionally filter to that day's locations.

Allow an All Places option to restore the full trip view.

Keep filter state synchronised without unexpectedly deleting pins.

#### C11. Route Planning

**Priority: P1 — Important**

Support optional route visualisation between scheduled places.

Requirements:

- Use the selected day's itinerary order.
- Display route segments where a routing service is available.
- Allow users to choose travel mode where supported.
- Provide an Open in Google Maps action for directions.
- Distinguish scheduled visits from route waypoints.

Potential travel modes:

- Walking.
- Driving.
- Public Transport.
- Cycling.

Use a supported routing provider for any in-app route generation.

Do not draw arbitrary straight lines and present them as real road or transit routes.

When routing is unavailable, provide external navigation links.

Travel routes must not be automatically treated as fixed or guaranteed.

#### C12. Travel Time & Schedule Feasibility

**Priority: P1 — Important**

Where a supported routing provider is available:

- Estimate travel durations between consecutive places.
- Consider selected travel mode.
- Display estimated arrival times.
- Identify potentially unrealistic scheduling gaps.
- Warn about overlaps between planned events.
- Allow manual travel buffers.

Example:

- Museum: 10:00–12:00.
- Lunch: 12:15–13:15.
- Next attraction: 14:00–15:30.

If estimated travel time conflicts with the planned schedule, show a warning.

Do not silently adjust event times without user permission.

If no travel-time API is available, allow manually entered travel durations.

Do not fabricate live or historical travel times.

#### C13. Activity Duration & Practical Planning

**Priority: P1 — Important**

Allow users to specify:

- Estimated Visit Duration.
- Start / End Times.
- Travel Buffer.
- Optional Opening Hours Notes.
- Optional Reservation Time.
- Optional Ticket or Booking Reference.

Do not automatically claim that a venue is open or available without obtaining reliable provider data.

User-entered booking information must be clearly distinguished from provider-confirmed information.

#### C14. Notes & Attachments

**Priority: P1 — Important**

Allow trip, place, and event notes.

Support basic structured text and useful links.

Optional local attachments:

- Booking confirmation files.
- Photos.
- Tickets.
- Reference documents.

Store attachments separately from the event metadata and maintain stable links.

Include permitted local attachments in complete trip backups.

#### C15. Search & Filters

**Priority: P1 — Important**

Support search across:

- Trip Names.
- Place Names.
- Event Titles.
- Categories.
- Addresses.
- Personal Notes.

Provide filters for:

- Date.
- Category.
- Scheduled / Unscheduled.
- Favourite.
- Event Status.

Search results should open the corresponding event or map location directly.

#### C16. Export & Sharing

**Priority: P1 — Important**

Provide:

- Print-Friendly Itinerary.
- PDF Itinerary Export.
- Calendar ICS Export.
- JSON Data Export.
- Full ZIP Backup / Restore.

PDF exports should include:

- Trip Name.
- Dates.
- Daily Schedule.
- Activities.
- Locations.
- Notes.

Do not assume Google Maps imagery can be embedded in exported PDFs.

Include map images only where licensing and the chosen provider permit the intended export.

Otherwise, provide location names, coordinates, and navigation links.

ICS export should preserve event times and time-zone information, using stable event identifiers.

---

### D. UI/UX Design Requirements

#### D1. Desktop Workspace

Use a professional split-screen interface.

**Left Panel — Itinerary Planner**

Default width approximately 45%.

Content:

- Day / Week / Agenda Selector.
- Calendar Toolbar.
- Schedule.
- Unscheduled Places drawer.
- Event editing interface.

**Right Panel — Interactive Map**

Default width approximately 55%.

Content:

- Map Search.
- Interactive Map.
- Location Pins.
- Day Filter.
- Selected Location Popup.
- Route Controls where enabled.

Both panels should be resizable and collapsible.

#### D2. Top Application Bar

Include:

- Trip Selector.
- Trip Date Range.
- Selected Day.
- View Switcher.
- Undo / Redo.
- Save Status.
- Export.
- Theme Toggle.
- Settings.

#### D3. Unscheduled Places Drawer

Provide a collapsible drawer on the left.

Display saved places as compact draggable cards.

Each card should support:

- Show on Map.
- Add to Schedule.
- Edit Notes.
- Remove from Collection.

The drawer should not permanently obstruct the calendar.

#### D4. Event Design

Calendar events should be easy to read.

Display:

- Start Time.
- Event Title.
- Optional Location.
- Category Colour.

Use compact information density without overcrowding.

Double-clicking or tapping an event should open the full editor.

#### D5. Map Interaction Modes

Provide clear and predictable modes:

- Navigate Map.
- Add Place.
- Select Place.
- Edit Location.
- Select Map Area — rectangular geographic bounds with a named saved-area list and fit-to-area action.

Users should never accidentally create a new pin while simply panning the map.

Allow cancelling place creation using Escape.

#### D6. Mobile Interface

On mobile:

- Prioritise Day / Agenda View.
- Provide separate Map and Itinerary tabs.
- Support touch interactions.
- Allow easy switching between an event and its map location.
- Provide accessible alternatives to drag-and-drop.
- Avoid tiny calendar cells and overcrowded toolbars.

#### D7. Appearance

Preferred style:

- Modern.
- Minimal.
- Professional.
- Microsoft Fluent-inspired.
- Clear typography.
- Consistent spacing.
- Light / Dark Modes.
- Colour-coded travel days.
- Accessible contrast and focus states.

#### D8. Interaction Feedback

Show clear feedback for:

- Adding a place.
- Saving an event.
- Moving an event.
- Linking a place.
- Removing a link.
- Importing data.
- Exporting a trip.
- Loading a map.
- Routing errors.
- Unsaved changes.

Use confirmations only when necessary to prevent destructive mistakes.

---

### E. Technical Requirements

#### E1. Recommended Technology Stack

Suggested:

- React + TypeScript.
- A maintained interactive calendar library.
- Google Maps JavaScript API or a suitable licensed alternative.
- Map marker and event synchronisation through shared application state.
- IndexedDB for local structured data.
- Local file storage for attachments where supported.
- Modular import / export services.

Do not use the discontinued Google Maps Drawing Library. For Select Map Area, implement custom supported pointer selection and geographic rectangles; convert drawn viewport corners into latitude/longitude bounds.

For rectangle or custom overlay interactions, use supported map shapes, map events, or actively maintained alternatives.

#### E2. Core Data Architecture

Use separate entities.

**Trip**

Stores trip-level settings.

**Place**

Stores user-created locations and coordinates.

**ScheduleEvent**

Stores calendar activities and optional Place ID.

**TripDay**

Represents a trip date and relevant view preferences.

**Attachment**

Stores local files linked to trips, places, or events.

**SavedMapArea**

Stores named rectangles, numeric geographic bounds, and the owning trip ID. Calculates matching pins dynamically using their live coordinates.

**UserPreferences**

Stores theme, panel layout, calendar preferences, and optionally the selected saved-area ID.

Do not unnecessarily duplicate geographic place data across multiple events.

Relationships must remain valid when events are moved, duplicated, or deleted.

#### E3. Geographic Data Integrity

Every geographic place should have a stable unique ID.

Save validated latitude and longitude.

Keep custom user fields separate from provider-supplied fields.

Preserve user-created notes and schedule links independently of external mapping services.

Do not rely on map marker display objects as the only source of stored data.

#### E4. State Synchronisation

Use a single reliable application state model.

Changing the selected event must update the map selection.

Changing the selected place must update relevant itinerary details.

Avoid infinite event loops and unintended automatic changes.

Use stable IDs rather than matching items by text labels.

#### E5. Time Zone Handling

Store times using an appropriate time-zone-aware data model.

Important cases:

- Traveller's home time zone differs from destination time zone.
- Flights cross time zones.
- Daylight saving changes.
- Overnight events.
- Multi-city travel.

Display the destination-local calendar by default, while preserving event time-zone information.

Do not silently reinterpret scheduled local times when reopening the trip in another country.

#### E6. Data Persistence

Store:

- Trips.
- Places.
- Events.
- Relationships.
- Notes.
- Attachments.
- User Preferences.
- Saved map view settings.

Use persistent storage mechanisms appropriate for browser-based applications.

Do not rely solely on temporary memory or localStorage for the entire trip database.

#### E7. Backup & Compatibility

Provide full trip backup and restore.

Use versioned JSON data and ZIP archives for attachments.

Include:

- `appVersion`
- `schemaVersion`
- `exportedAt`
- Stable IDs.
- Relationships.
- Appropriate time-zone metadata.

Validate backup files before restoration.

Preserve backward compatibility where practical.

A complete data backup must not depend on downloading or retaining third-party map tiles.

#### E8. Maps API Cost & Security

Before implementation:

1. Verify the selected mapping provider's pricing.
2. Confirm required API credentials.
3. Identify paid features.
4. Configure appropriate API key restrictions.
5. Avoid unnecessary repeated API requests.
6. Apply usage quotas where available.
7. Respect data retention and attribution requirements.
8. Provide clear behaviour when the API is unavailable.

Prefer a small number of genuinely useful map services over numerous expensive optional integrations.

#### E9. Offline Behaviour

Allow users to view previously saved trip schedules and notes offline where feasible.

Do not promise offline Google Maps or other third-party map tiles unless an approved offline mapping solution is specifically implemented.

Show a useful fallback when map data is unavailable.

#### E10. Accessibility & Reliability

- Support keyboard navigation.
- Provide readable calendar event labels.
- Offer list-based alternatives to map-only interactions.
- Maintain usable touch targets.
- Test desktop and mobile.
- Prevent silent data loss.
- Handle network errors.
- Handle incomplete or invalid trip records.
- Test overlapping and overnight events.

---

### F. Development Roadmap

#### V1.0 — Core Interactive Travel Planner

**Mandatory Features:**

- Trip Management.
- Interactive Map.
- Geographic Place Pins.
- Select Map Area, named saved areas, fit-to-bounds, and in-area pin filtering.
- Place Search.
- Personal Places Library.
- Unscheduled Places.
- Day / Week / Agenda Views.
- Drag-and-Drop Scheduling.
- Two-Way Calendar / Map Linkage.
- Map Day Filters.
- Local Persistence.
- Backup & Restore.
- Responsive UI.

Focus on complete, reliable workflows.

#### V1.1 — Travel Practicality

- Route Links.
- Optional In-App Route Visualisation.
- Manual Travel Buffers.
- Conflict Warnings.
- Visit Duration Planning.
- Better PDF / ICS Export.

#### V2.0 — Advanced Planning

- Supported Route and Travel-Time APIs.
- Multi-City Trip Support.
- Smarter Day Organisation.
- Distance and Travel-Time Comparisons.
- Activity Reordering Suggestions.
- Enhanced Place Notes.

#### V3.0 — Optional AI Travel Assistant

Potential functions:

- Suggest suitable day-by-day plans.
- Identify overpacked days.
- Suggest more practical visit sequences.
- Provide travel-time-aware recommendations.
- Summarise itinerary plans.

AI-generated suggestions must be user-reviewed before applying changes.

Do not invent opening hours, transport timetables, travel durations, or reservation availability.

#### V4.0 — Optional Collaboration

- Shared Trip Planning.
- Multi-User Editing.
- Permissions.
- Synchronisation.
- Conflict Resolution.

These features are not required for the single-user MVP.

---

### G. Acceptance Criteria

#### Scenario 1 — Trip Creation

User creates a trip with start/end dates and destination time zone, closes the application, and can reopen the same trip with all data intact.

#### Scenario 2 — Save Places

User searches for or manually selects several locations on the map and saves them to the trip's Places Library.

#### Scenario 3 — Unscheduled Planning

User adds places to Unscheduled Places without assigning dates or times.

#### Scenario 4 — Drag into Schedule

User drags a saved place into the calendar, selects a duration, and creates a linked event.

#### Scenario 5 — Calendar to Map

User clicks a scheduled activity and the corresponding map pin is highlighted at the correct geographic location.

#### Scenario 6 — Map to Calendar

User selects a map pin and opens its associated calendar event.

#### Scenario 7 — Map Zoom & Pan

User zooms and pans the map.

All saved location markers remain geographically correct.

#### Scenario 8 — Rearrange the Itinerary

User moves an event to another date and confirms that its location relationship remains intact.

#### Scenario 9 — Multiple Visits

User schedules the same place twice on different days.

Both events remain linked to one saved place without duplication or broken relationships.

#### Scenario 10 — Local Data Recovery

User exports a complete backup and restores it in a clean application data store.

All trips, places, events, time zones, notes, and relationships are preserved.

#### Scenario 11 — Mobile Usage

User can view the daily itinerary, open place details, and switch to the map on a mobile device without requiring desktop-only interactions.

#### Scenario 13 — Geographic Map Area Selection

User zooms and pans the live map, selects a rectangular area, names and saves it, closes/reopens the trip, and selects the saved area. The map fits to the saved geographic bounds and displays all geographically contained saved pins without altering any pin coordinates or schedule relationships. Moving a pin across the boundary updates the in-area pin count; deleting the saved area does not delete the pin.

#### Scenario 12 — Mapping Service Failure

If the map API is unavailable, the user can still access saved trip schedules, notes, and locations without losing data.

---

### H. Final Development Instruction

Using Part 1 as the universal Web App design and development standard, build **Fieldnotes Travel Planner Pro V1.0**.

The application must deliver a genuinely functional integration between:

**Interactive Geographic Map + Personal Places Library + Unscheduled Places + Calendar Itinerary.**

Prioritise the following:

1. Accurate geographic pin locations and reliable, named geographic map-area selections.
2. Intuitive place discovery and saving.
3. Efficient drag-and-drop itinerary creation.
4. Reliable two-way calendar/map synchronisation.
5. Flexible Day, Week, and Agenda Views.
6. Professional desktop and mobile UI.
7. Persistent local data.
8. Reliable backups.
9. Security, licensing, and cost-conscious API integration.
10. A maintainable architecture suitable for future enhancements.

Avoid unnecessary complexity.

Build a reliable, functional core application before introducing advanced routing, collaboration, or AI features.

Do not replace real geographic coordinates with screenshot-relative positions.

Do not present mock travel times or simulated map functionality as real provider data.

Deliver working application code, clear setup instructions, tested core workflows, and an honest summary of any technical limitations.

---

## V1.1 Amendment — Browser-Only Launch and Mapping Provider

- The travel planner must run from `index.html` in a modern browser, without requiring Python, Node.js, local server installation, build command, sign-in or a database service. This version is intended primarily for Windows Edge/Chrome; hosted HTTPS is recommended for iPhone and cross-device use.
- Frontend is plain HTML, CSS and JavaScript; online MapLibre GL JS 5.24.0 is loaded from a pinned browser CDN URL, while OpenFreeMap provides the actual map style. **An internet connection is required to load the map engine and online map data.**
- The application must **not** directly request `tile.openstreetmap.org` raster tiles, due to service usage limits and observed HTTP 403 blocking.
- Retain real WGS84 latitude/longitude per place. Use `map.unproject` on the two corners of a drag rectangle to derive geographic bounds. Render saved rectangles from GeoJSON features and use map `fitBounds` when reopening.
- Browser IndexedDB is the primary local store; attempt localStorage as a fallback when IndexedDB is unavailable, with accurate saving-status messaging and explicit JSON backup/export. Browser file-origin storage is browser-dependent and not a substitute for regular backups.
- Preserve existing trip/event/place IDs, `schemaVersion: 1`, JSON backups and all calendar/place links. Old JSON backups must remain importable.
- Internet-dependent functionality must fail gracefully, leaving the local itinerary/places/area database usable. Do not claim offline map access, automatic cloud sync, or untested iOS file launch support.
- ZIP backup generation requires the separately loaded JSZip web library when not locally bundled; JSON exports remain browser-native.
