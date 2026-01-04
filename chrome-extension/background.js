// chrome-extension/background.js

// Handle extension icon click - toggle Drawbridge sidebar
chrome.action.onClicked.addListener(async (tab) => {
  // Check for restricted URL schemes where content scripts cannot run
  const restrictedSchemes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
    'devtools://'
  ];

  const isRestricted = restrictedSchemes.some(scheme => tab.url?.startsWith(scheme));
  
  if (isRestricted || !tab.id || !tab.url) {
    console.warn('Drawbridge: Cannot open on restricted page:', tab.url);
    return;
  }

  try {
    // Send message to content script to toggle the Drawbridge sidebar
    // Content scripts are auto-injected via manifest, so this should work
    chrome.tabs.sendMessage(tab.id, { action: 'toggleMoat' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Drawbridge: Content script may not be ready yet:', chrome.runtime.lastError.message);
        // This is okay - content script will be injected on next page load
      } else {
        console.log('Drawbridge: Sidebar toggled successfully');
      }
    });
  } catch (error) {
    console.error('Drawbridge: Failed to toggle sidebar:', error);
  }
});

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
