// chrome-bridge.js — Runs in ISOLATED world (default)
// Bridges chrome.* API calls from MAIN world content scripts via custom events.

(function() {
  // 1. Expose the extension's base URL so MAIN world can build resource URLs
  const extensionBaseUrl = chrome.runtime.getURL('');
  document.documentElement.setAttribute('data-drawbridge-ext-url', extensionBaseUrl);

  // 2. Proxy chrome.runtime.sendMessage requests from MAIN world
  window.addEventListener('drawbridge:sendMessage', (e) => {
    const { requestId, message } = e.detail;
    chrome.runtime.sendMessage(message, (response) => {
      window.dispatchEvent(new CustomEvent('drawbridge:sendMessage:response', {
        detail: {
          requestId,
          response,
          error: chrome.runtime.lastError ? chrome.runtime.lastError.message : null
        }
      }));
    });
  });

  // 3. Forward chrome.runtime.onMessage to MAIN world
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const messageId = Date.now() + '_' + Math.random().toString(36).slice(2);

    const handler = (e) => {
      if (e.detail && e.detail.messageId === messageId) {
        window.removeEventListener('drawbridge:onMessage:response', handler);
        sendResponse(e.detail.response);
      }
    };
    window.addEventListener('drawbridge:onMessage:response', handler);

    window.dispatchEvent(new CustomEvent('drawbridge:onMessage', {
      detail: { messageId, request }
    }));

    return true; // Keep channel open for async response
  });
})();
