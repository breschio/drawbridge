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
    action: {
      onClicked: {
        addListener: jest.fn()
      }
    },
    runtime: {
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

  test('toggles immediately when the content script is already ready', async () => {
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        callback(getReadyPing());
        return;
      }

      callback({ success: true });
    });
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'https://example.com/' });

    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'toggleMoat']);
    expect(chrome.scripting.insertCSS).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  test('injects manifest content scripts before toggling when the active tab has no receiver', async () => {
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
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'ping', 'toggleMoat']);
  });

  test('injects full manifest when moat has not loaded yet', async () => {
    let pingCount = 0;
    const sendMessage = jest.fn((tabId, message, callback) => {
      if (message.action === 'ping') {
        pingCount += 1;
        callback({
          ...getReadyPing(),
          moatLoaded: pingCount > 1
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
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'ping', 'toggleMoat']);
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
    expect(sendMessage.mock.calls.map(call => call[1].action)).toEqual(['ping', 'ping', 'toggleMoat']);
  });

  test('does nothing on restricted pages', async () => {
    const sendMessage = jest.fn();
    const { handleActionClick } = loadBackground({ sendMessage });

    await handleActionClick({ id: 7, url: 'chrome://extensions/' });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(chrome.scripting.insertCSS).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  test('does not toggle when fallback injection fails', async () => {
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
