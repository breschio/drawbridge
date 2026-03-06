// chromeHelper.js — MAIN world helper for chrome.* API calls via bridge
(function() {
  // Get extension base URL from bridge (set as data attribute)
  function getExtensionBaseUrl() {
    return document.documentElement.getAttribute('data-drawbridge-ext-url') || '';
  }

  // Replacement for chrome.runtime.getURL()
  function getExtensionURL(path) {
    return getExtensionBaseUrl() + path;
  }

  // Replacement for chrome.runtime.sendMessage()
  function sendExtensionMessage(message) {
    return new Promise((resolve, reject) => {
      const requestId = Date.now() + '_' + Math.random().toString(36).slice(2);

      const handler = (e) => {
        if (e.detail && e.detail.requestId === requestId) {
          window.removeEventListener('drawbridge:sendMessage:response', handler);
          if (e.detail.error) {
            reject(new Error(e.detail.error));
          } else {
            resolve(e.detail.response);
          }
        }
      };
      window.addEventListener('drawbridge:sendMessage:response', handler);

      window.dispatchEvent(new CustomEvent('drawbridge:sendMessage', {
        detail: { requestId, message }
      }));
    });
  }

  // Replacement for chrome.runtime.onMessage.addListener()
  function onExtensionMessage(callback) {
    window.addEventListener('drawbridge:onMessage', (e) => {
      const { messageId, request } = e.detail;
      const sendResponse = (response) => {
        window.dispatchEvent(new CustomEvent('drawbridge:onMessage:response', {
          detail: { messageId, response }
        }));
      };
      callback(request, null, sendResponse);
    });
  }

  // Expose globally
  window.drawbridgeChrome = {
    getURL: getExtensionURL,
    sendMessage: sendExtensionMessage,
    onMessage: { addListener: onExtensionMessage }
  };
})();
