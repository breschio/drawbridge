# Drawbridge v2 Changelog

**Version bump:** 1.1.0 → **2.0.0**

## Architecture: Side Panel Migration

The biggest change is moving from an **injected in-page sidebar** (`moat.js` + `moat.css`) to Chrome's native **Side Panel API** (`chrome.sidePanel`). This is a fundamental UI architecture shift:

| | v1 (main) | v2 |
|---|---|---|
| **UI host** | `moat.js` injected into web pages (~3,900 lines) | `sidepanel/` — dedicated Chrome side panel (3 files) |
| **Styles** | `moat.css` (2,390 lines injected into pages) | `sidepanel.css` (629 lines, scoped) + `content.css` (169 lines, minimal page injection) |
| **Activation** | Extension icon → `toggleMoat` message → in-page sidebar | Extension icon → `chrome.sidePanel.open()` |
| **Communication** | Direct — JS runs in page context | Message relay via `background.js` (content script ↔ side panel) |

## Deleted Files (-6,319 lines)
- **`moat.js`** — entire in-page sidebar UI removed
- **`moat.css`** — all in-page sidebar styles removed

## New Files
- **`sidepanel/sidepanel.html`** — side panel markup with header, tabs (To Do / Doing / Done), tools dropdown, project connection UI
- **`sidepanel/sidepanel.js`** (~730 lines) — full side panel logic: task rendering, project connect/disconnect, thumbnail loading, theme toggle, retry-based content script communication
- **`sidepanel/sidepanel.css`** (~630 lines) — polished styles with light/dark theme support via CSS custom properties
- **`content.css`** (~170 lines) — lightweight styles for overlays, comment boxes, and drawing canvas injected into pages
- **`STYLEGUIDE.md`** — design system documentation (typography, colors, status colors)

## Modified Files

### `manifest.json`
- Added `sidePanel` permission
- Registered `sidepanel/sidepanel.html` as default side panel
- Removed `moat.js` and `moat.css` from content scripts
- Added `content.css` as the only injected stylesheet

### `background.js`
- Replaced `toggleMoat` messaging with `chrome.sidePanel.open()`
- Added message relay system: routes messages between content script and side panel (both directions)
- Handles ~10 message types: `ENTER_COMMENT_MODE`, `SETUP_PROJECT`, `DISCONNECT_PROJECT`, `LOAD_TASKS`, etc.

### `content_script.js` (+290 lines)
- Added `relayToSidePanel()` helper for background-mediated communication
- Added handlers for side panel messages: project setup/disconnect, task CRUD, annotation modes, screenshot management
- Added `loadTasksForSidePanel()`, `updateTaskStatusFromSidePanel()`, `deleteTaskFromSidePanel()`
- Added `getThumbnailDataUrl()` — reads screenshots from File System API, converts to data URLs for side panel display
- Added `getScreenshotCount()` and `clearScreenshots()` utilities
- Improved disconnect logic with `chrome.storage.local` flag to persist disconnect across reloads
- Removed `Cmd+Shift+F` toggle sidebar shortcut (no longer needed)
- Relays project connection and task update events to side panel

### Demo Site Updates
- Expanded pricing section from 1 card to 3 cards in a grid
- Replaced emoji icons with inline SVGs
- Fixed typos (Conact → Contact, intergration → integration, etc.)
- Removed typewriter animation and glow effects
- Cleaned up "flashing" class usage from buttons

## Key Architectural Decisions
1. **Content script keeps file system access** — all File System API operations stay in the content script since side panels can't directly access page-scoped handles
2. **Background script as message bus** — all communication between side panel and content script is relayed through background.js
3. **Thumbnail data URLs** — screenshots are read from disk and sent as base64 data URLs to the side panel (since it can't access the file handles directly)
4. **Disconnect persistence** — uses `chrome.storage.local` flags per-origin so disconnects survive page reloads
