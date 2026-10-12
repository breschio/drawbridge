// chrome-extension/background.js

importScripts('utils/buildInfo.js');

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'moz-extension://',
  'devtools://'
];

function isRestrictedTab(tab) {
  return !tab?.id || !tab?.url || RESTRICTED_URL_PREFIXES.some(scheme => tab.url.startsWith(scheme));
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function runScriptingMethod(methodName, details) {
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = chrome.scripting[methodName](details, (result) => {
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve(result);
      });

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve, reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function getPrimaryContentScript() {
  const manifest = chrome.runtime.getManifest();
  return manifest.content_scripts?.[0] || {};
}

async function injectManifestContentScripts(tabId) {
  const contentScript = getPrimaryContentScript();
  const target = { tabId };

  if (contentScript.css?.length) {
    await runScriptingMethod('insertCSS', {
      target,
      files: contentScript.css
    });
  }

  if (contentScript.js?.length) {
    await runScriptingMethod('executeScript', {
      target,
      files: contentScript.js
    });
  }
}

function getExpectedContentScriptBuild() {
  const buildInfo = globalThis.DrawbridgeBuildInfo;
  return buildInfo.getContentScriptBuild(chrome.runtime.getManifest().version);
}

function needsManualInjection(pingResponse) {
  if (!pingResponse?.ready) {
    return true;
  }
  if (pingResponse.contentScriptBuild !== getExpectedContentScriptBuild()) {
    return true;
  }
  return false;
}

async function ensureContentScriptsReady(tabId) {
  try {
    const pingResponse = await sendTabMessage(tabId, { action: 'ping' });

    if (!needsManualInjection(pingResponse)) {
      return;
    }

    console.warn(
      'Drawbridge: Injecting content scripts (missing, outdated moat, or stale build:',
      pingResponse?.contentScriptBuild,
      'expected:',
      getExpectedContentScriptBuild() + ')'
    );
    await injectManifestContentScripts(tabId);
  } catch (error) {
    console.warn('Drawbridge: Content script not ready, injecting into active tab:', error.message);
    await injectManifestContentScripts(tabId);
  }

  const pingResponse = await sendTabMessage(tabId, { action: 'ping' });
  if (needsManualInjection(pingResponse)) {
    throw new Error(
      'Content script did not report ready after injection. Refresh the page (Ctrl+Shift+R).'
    );
  }
}

async function handleActionClick(tab) {
  if (isRestrictedTab(tab)) {
    console.warn('Drawbridge: Cannot open on restricted page:', tab?.url);
    return;
  }

  try {
    // Open before any asynchronous work consumes the toolbar user gesture.
    await chrome.sidePanel.open({ tabId: tab.id });
    await ensureContentScriptsReady(tab.id);
    console.log('Drawbridge: Side panel opened');
  } catch (error) {
    console.warn('Drawbridge: Failed to open on this page:', error.message);
  }
}

// Handle extension icon click - open the native side panel
chrome.action.onClicked.addListener(handleActionClick);

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
  if (message.type === 'RELAY_TO_SIDEPANEL' && sender.tab) {
    // Stamp trusted routing metadata after the payload; the panel filters it.
    chrome.runtime.sendMessage({
      ...message.payload,
      sourceTabId: sender.tab.id,
      sourceWindowId: sender.tab.windowId
    }).catch(() => {});
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESTRICTED_URL_PREFIXES,
    isRestrictedTab,
    needsManualInjection,
    getExpectedContentScriptBuild,
    handleActionClick,
    ensureContentScriptsReady,
    injectManifestContentScripts
  };
}
