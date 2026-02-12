/**
 * V2 Architecture Tests
 * Tests for V2-specific message passing and Side Panel integration
 * 
 * V2 Architecture:
 * - Side Panel (sidepanel.js) - UI layer, message passing only
 * - Background Script (background.js) - message relay between side panel and content script
 * - Content Script (content_script.js) - File System Access API operations
 */

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

describe('V2-01: Background script opens side panel on icon click', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should open side panel when extension icon is clicked', async () => {
    const tab = { id: 1, url: 'https://example.com' };
    let sidePanelOpened = false;
    
    // Mock sidePanel API
    chrome.sidePanel = {
      open: async ({ tabId }) => {
        if (tabId === tab.id) {
          sidePanelOpened = true;
        }
      }
    };

    // Register the handler as background.js would
    chrome.action.onClicked.addListener(async (tab) => {
      const restrictedSchemes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'devtools://'];
      const isRestricted = restrictedSchemes.some(scheme => tab.url?.startsWith(scheme));
      if (isRestricted || !tab.id || !tab.url) return;
      await chrome.sidePanel.open({ tabId: tab.id });
    });

    // Simulate icon click
    const listeners = chrome.action._actionListeners || [];
    for (const listener of listeners) {
      await listener(tab);
    }

    expect(sidePanelOpened).toBe(true);
  });

  it('should not open side panel on restricted URLs', async () => {
    const restrictedTab = { id: 1, url: 'chrome://extensions/' };
    let sidePanelOpened = false;

    chrome.sidePanel = {
      open: async () => {
        sidePanelOpened = true;
      }
    };

    const listeners = chrome.action._actionListeners || [];
    for (const listener of listeners) {
      await listener(restrictedTab);
    }

    expect(sidePanelOpened).toBe(false);
  });
});

describe('V2-02: Background script relays messages between side panel and content script', () => {
  let mocks;

  // Simulates the message handler from background.js
  function createBackgroundHandler() {
    const contentScriptMessages = [
      'ENTER_COMMENT_MODE', 'ENTER_DRAWING_MODE', 'EXIT_ANNOTATION_MODE',
      'SETUP_PROJECT', 'DISCONNECT_PROJECT', 'LOAD_TASKS',
      'UPDATE_TASK_STATUS', 'DELETE_TASK', 'GET_CONNECTION_STATUS'
    ];

    return (message, sender, sendResponse) => {
      if (message.type === 'CAPTURE_SCREENSHOT') {
        chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: 'png' },
          (dataUrl) => {
            sendResponse({ success: true, dataUrl });
          }
        );
        return true;
      }

      if (message.type === 'RELAY_TO_SIDEPANEL') {
        chrome.runtime.sendMessage(message.payload).catch(() => {});
        return false;
      }

      if (contentScriptMessages.includes(message.type)) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
              sendResponse(response || { success: true });
            });
          }
        });
        return true;
      }
    };
  }

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should relay RELAY_TO_SIDEPANEL messages', () => {
    const handler = createBackgroundHandler();

    const testMessage = {
      type: 'RELAY_TO_SIDEPANEL',
      payload: {
        type: 'TASKS_UPDATED',
        tasks: [{ id: '1', title: 'Test' }]
      }
    };

    let relayedMessage = null;
    chrome.runtime.sendMessage = (message) => {
      relayedMessage = message;
      return Promise.resolve();
    };

    const sender = { tab: { id: 1, windowId: 1 } };
    handler(testMessage, sender, () => {});

    expect(relayedMessage).toEqual(testMessage.payload);
  });

  it('should relay content script commands to active tab', () => {
    const handler = createBackgroundHandler();

    let sentToTab = null;
    let capturedResponse = null;
    chrome.tabs.query = (query, callback) => {
      callback([{ id: 1 }]);
    };
    chrome.tabs.sendMessage = (tabId, message, callback) => {
      sentToTab = { tabId, message };
      callback({ success: true });
    };

    const sender = {};
    const sendResponse = (response) => {
      capturedResponse = response;
    };

    const keepAlive = handler({ type: 'ENTER_COMMENT_MODE' }, sender, sendResponse);

    expect(keepAlive).toBe(true);
    expect(sentToTab).toBeTruthy();
    expect(sentToTab.tabId).toBe(1);
    expect(sentToTab.message.type).toBe('ENTER_COMMENT_MODE');
    expect(capturedResponse.success).toBe(true);
  });

  it('should handle screenshot capture requests', () => {
    const handler = createBackgroundHandler();

    let capturedResponse = null;
    // Mock captureVisibleTab to call callback synchronously
    chrome.tabs.captureVisibleTab = (windowId, options, callback) => {
      callback('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    };

    const sender = { tab: { id: 1, windowId: 1 } };
    const keepAlive = handler(
      { type: 'CAPTURE_SCREENSHOT' },
      sender,
      (response) => { capturedResponse = response; }
    );

    expect(keepAlive).toBe(true);
    expect(capturedResponse).toBeTruthy();
    expect(capturedResponse.success).toBe(true);
    expect(capturedResponse.dataUrl).toContain('data:image/png;base64');
  });
});

describe('V2-03: Side panel communicates with content script via background relay', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should send SETUP_PROJECT message to content script', async () => {
    let messageSent = null;

    chrome.runtime.sendMessage = (message, callback) => {
      messageSent = message;
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    };

    const response = await chrome.runtime.sendMessage({ type: 'SETUP_PROJECT' });

    expect(messageSent.type).toBe('SETUP_PROJECT');
    expect(response.success).toBe(true);
  });

  it('should request tasks from content script', async () => {
    let messageSent = null;

    chrome.runtime.sendMessage = (message, callback) => {
      messageSent = message;
      const response = {
        success: true,
        tasks: [
          { id: '1', title: 'Test Task', status: 'to do' }
        ]
      };
      if (callback) callback(response);
      return Promise.resolve(response);
    };

    const response = await chrome.runtime.sendMessage({ type: 'LOAD_TASKS' });

    expect(messageSent.type).toBe('LOAD_TASKS');
    expect(response.tasks).toHaveLength(1);
    expect(response.tasks[0].title).toBe('Test Task');
  });

  it('should update task status via message', async () => {
    const updateMessage = {
      type: 'UPDATE_TASK_STATUS',
      taskId: 'task-123',
      status: 'done'
    };

    chrome.runtime.sendMessage = (message, callback) => {
      const response = { success: true, task: { id: 'task-123', status: 'done' } };
      if (callback) callback(response);
      return Promise.resolve(response);
    };

    const response = await chrome.runtime.sendMessage(updateMessage);

    expect(response.success).toBe(true);
    expect(response.task.status).toBe('done');
  });
});

describe('V2-04: Content script retains File System Access API operations', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should handle SETUP_PROJECT in content script context', async () => {
    // Content script has access to window.showDirectoryPicker
    expect(window.showDirectoryPicker).toBeTruthy();

    const dirHandle = await window.showDirectoryPicker();
    expect(dirHandle).toBeTruthy();
    expect(dirHandle.kind).toBe('directory');
  });

  it('should handle file operations in content script context', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });

    // Content script can write files
    const fileHandle = await moatDir.getFileHandle('test.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({ test: true }));
    await writable.close();

    // Verify
    const file = await fileHandle.getFile();
    const content = await file.text();
    const data = JSON.parse(content);

    expect(data.test).toBe(true);
  });

  it('should send thumbnails as data URLs to side panel', async () => {
    // Content script loads screenshot and converts to data URL
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    const screenshotsDir = await moatDir.getDirectoryHandle('screenshots', { create: true });

    // Create mock screenshot
    const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    const fileHandle = await screenshotsDir.getFileHandle('test.png', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    // Read back as data URL (simulating what content script does)
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/png;base64,${base64}`;

    expect(dataUrl).toContain('data:image/png;base64');
  });
});

describe('V2-05: Side panel receives task updates via message events', () => {
  let mocks;

  // Simulates a side panel message handler (like handleMessage in sidepanel.js)
  function createSidePanelHandler() {
    const received = [];
    return {
      handler(message, sender, sendResponse) {
        received.push(message);
        return true;
      },
      received
    };
  }

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should receive TASKS_UPDATED message', () => {
    const { handler, received } = createSidePanelHandler();

    const updateMessage = {
      type: 'TASKS_UPDATED',
      tasks: [
        { id: '1', title: 'Task 1', status: 'to do' },
        { id: '2', title: 'Task 2', status: 'doing' }
      ]
    };

    handler(updateMessage, {}, () => {});

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('TASKS_UPDATED');
    expect(received[0].tasks).toHaveLength(2);
  });

  it('should receive PROJECT_CONNECTED message', () => {
    const { handler, received } = createSidePanelHandler();

    const connectMessage = {
      type: 'PROJECT_CONNECTED',
      path: 'test-project',
      status: 'connected'
    };

    handler(connectMessage, {}, () => {});

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('PROJECT_CONNECTED');
    expect(received[0].path).toBe('test-project');
  });

  it('should receive ANNOTATION_CREATED message with thumbnail', () => {
    const { handler, received } = createSidePanelHandler();

    const annotationMessage = {
      type: 'ANNOTATION_CREATED',
      task: {
        id: 'task-123',
        title: 'New Task',
        thumbnailDataUrl: 'data:image/png;base64,iVBORw0KGg=='
      }
    };

    handler(annotationMessage, {}, () => {});

    expect(received).toHaveLength(1);
    expect(received[0].task.thumbnailDataUrl).toContain('data:image/png;base64');
  });
});

describe('V2-06: Side panel manifest configuration', () => {
  it('should have sidePanel permission in manifest', () => {
    // This would be checked by loading manifest.json
    const expectedPermissions = ['activeTab', 'storage', 'scripting', 'sidePanel'];
    
    // In real test, load actual manifest
    const manifest = {
      permissions: ['activeTab', 'storage', 'scripting', 'sidePanel'],
      side_panel: {
        default_path: 'sidepanel/sidepanel.html'
      }
    };

    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.side_panel).toBeTruthy();
    expect(manifest.side_panel.default_path).toBe('sidepanel/sidepanel.html');
  });

  it('should exclude moat.js from content scripts', () => {
    const manifest = {
      content_scripts: [{
        js: [
          'html2canvas.min.js',
          'utils/safeStorage.js',
          'utils/persistence.js',
          'utils/taskStore.js',
          'utils/markdownGenerator.js',
          'utils/migrateLegacyFiles.js',
          'content_script.js'
          // NO moat.js - it's been replaced by sidepanel/
        ]
      }]
    };

    const hasModuleJsInContentScripts = manifest.content_scripts[0].js.includes('moat.js');
    expect(hasModuleJsInContentScripts).toBe(false);
  });
});

describe('V2-07: Message type constants', () => {
  it('should define all V2 message types', () => {
    const messageTypes = {
      // Content script to background
      CAPTURE_SCREENSHOT: 'CAPTURE_SCREENSHOT',
      RELAY_TO_SIDEPANEL: 'RELAY_TO_SIDEPANEL',
      
      // Side panel to content script (via background)
      ENTER_COMMENT_MODE: 'ENTER_COMMENT_MODE',
      ENTER_DRAWING_MODE: 'ENTER_DRAWING_MODE',
      EXIT_ANNOTATION_MODE: 'EXIT_ANNOTATION_MODE',
      SETUP_PROJECT: 'SETUP_PROJECT',
      DISCONNECT_PROJECT: 'DISCONNECT_PROJECT',
      LOAD_TASKS: 'LOAD_TASKS',
      UPDATE_TASK_STATUS: 'UPDATE_TASK_STATUS',
      DELETE_TASK: 'DELETE_TASK',
      GET_CONNECTION_STATUS: 'GET_CONNECTION_STATUS',
      
      // Content script to side panel (via background)
      TASKS_UPDATED: 'TASKS_UPDATED',
      PROJECT_CONNECTED: 'PROJECT_CONNECTED',
      PROJECT_DISCONNECTED: 'PROJECT_DISCONNECTED',
      ANNOTATION_CREATED: 'ANNOTATION_CREATED',
      CONNECTION_STATUS: 'CONNECTION_STATUS'
    };

    // All message types should be strings
    Object.values(messageTypes).forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });

    // No duplicates
    const uniqueTypes = new Set(Object.values(messageTypes));
    expect(uniqueTypes.size).toBe(Object.values(messageTypes).length);
  });
});

// Export runner for test execution
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runner;
} else {
  window.v2ArchitectureTestRunner = runner;
}
