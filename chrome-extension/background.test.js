const manifest = require('./manifest.json');
const { getContentScriptBuild } = require('./utils/buildInfo.js');

function getReadyPing(overrides = {}) {
  return {
    success: true,
    ready: true,
    moatLoaded: true,
    contentScriptBuild: getContentScriptBuild(manifest.version),
    ...overrides
  };
}

function loadBackground({ sendMessage, insertCSS, executeScript } = {}) {
  jest.resetModules();

  global.self = global;
  global.importScripts = jest.fn(() => {
    require('./utils/buildInfo.js');
  });
  require('./utils/buildInfo.js');

  global.chrome = {
    sidePanel: { open: jest.fn(async () => {}) },
    action: {
      onClicked: {
        addListener: jest.fn()
      }
    },
    runtime: {
      sendMessage: jest.fn(async () => {}),
      lastError: null,
      getManifest: jest.fn(() => manifest),
      onMessage: {
        addListener: jest.fn()
      }
    },
    tabs: {
      sendMessage: sendMessage || jest.fn((tabId, message, callback) => callback(getReadyPing())),
      captureVisibleTab: jest.fn()
    },
    scripting: {
      insertCSS: insertCSS || jest.fn((details, callback) => callback([])),
      executeScript: executeScript || jest.fn((details, callback) => callback([]))
    }
  };

  return require('./background');
}

function failNextChromeCallback(message, callback) {
  chrome.runtime.lastError = { message };
  callback();
  chrome.runtime.lastError = null;
}

describe('background action click handling', () => {
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    delete global.chrome;
  });

  test('opens the panel before checking content readiness', async () => {
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        callback(getReadyPing());
        return;
      }

      callback({ success: true });
    });
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'https://example.com/' });

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 7 });
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping']);
    expect(chrome.scripting.insertCSS).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  test('injects manifest content scripts when the active tab has no receiver', async () => {
    let pingCount = 0;
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        pingCount += 1;

        if (pingCount === 1) {
          failNextChromeCallback('Could not establish connection. Receiving end does not exist.', callback);
          return;
        }

        callback({ ...getReadyPing(), moatLoaded: true });
        return;
      }

      callback({ success: true });
    });
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'https://example.com/' });

    expect(chrome.scripting.insertCSS).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: manifest.content_scripts[0].css
    }, expect.any(Function));
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: manifest.content_scripts[0].js
    }, expect.any(Function));
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'ping']);
  });

  test('injects full manifest when the content script is not ready', async () => {
    let pingCount = 0;
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        pingCount += 1;
        callback({
          ...getReadyPing(),
          ready: pingCount > 1
        });
        return;
      }

      callback({ success: true });
    });
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'https://example.com/' });

    expect(chrome.scripting.insertCSS).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: manifest.content_scripts[0].css
    }, expect.any(Function));
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: manifest.content_scripts[0].js
    }, expect.any(Function));
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'ping']);
  });

  test('injects full manifest when content script build is stale', async () => {
    let pingCount = 0;
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        pingCount += 1;
        callback({
          success: true,
          ready: true,
          moatLoaded: true,
          contentScriptBuild: pingCount > 1 ? getContentScriptBuild(manifest.version) : '1.0.0-outdated'
        });
        return;
      }

      callback({ success: true });
    });
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'https://example.com/' });

    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: manifest.content_scripts[0].js
    }, expect.any(Function));
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'ping']);
  });

  test('does nothing on restricted pages', async () => {
    const sendMessage = jest.fn();
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'chrome://extensions/' });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(chrome.scripting.insertCSS).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  test('reports fallback injection failure', async () => {
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        failNextChromeCallback('Could not establish connection. Receiving end does not exist.', callback);
        return;
      }

      callback({ success: true });
    });
    const insertCSS = jest.fn((details, callback) => {
      failNextChromeCallback('Cannot access contents of the page.', callback);
    });
    const { handleActionClick } = loadBackground({ sendMessage, insertCSS });

    await handleActionClick({ id: 7, url: 'https://example.com/' });

    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping']);
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Drawbridge: Failed to open on this page:',
      'Cannot access contents of the page.'
    );
  });
});


test('relay stamps source tab and window from sender rather than payload', () => {
  loadBackground();
  const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
  handler({ type: 'RELAY_TO_SIDEPANEL', payload: { type: 'TASKS_LOADED', tasks: [], sourceTabId: 99, sourceWindowId: 99 } }, { tab: { id: 7, windowId: 3 } }, () => {});
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TASKS_LOADED', tasks: [], sourceTabId: 7, sourceWindowId: 3 });
  delete global.chrome;
});
