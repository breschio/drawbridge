# PRD: Native Screenshot Capture

## Overview

Replace the `html2canvas` library with Chrome's native `captureVisibleTab` API to eliminate page freezing during screenshot capture.

### Problem Statement

When users take screenshots using the "R" (freeform rectangle) command on pages with streaming/dynamic content (e.g., AI chatbot responses), the page freezes. This occurs because `html2canvas` runs synchronously on the main thread, parsing the entire DOM while it's being rapidly mutated by streaming content.

### Solution

Replace `html2canvas` with Chrome's native `captureVisibleTab` API, which:
- Runs in the extension's service worker (non-blocking)
- Captures the rendered viewport directly (no DOM parsing)
- Completes in ~50-200ms vs 500ms-5s+

### Scope

- **In Scope:** Replace screenshot capture mechanism, maintain identical UX/UI
- **Out of Scope:** Video recording, new features, UI changes

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Screenshot capture must not block the main thread | P0 |
| FR-2 | Captured screenshots must include the drawing canvas overlay (blue rectangle) | P0 |
| FR-3 | Screenshots must be cropped to the selected region with padding | P0 |
| FR-4 | Both "C" (element) and "R" (rectangle) modes must use the new capture method | P0 |
| FR-5 | Capture must handle high DPI displays correctly | P1 |
| FR-6 | Capture failure must not prevent task submission (graceful degradation) | P1 |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | Screenshot capture should complete in <500ms | P0 |
| NFR-2 | No new permissions should be required | P1 |
| NFR-3 | Existing data format for screenshots must be preserved | P0 |

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `chrome-extension/background.js` | **Create** | New service worker for screenshot capture |
| `chrome-extension/manifest.json` | **Modify** | Register service worker |
| `chrome-extension/content_script.js` | **Modify** | Add capture utility, replace html2canvas calls |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Content Script                          │
│                                                                 │
│  User draws rectangle                                           │
│         │                                                       │
│         ▼                                                       │
│  captureScreenshotNative(captureArea)                          │
│         │                                                       │
│         │ chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' })
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Worker (background.js)              │
│                                                                 │
│  chrome.tabs.captureVisibleTab() ──► Returns full viewport PNG │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          │ { success: true, dataUrl: "data:image/png;base64,..." }
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Content Script                          │
│                                                                 │
│  Load image ──► Create canvas ──► Crop to captureArea          │
│                                                                 │
│  Return { dataUrl, viewport } to caller                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Create Service Worker

**File:** `chrome-extension/background.js` (new file)

Create a service worker with a message listener:

```javascript
// chrome-extension/background.js

// Handle screenshot capture requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: 'png' },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('Screenshot capture failed:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, dataUrl });
        }
      }
    );
    return true; // Required for async sendResponse
  }
});
```

---

### Task 2: Register Service Worker in Manifest

**File:** `chrome-extension/manifest.json`

Add the background service worker registration after `host_permissions`:

```json
"background": {
  "service_worker": "background.js"
},
```

**No new permissions required** — existing `activeTab` permission is sufficient.

---

### Task 3: Add Screenshot Utility Function

**File:** `chrome-extension/content_script.js`

Add a new utility function after the existing utility functions (around line 350, after `saveScreenshotToFile`):

```javascript
/**
 * Capture screenshot using Chrome's native API and crop to specified region
 * @param {Object} captureArea - { x, y, width, height } in viewport/CSS pixels
 * @param {number} padding - Padding already included in captureArea (for metadata)
 * @returns {Promise<{dataUrl: string, viewport: Object}|null>}
 */
async function captureScreenshotNative(captureArea, padding = 100) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Screenshot message failed:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      
      if (!response?.success || !response?.dataUrl) {
        console.warn('Native screenshot capture failed:', response?.error);
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const scale = window.devicePixelRatio || 1;

          // Calculate crop coordinates (captureArea is in CSS pixels, image is in device pixels)
          const cropX = Math.max(0, Math.round(captureArea.x * scale));
          const cropY = Math.max(0, Math.round(captureArea.y * scale));
          const cropW = Math.min(Math.round(captureArea.width * scale), img.width - cropX);
          const cropH = Math.min(Math.round(captureArea.height * scale), img.height - cropY);

          if (cropW <= 0 || cropH <= 0) {
            console.warn('Invalid crop dimensions');
            resolve(null);
            return;
          }

          canvas.width = cropW;
          canvas.height = cropH;

          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            viewport: {
              x: captureArea.x,
              y: captureArea.y,
              width: captureArea.width,
              height: captureArea.height,
              padding: padding
            }
          });
        } catch (e) {
          console.error('Screenshot crop failed:', e);
          resolve(null);
        }
      };

      img.onerror = () => {
        console.error('Failed to load screenshot image');
        resolve(null);
      };

      img.src = response.dataUrl;
    });
  });
}
```

---

### Task 4: Replace html2canvas in `createCommentBox()`

**File:** `chrome-extension/content_script.js`
**Location:** Around lines 3017-3060

Find the block starting with:
```javascript
if (window.html2canvas) {
```

Replace the **entire `if (window.html2canvas) { ... }` block** with:

```javascript
try {
  const rect = element.getBoundingClientRect();
  const padding = 100;
  
  // Calculate capture area in viewport coordinates
  const captureX = Math.max(0, rect.x - padding);
  const captureY = Math.max(0, rect.y - padding);
  const captureWidth = Math.min(rect.width + (padding * 2), window.innerWidth - captureX);
  const captureHeight = Math.min(rect.height + (padding * 2), window.innerHeight - captureY);
  
  console.log('📸 Capturing element screenshot at:', {
    element: element.tagName,
    rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    captureArea: { x: captureX, y: captureY, w: captureWidth, h: captureHeight }
  });
  
  screenshotData = await captureScreenshotNative({
    x: captureX,
    y: captureY,
    width: captureWidth,
    height: captureHeight
  }, padding);
  
  if (screenshotData) {
    console.log('✅ Screenshot captured successfully');
  }
} catch (e) {
  console.warn('Screenshot capture failed:', e);
}
```

**Important:** Remove the scroll offset additions (`window.scrollX`, `window.scrollY`) that exist in the current code. `captureVisibleTab` captures the viewport directly, so coordinates should remain viewport-relative.

---

### Task 5: Replace html2canvas in `createFreeformCommentBox()`

**File:** `chrome-extension/content_script.js`
**Location:** Around lines 3372-3431

Find the block starting with:
```javascript
if (window.html2canvas && drawingCanvas) {
```

Replace the **entire `if (window.html2canvas && drawingCanvas) { ... }` block** with:

```javascript
try {
  // Draw final rectangle on canvas before capture (ensure it's visible)
  if (drawingCtx && drawingTool) {
    const tool = drawingTools[drawingTool];
    if (tool && tool.draw) {
      tool.draw(drawingCtx, rectangleData.x, rectangleData.y, rectangleData.width, rectangleData.height);
    }
  }
  
  // Brief delay to ensure canvas is rendered before capture
  await new Promise(resolve => setTimeout(resolve, 16));
  
  // Calculate capture area in viewport coordinates
  const padding = 100;
  const captureX = Math.max(0, rectangleData.x - padding);
  const captureY = Math.max(0, rectangleData.y - padding);
  const captureWidth = Math.min(rectangleData.width + (padding * 2), window.innerWidth - captureX);
  const captureHeight = Math.min(rectangleData.height + (padding * 2), window.innerHeight - captureY);
  
  console.log('📸 Capturing rectangle screenshot at:', {
    rect: rectangleData,
    captureArea: { x: captureX, y: captureY, w: captureWidth, h: captureHeight }
  });
  
  screenshotData = await captureScreenshotNative({
    x: captureX,
    y: captureY,
    width: captureWidth,
    height: captureHeight
  }, padding);
  
  if (screenshotData) {
    console.log('✅ Screenshot captured with rectangle');
  }
} catch (e) {
  console.warn('Screenshot capture failed:', e);
}
```

**Note:** The drawing canvas uses `position: fixed` and high `z-index`, so it will appear in the captured screenshot automatically.

---

### Task 6: Update Diagnostic Function

**File:** `chrome-extension/content_script.js`
**Location:** Around lines 4158-4200

In the `checkScreenshotSystem` function, update the diagnosis object:

**Replace:**
```javascript
html2canvasAvailable: !!window.html2canvas,
html2canvasVersion: window.html2canvas?.version || 'unknown',
```

**With:**
```javascript
nativeCaptureAvailable: !!chrome?.runtime?.sendMessage,
captureMethod: 'captureVisibleTab',
```

**Update the recommendations section:**

**Replace:**
```javascript
if (!diagnosis.html2canvasAvailable) {
  diagnosis.recommendations.push('❌ html2canvas library not loaded - check manifest.json script order');
} else {
  diagnosis.recommendations.push('✅ html2canvas library loaded successfully');
}
```

**With:**
```javascript
if (!diagnosis.nativeCaptureAvailable) {
  diagnosis.recommendations.push('❌ Chrome runtime not available for screenshots');
} else {
  diagnosis.recommendations.push('✅ Native screenshot capture available');
}
```

**Update the final capability check:**

**Replace:**
```javascript
diagnosis.canCaptureScreenshots = diagnosis.html2canvasAvailable && !!window.directoryHandle;
```

**With:**
```javascript
diagnosis.canCaptureScreenshots = diagnosis.nativeCaptureAvailable && !!window.directoryHandle;
```

---

## Testing Checklist

After implementation, verify each scenario:

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Rectangle screenshot | Press R → Draw rectangle → Submit | Screenshot includes blue rectangle overlay |
| Element screenshot | Press C → Click element → Submit | Screenshot shows element with highlight |
| Streaming content | Open AI chat with streaming response → Press R → Draw rectangle during streaming | No page freeze, capture completes in <500ms |
| High DPI display | Test on Retina/HiDPI display | Screenshot is sharp, crop coordinates accurate |
| Edge of viewport | Draw rectangle near edge of screen | Crop handles boundaries without errors |
| Capture failure | Disconnect extension permissions → Try screenshot | Task saves successfully without screenshot |
| Console output | Check browser console during capture | Logging shows `📸` and `✅` messages |

---

## Notes for Implementation

1. **Do NOT remove html2canvas yet** — Keep `html2canvas.min.js` in the manifest. It can be removed in a follow-up cleanup after verifying the new implementation works.

2. **Coordinate system** — `captureVisibleTab` captures the viewport. Use viewport-relative coordinates (like `getBoundingClientRect()` returns), NOT document-relative coordinates.

3. **Device pixel ratio** — The captured image is in device pixels. Multiply CSS pixel coordinates by `window.devicePixelRatio` when cropping.

4. **Canvas overlay** — The drawing canvas is `position: fixed` with `z-index: 999999`, so it appears in the screenshot automatically. The 16ms delay ensures the rectangle is rendered.

5. **Graceful degradation** — If capture fails, continue without screenshot. The task should still be saved.

---

## Success Criteria

- [ ] Screenshots work on streaming content without freezing
- [ ] Screenshot capture completes in <500ms
- [ ] Blue rectangle overlay appears in freeform screenshots
- [ ] Element highlight appears in comment mode screenshots
- [ ] No new permission prompts for users
- [ ] Existing task data format unchanged
