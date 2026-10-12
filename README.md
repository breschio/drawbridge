# Drawbridge

Visual annotations for AI coding assistants.

Drawbridge is a Chrome extension that lets you click on your running app, leave Figma-style comments, capture screenshots, and turn those notes into local task files your AI coding tools can act on.

It is built for browser-to-code feedback loops with Cursor, Claude Code, Codex, and Windsurf.

## What It Does

- Annotate visible UI elements directly in the browser.
- Draw freeform rectangles for layout, spacing, and visual bugs that are not tied to a single DOM node.
- Capture selector data, element context, bounding boxes, and screenshots with each note.
- Sync tasks into your project as readable markdown and structured JSON.
- Track task status through `to do`, `doing`, and `done`.
- Deploy the `/bridge` workflow for Claude Code, Codex, and Windsurf, plus Drawbridge workflow rules for AI agents.
- Recover cleanly after extension reloads: the toolbar icon can inject missing scripts into existing tabs and toggles the existing drawer instead of stacking duplicates.

## Setup

### 1. Install The Extension

1. Clone or download this repo.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select this folder: `drawbridge/chrome-extension/`.
6. Pin Drawbridge from Chrome's Extensions menu.

For local `file://` pages, open the Drawbridge extension details in Chrome and enable Allow access to file URLs.

![Drawbridge pinned in Chrome](https://github.com/user-attachments/assets/1732a588-5985-45b5-85b6-9a73c21d2b4b)

### 2. Connect Your Project

1. Open the app or page you want to annotate.
2. Click the Drawbridge toolbar icon.
3. Click Connect Project in the drawer.
4. Select the local project root for that app.
5. Approve Chrome's file access prompt.

Drawbridge creates and maintains files in your project so your AI tool can read the work queue.

### 3. Process The Queue

After adding annotations, open your project in Cursor, Claude Code, Codex, or Windsurf and run `/bridge` or `bridge`.

## Annotate

- Press `C`, or use Tools -> Comment, then click an element and leave a note.
- Press `R`, or use Tools -> Rectangle, then drag over an area and leave a note.
- Press `Esc` to exit an annotation mode.
- Click the Drawbridge toolbar icon to open or close the drawer.

Tasks appear in the drawer and sync to your connected project.

![Drawbridge comment annotation](https://github.com/breschio/drawbridge-media/blob/main/drawbridge-comment-2.gif?raw=true)

![Drawbridge rectangle annotation](https://github.com/breschio/drawbridge-media/raw/main/drawbridge-rectangle.gif)

## Drawer Layout

Drawbridge can dock to the bottom, left, or right side of the viewport from the More menu. Use the chevron button to collapse or expand the drawer.

When collapsed on the left or right side, Drawbridge becomes a slim rail with the project button, tools button, and color-coded task counts for `to do`, `doing`, and `done`. The chevron points in the direction the drawer will collapse or expand.

## Process Tasks

In an AI coding tool, run:

```text
/bridge
```

or:

```text
bridge
```

Supported modes:

- `step bridge`: process one task at a time with approval.
- `batch bridge`: group related tasks and process them together.
- `yolo bridge`: process all pending tasks autonomously.

![Drawbridge processing tasks](https://github.com/user-attachments/assets/da71b412-eee4-4cec-abe5-3b9719e297b2)

## Generated Files

Drawbridge writes these into the connected project:

- `.moat/moat-tasks.md`: human-readable task list.
- `.moat/moat-tasks-detail.json`: structured task data for AI processing.
- `.moat/screenshots/`: screenshots captured with annotations.
- `.moat/drawbridge-workflow.md`: agent workflow instructions.
- `.claude/commands/bridge.md`: Claude Code slash command.
- `.windsurf/workflows/bridge.md`: Windsurf workflow.
- `.codex/prompts/bridge.md`: Codex prompt.

Drawbridge also updates `.gitignore` for generated local workflow folders.

## Development

```bash
npm ci
npm test -- chrome-extension/background.test.js --runInBand
npm run build
```

The build output is written to `dist/drawbridge-v<version>.zip`.

## Troubleshooting

- If the icon does nothing after reloading the extension, click it once on the page again. Drawbridge now injects missing scripts into existing tabs.
- If the drawer looks stale, close and reopen it with the toolbar icon.
- If project files are missing, reconnect the project from the drawer.
- If an AI tool cannot find tasks, confirm the project contains `.moat/moat-tasks.md` and `.moat/moat-tasks-detail.json`.

## License

This project uses a custom license. See [LICENSE](LICENSE).

Free to use, copy, and modify for lawful purposes. Redistribution, sublicensing, selling, or offering as a commercial service are not permitted without a commercial license.

Commercial licensing: breschicreative@gmail.com
