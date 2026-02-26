# Drawbridge — Jobs to Be Done

## How to Use This File
- Each job has a unique ID (e.g., `JTBD-01`)
- Status: ✅ Passing | ❌ Failing | ⏳ Not Yet Tested | 🚫 Not Applicable to V2
- Jobs map 1:1 to test files
- Edit this file to add/remove/reprioritize jobs

## Jobs

### Connection & Project Setup
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-01 | User can connect to a project directory | `setupProject()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-02 | System creates `.moat/` subdirectory in selected project | `setupProject()` - `getDirectoryHandle('.moat')` | ⏳ Not Yet Tested |
| JTBD-03 | System creates `screenshots/` subdirectory proactively | `setupProject()` - creates screenshots dir | ⏳ Not Yet Tested |
| JTBD-04 | System deploys workflow templates to project | `deployRuleTemplates()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-05 | System persists connection to IndexedDB | `persistProjectConnection()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-06 | System restores connection from IndexedDB on page load | `restoreProjectConnection()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-07 | System verifies directory handle permissions | `verifyPermission()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-08 | System shows reconnection prompt when handle expires | Event: `moat:project-connection-expired` | ⏳ Not Yet Tested |
| JTBD-09 | System handles browser restart gracefully | Connection restoration flow | ⏳ Not Yet Tested |
| JTBD-10 | System updates .gitignore with `.moat/` pattern | `setupProject()` - gitignore update | ⏳ Not Yet Tested |
| JTBD-11 | System stores connection in localStorage as fallback | Legacy localStorage backup | ⏳ Not Yet Tested |
| JTBD-12 | System initializes TaskStore with directory handle | `initializeUtilities()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-13 | System loads existing tasks on connection | `loadTasksFromFile()` in taskStore.js | ⏳ Not Yet Tested |

### Task Creation & Annotation
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-14 | User can enter comment mode with keyboard shortcut | Press `F` key handler | ⏳ Not Yet Tested |
| JTBD-15 | System highlights element on hover in comment mode | `highlightElement()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-16 | User can click element to create annotation | Click handler → `createCommentBox()` | ⏳ Not Yet Tested |
| JTBD-17 | System shows comment input box near click | `createCommentBox()` positioning logic | ⏳ Not Yet Tested |
| JTBD-18 | User can type annotation text | Textarea input in comment box | ⏳ Not Yet Tested |
| JTBD-19 | User can submit annotation with Enter key | Keydown handler in comment box | ⏳ Not Yet Tested |
| JTBD-20 | User can cancel annotation with Escape | Escape key handler | ⏳ Not Yet Tested |
| JTBD-21 | System generates unique task ID | `generateUUID()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-22 | System generates element label from DOM | `getElementLabel()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-23 | System generates CSS selector for element | `getSelector()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-24 | System validates selector uniqueness | `validateSelector()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-25 | System captures element bounding rectangle | `getBoundingClientRect()` data capture | ⏳ Not Yet Tested |
| JTBD-26 | System captures click position within element | `clickPosition` calculation | ⏳ Not Yet Tested |
| JTBD-27 | System exits comment mode after submission | `exitCommentMode()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-28 | System prevents annotation of Moat UI elements | `composedPath()` check for moat elements | ⏳ Not Yet Tested |

### Screenshot Capture & Storage
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-29 | System captures screenshot with highlighted element | `captureScreenshotNative()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-30 | System requests screenshot from background script | Message to background: `CAPTURE_SCREENSHOT` | ⏳ Not Yet Tested |
| JTBD-31 | Background script captures visible tab | `chrome.tabs.captureVisibleTab()` in background.js | ⏳ Not Yet Tested |
| JTBD-32 | System crops screenshot to element region | Canvas crop in `captureScreenshotNative()` | ⏳ Not Yet Tested |
| JTBD-33 | System includes padding around element | 100px padding calculation | ⏳ Not Yet Tested |
| JTBD-34 | System handles device pixel ratio scaling | DPR scaling in screenshot capture | ⏳ Not Yet Tested |
| JTBD-35 | System converts screenshot to base64 PNG | `canvas.toDataURL('image/png')` | ⏳ Not Yet Tested |
| JTBD-36 | System saves screenshot to `.moat/screenshots/` | `saveScreenshotToFile()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-37 | System generates screenshot filename from task ID | `${annotation.id}.png` | ⏳ Not Yet Tested |
| JTBD-38 | System stores screenshot viewport metadata | `screenshotViewport` in annotation | ⏳ Not Yet Tested |
| JTBD-39 | System loads screenshots for thumbnail display | `loadThumbnailFromPath()` in moat.js | ⏳ Not Yet Tested |
| JTBD-40 | System caches thumbnail object URLs | `thumbnailCache` Map in moat.js | ⏳ Not Yet Tested |
| JTBD-41 | System revokes object URLs to free memory | `revokeThumbnailUrl()` in moat.js | ⏳ Not Yet Tested |

### Task Management (CRUD)
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-42 | System adds task to TaskStore | `addTask()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-43 | System validates task object structure | `validateTaskObject()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-44 | System deduplicates identical tasks | Duplicate detection in `addTask()` | ⏳ Not Yet Tested |
| JTBD-45 | System updates existing task instead of creating duplicate | ID-based task update in `addTask()` | ⏳ Not Yet Tested |
| JTBD-46 | System saves tasks to JSON file | `saveTasksToFile()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-47 | System loads tasks from JSON file | `loadTasksFromFile()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-48 | System updates task status | `updateTaskStatus()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-49 | System enforces valid status transitions | Status validation (to do → doing → done) | ⏳ Not Yet Tested |
| JTBD-50 | System removes task by ID | `removeTask()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-51 | System gets task by ID | `getTaskById()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-52 | System gets all tasks sorted by timestamp | `getAllTasks()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-53 | System gets tasks in chronological order | `getAllTasksChronological()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-54 | System calculates task statistics | `getTaskStats()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-55 | System filters tasks by status | Status filtering in TaskStore | ⏳ Not Yet Tested |
| JTBD-56 | System stores bounding box data for freeform rectangles | `boundingBox` property preservation | ⏳ Not Yet Tested |

### Markdown File Generation
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-57 | System generates markdown from task array | `generateMarkdownFromTasks()` in markdownGenerator.js | ⏳ Not Yet Tested |
| JTBD-58 | System writes markdown to file | `writeMarkdownToFile()` in markdownGenerator.js | ⏳ Not Yet Tested |
| JTBD-59 | System rebuilds markdown file completely | `rebuildMarkdownFile()` in markdownGenerator.js | ⏳ Not Yet Tested |
| JTBD-60 | System displays task summary statistics | Stats header in markdown | ⏳ Not Yet Tested |
| JTBD-61 | System converts status to checkbox format | `statusToCheckbox()` - [ ], [~], [x] | ⏳ Not Yet Tested |
| JTBD-62 | System truncates long comments in markdown | `truncateComment()` - max 60 chars | ⏳ Not Yet Tested |
| JTBD-63 | System numbers tasks sequentially | Task numbering in markdown | ⏳ Not Yet Tested |
| JTBD-64 | System includes timestamp in markdown footer | Generation timestamp | ⏳ Not Yet Tested |
| JTBD-65 | System handles empty task list gracefully | "press F to begin" message | ⏳ Not Yet Tested |
| JTBD-66 | System sorts tasks chronologically in markdown | `sortTasksByTimestamp()` | ⏳ Not Yet Tested |

### UI & Sidebar (V1 moat.js - V2 Side Panel)
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-67 | User can toggle sidebar visibility | Extension icon click handler | 🚫 Not Applicable to V2 |
| JTBD-68 | System displays tasks in sidebar | Task rendering in moat.js | ⏳ Not Yet Tested |
| JTBD-69 | User can filter tasks by status tabs | Tab filter (To Do/Doing/Done) | ⏳ Not Yet Tested |
| JTBD-70 | User can drag tasks between status columns | Drag and drop handlers in moat.js | ⏳ Not Yet Tested |
| JTBD-71 | System updates task status on drop | Status update after drag | ⏳ Not Yet Tested |
| JTBD-72 | System displays task thumbnails | Thumbnail image display | ⏳ Not Yet Tested |
| JTBD-73 | System displays task count badges | Count badges per status | ⏳ Not Yet Tested |
| JTBD-74 | System auto-refreshes on task updates | Event listener: `moat:tasks-updated` | ⏳ Not Yet Tested |
| JTBD-75 | System positions sidebar at bottom/right/left | `moatPosition` state management | 🚫 Not Applicable to V2 |
| JTBD-76 | System persists sidebar position | Position in localStorage | 🚫 Not Applicable to V2 |
| JTBD-77 | System injects Google Fonts for UI | `injectGoogleFonts()` in content_script.js | 🚫 Not Applicable to V2 |
| JTBD-78 | System isolates CSS with Shadow DOM | Shadow root creation in moat.js | 🚫 Not Applicable to V2 |
| JTBD-79 | System handles responsive sidebar layout | CSS media queries and positioning | 🚫 Not Applicable to V2 |
| JTBD-80 | System displays connection status indicator | Connection status UI element | ⏳ Not Yet Tested |
| JTBD-81 | System shows "Connect Project" button when disconnected | Connect button rendering | ⏳ Not Yet Tested |

### Notifications
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-82 | System displays success notifications | `showNotification()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-83 | System displays error notifications | `showNotification(message, 'error')` | ⏳ Not Yet Tested |
| JTBD-84 | System displays info notifications | `showNotification(message, 'info')` | ⏳ Not Yet Tested |
| JTBD-85 | System auto-dismisses notifications after 3 seconds | Timeout in showNotification | ⏳ Not Yet Tested |
| JTBD-86 | System deduplicates identical notifications | `NotificationDeduplicator` class in moat.js | ⏳ Not Yet Tested |
| JTBD-87 | System prevents notification spam with debouncing | Debounce timing per notification type | ⏳ Not Yet Tested |
| JTBD-88 | System shows persistent notification for first-time users | Persistent notification until C pressed | ⏳ Not Yet Tested |

### Drawing Tools (Freeform Rectangles)
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-89 | User can enter drawing mode with keyboard shortcut | Press `R` key handler | ⏳ Not Yet Tested |
| JTBD-90 | System creates canvas overlay for drawing | `createDrawingCanvas()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-91 | User can draw rectangle by dragging mouse | Mouse down/move/up handlers | ⏳ Not Yet Tested |
| JTBD-92 | System draws rectangle preview while dragging | `redrawCanvas()` in content_script.js | ⏳ Not Yet Tested |
| JTBD-93 | System cancels rectangle if too small | Minimum size check (5x5 pixels) | ⏳ Not Yet Tested |
| JTBD-94 | System captures screenshot with drawn rectangle | `captureScreenshotNative()` with rectangle | ⏳ Not Yet Tested |
| JTBD-95 | System stores rectangle in multiple formats | xyxy, xywh, normalized formats | ⏳ Not Yet Tested |
| JTBD-96 | System creates annotation with null selector for freeform | `selectorMethod: "freeform"` | ⏳ Not Yet Tested |
| JTBD-97 | User can switch between comment and rectangle modes | C/R key switching | ⏳ Not Yet Tested |
| JTBD-98 | System prevents mode switching after annotation started | `canSwitchTools` check | ⏳ Not Yet Tested |
| JTBD-99 | System exits drawing mode with Escape key | Escape key handler for drawing mode | ⏳ Not Yet Tested |
| JTBD-100 | System removes canvas overlay after annotation | `removeDrawingCanvas()` | ⏳ Not Yet Tested |

### File System & Persistence
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-101 | System reads JSON file from directory | `getFileHandle()` + `getFile()` + `text()` | ⏳ Not Yet Tested |
| JTBD-102 | System writes JSON file to directory | `createWritable()` + `write()` + `close()` | ⏳ Not Yet Tested |
| JTBD-103 | System creates file if it doesn't exist | `getFileHandle(name, {create: true})` | ⏳ Not Yet Tested |
| JTBD-104 | System truncates file before writing | `createWritable({keepExistingData: false})` | ⏳ Not Yet Tested |
| JTBD-105 | System handles concurrent file access | File locking considerations | ⏳ Not Yet Tested |
| JTBD-106 | System stores directory handle in IndexedDB | `storeDirectoryHandle()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-107 | System retrieves directory handle from IndexedDB | `getDirectoryHandle()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-108 | System verifies stored handle is still valid | `testDirectoryAccess()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-109 | System requests permission for expired handle | `requestPermission()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-110 | System removes invalid handles from storage | `removeDirectoryHandle()` in persistence.js | ⏳ Not Yet Tested |
| JTBD-111 | System cleans up old handles periodically | `cleanupOldHandles()` in persistence.js | ⏳ Not Yet Tested |

### Legacy File Migration
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-112 | System detects legacy file formats | `detectLegacyFiles()` in migrateLegacyFiles.js | ⏳ Not Yet Tested |
| JTBD-113 | System migrates legacy markdown to new format | `performMigration()` in migrateLegacyFiles.js | ⏳ Not Yet Tested |
| JTBD-114 | System creates backup before migration | Archive creation in migration flow | ⏳ Not Yet Tested |
| JTBD-115 | System rolls back failed migrations | `rollbackMigration()` in migrateLegacyFiles.js | ⏳ Not Yet Tested |
| JTBD-116 | System reports migration status | `getMigrationReport()` | ⏳ Not Yet Tested |
| JTBD-117 | User can trigger manual migration | `triggerManualMigration()` | ⏳ Not Yet Tested |
| JTBD-118 | System auto-migrates on startup if needed | `checkAndMigrateLegacyFiles()` | ⏳ Not Yet Tested |

### Keyboard Shortcuts
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-119 | User can enter comment mode with F key | `keydown` event listener for 'F' | ⏳ Not Yet Tested |
| JTBD-120 | User can switch to rectangle mode with R key | `keydown` event listener for 'R' | ⏳ Not Yet Tested |
| JTBD-121 | User can switch to comment mode with C key | `keydown` event listener for 'C' | ⏳ Not Yet Tested |
| JTBD-122 | User can exit any mode with Escape key | `keydown` event listener for 'Escape' | ⏳ Not Yet Tested |
| JTBD-123 | System ignores shortcuts when in input fields | Target check: `input, textarea` | ⏳ Not Yet Tested |
| JTBD-124 | System prevents shortcuts when sidebar invisible | `sidebarVisible` check | 🚫 Not Applicable to V2 |

### Message Passing (Extension Communication)
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-125 | Content script requests screenshot from background | `chrome.runtime.sendMessage({type: 'CAPTURE_SCREENSHOT'})` | ⏳ Not Yet Tested |
| JTBD-126 | Background script listens for screenshot requests | `chrome.runtime.onMessage.addListener()` | ⏳ Not Yet Tested |
| JTBD-127 | Background script captures tab screenshot | `chrome.tabs.captureVisibleTab()` | ⏳ Not Yet Tested |
| JTBD-128 | Background script returns screenshot data | `sendResponse({success, dataUrl})` | ⏳ Not Yet Tested |
| JTBD-129 | Background toggles sidebar on icon click | `chrome.action.onClicked` → `toggleMoat` message | 🚫 Not Applicable to V2 |
| JTBD-130 | System handles message passing errors | `chrome.runtime.lastError` checks | ⏳ Not Yet Tested |
| JTBD-131 | System prevents messages to restricted URLs | URL scheme checking | ⏳ Not Yet Tested |

### Template Deployment
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-132 | System loads templates from extension package | `chrome.runtime.getURL()` + `fetch()` | ⏳ Not Yet Tested |
| JTBD-133 | System deploys drawbridge-workflow.md template | Template deployment to `.moat/` | ⏳ Not Yet Tested |
| JTBD-134 | System deploys README.md template | Template deployment to `.moat/` | ⏳ Not Yet Tested |
| JTBD-135 | System deploys bridge.md to `.claude/commands/` | Claude Code command deployment | ⏳ Not Yet Tested |
| JTBD-136 | System uses fallback templates if loading fails | `generateFallbackWorkflowTemplate()` | ⏳ Not Yet Tested |
| JTBD-137 | User can redeploy templates manually | `redeployMoatTemplates()` function | ⏳ Not Yet Tested |
| JTBD-138 | System verifies deployed templates | `checkDeployedTemplates()` | ⏳ Not Yet Tested |

### Connection Event Coordination (V1-specific)
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-139 | System prevents duplicate connection events | `ConnectionEventManager` class in moat.js | ⏳ Not Yet Tested |
| JTBD-140 | System queues events during processing | Event queue in ConnectionEventManager | ⏳ Not Yet Tested |
| JTBD-141 | System dispatches coordinated connection events | `dispatchConnectionEvent()` | ⏳ Not Yet Tested |
| JTBD-142 | System tracks connection state centrally | `ConnectionManager` class in moat.js | ⏳ Not Yet Tested |
| JTBD-143 | System notifies listeners of state changes | State change callbacks | ⏳ Not Yet Tested |
| JTBD-144 | System verifies connection periodically | `verifyConnection()` in ConnectionManager | ⏳ Not Yet Tested |

### Error Handling & Recovery
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-145 | System falls back to legacy system on new system failure | Fallback in `addToQueue()` | ⏳ Not Yet Tested |
| JTBD-146 | System falls back to direct file writing if utilities unavailable | `saveAnnotationWithDirectFileWriting()` | ⏳ Not Yet Tested |
| JTBD-147 | System handles missing directory handle gracefully | Directory handle checks throughout | ⏳ Not Yet Tested |
| JTBD-148 | System handles file write failures | Try-catch blocks in file operations | ⏳ Not Yet Tested |
| JTBD-149 | System logs errors to console | `console.error()` calls | ⏳ Not Yet Tested |
| JTBD-150 | System shows user-friendly error notifications | Error notifications with context | ⏳ Not Yet Tested |

### Performance & Optimization
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-151 | System completes save operation in < 500ms | Performance monitoring in save pipeline | ⏳ Not Yet Tested |
| JTBD-152 | System caches thumbnails to reduce file reads | `thumbnailCache` Map | ⏳ Not Yet Tested |
| JTBD-153 | System revokes object URLs to free memory | Memory cleanup for thumbnails | ⏳ Not Yet Tested |
| JTBD-154 | System debounces rapid events | Debouncing in NotificationDeduplicator | ⏳ Not Yet Tested |
| JTBD-155 | System cleans up old cache entries | Periodic cleanup intervals | ⏳ Not Yet Tested |

### Utilities & Helpers
| ID | Job | V1 Implementation | V2 Test Status |
|---|---|---|---|
| JTBD-156 | System generates unique UUIDs for tasks | `generateUUID()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-157 | System validates task object structure | `validateTaskObject()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-158 | System creates properly structured task objects | `createTaskObject()` in taskStore.js | ⏳ Not Yet Tested |
| JTBD-159 | System converts annotation format to task format | `convertAnnotationToTask()` | ⏳ Not Yet Tested |
| JTBD-160 | System checks if new task system is available | `canUseNewTaskSystem()` | ⏳ Not Yet Tested |
| JTBD-161 | System verifies files were written | `verifyFilesWritten()` | ⏳ Not Yet Tested |

## Summary Statistics
- **Total Jobs Identified**: 161
- **V1 Jobs**: 161
- **V2-Applicable Jobs**: ~135 (excluding V1 sidebar-specific)
- **Test Coverage**: 0% (all ⏳ Not Yet Tested)

## Priority Testing Order
1. **Critical Path** (JTBD-01 to JTBD-13): Connection & Project Setup
2. **Core Functionality** (JTBD-14 to JTBD-28): Task Creation
3. **Data Persistence** (JTBD-42 to JTBD-66): Task Management & Markdown
4. **Screenshot System** (JTBD-29 to JTBD-41): Screenshot Capture
5. **File System** (JTBD-101 to JTBD-111): File Operations
6. **Advanced Features**: Drawing Tools, Migration, etc.
