// chrome-extension/background.js

// Content scripts to inject (in order)
const CONTENT_SCRIPTS = [
  'html2canvas.min.js',
  'utils/persistence.js',
  'utils/taskStore.js',
  'utils/markdownGenerator.js',
  'utils/migrateLegacyFiles.js',
  'content_script.js',
  'moat.js'
];

const CONTENT_CSS = ['moat.css'];

/**
 * Inject content scripts into a tab if not already present
 */
async function ensureContentScripts(tabId) {
  try {
    // First, check if content scripts are already injected by sending a ping
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' }).catch(() => null);
    
    if (response?.pong) {
      console.log('Content scripts already present in tab', tabId);
      return { success: true, alreadyInjected: true };
    }

    console.log('Injecting content scripts into tab', tabId);

    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: CONTENT_CSS
    });

    // Inject JS files in order
    await chrome.scripting.executeScript({
      target: { tabId },
      files: CONTENT_SCRIPTS
    });

    console.log('Content scripts injected successfully');
    return { success: true, alreadyInjected: false };

  } catch (error) {
    console.error('Failed to inject content scripts:', error);
    return { success: false, error: error.message };
  }
}

// Handle extension icon click (no popup, direct action)
chrome.action.onClicked.addListener(async (tab) => {
  // Check if we're on a valid page
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    console.log('Drawbridge: Cannot run on this page');
    return;
  }

  console.log('Drawbridge: Icon clicked, ensuring content scripts are loaded');

  // Ensure content scripts are injected
  const injectionResult = await ensureContentScripts(tab.id);

  if (!injectionResult?.success) {
    console.error('Drawbridge: Failed to inject content scripts:', injectionResult?.error);
    return;
  }

  // Small delay to allow scripts to initialize after fresh injection
  if (!injectionResult.alreadyInjected) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Send toggle message to open/close the sidebar
  console.log('Drawbridge: Toggling sidebar');
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleMoat' });
    console.log('Drawbridge: Sidebar toggled successfully');
  } catch (error) {
    console.error('Drawbridge: Failed to toggle sidebar:', error);
  }
});

// Handle messages from content scripts
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

  if (message.type === 'ENSURE_CONTENT_SCRIPTS') {
    ensureContentScripts(message.tabId).then(sendResponse);
    return true; // Required for async sendResponse
  }
});
