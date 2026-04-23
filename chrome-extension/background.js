// chrome-extension/background.js

// Handle extension icon click - open side panel
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
    // Open the side panel for this tab
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('Drawbridge: Side panel opened');
  } catch (error) {
    console.error('Drawbridge: Failed to open side panel:', error);
  }
});

// Handle messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Screenshot capture requests from content scripts
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

  // Relay messages from content script to side panel
  if (message.type === 'RELAY_TO_SIDEPANEL') {
    // Broadcast to all extension pages (including side panel)
    chrome.runtime.sendMessage(message.payload).catch(() => {
      // Side panel might not be open, that's okay
    });
    return false;
  }

  // Messages that need to be relayed to the active tab's content script
  const contentScriptMessages = [
    'ENTER_COMMENT_MODE',
    'ENTER_DRAWING_MODE',
    'EXIT_ANNOTATION_MODE',
    'SETUP_PROJECT',
    'DISCONNECT_PROJECT',
    'LOAD_TASKS',
    'UPDATE_TASK_STATUS',
    'DELETE_TASK',
    'GET_CONNECTION_STATUS'
  ];

  if (contentScriptMessages.includes(message.type)) {
    // This message came from side panel, relay to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Relay to content script failed:', chrome.runtime.lastError.message);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      }
    });
    return true; // Keep channel open for async response
  }
});
