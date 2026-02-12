/**
 * Chrome API Mocks for Testing
 * 
 * Provides mock implementations of Chrome extension APIs and File System Access API
 * to enable testing without a browser extension environment.
 */

class ChromeMock {
  constructor() {
    this.runtime = {
      lastError: null,
      onMessage: {
        addListener: (callback) => {
          this._messageListeners = this._messageListeners || [];
          this._messageListeners.push(callback);
        },
        removeListener: (callback) => {
          if (this._messageListeners) {
            const index = this._messageListeners.indexOf(callback);
            if (index > -1) {
              this._messageListeners.splice(index, 1);
            }
          }
        }
      },
      sendMessage: (message, callback) => {
        // Simulate async response
        setTimeout(() => {
          if (message.type === 'CAPTURE_SCREENSHOT') {
            callback({
              success: true,
              dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            });
          } else {
            callback({ success: false, error: 'Unknown message type' });
          }
        }, 0);
      },
      getURL: (path) => {
        return `chrome-extension://mock-extension-id/${path}`;
      }
    };

    this.tabs = {
      captureVisibleTab: (windowId, options, callback) => {
        // Return a mock base64 image
        setTimeout(() => {
          callback('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        }, 0);
      },
      sendMessage: (tabId, message, callback) => {
        setTimeout(() => {
          callback({ success: true });
        }, 0);
      }
    };

    this.action = {
      _actionListeners: [],
      onClicked: {
        addListener: (callback) => {
          this.action._actionListeners.push(callback);
        }
      }
    };

    this.sidePanel = {
      open: async ({ tabId }) => {
        console.log(`Mock: Side panel opened for tab ${tabId}`);
        return Promise.resolve();
      },
      setOptions: async (options) => {
        console.log('Mock: Side panel options set', options);
        return Promise.resolve();
      },
      getOptions: async ({ tabId }) => {
        return Promise.resolve({ enabled: true, path: 'sidepanel/sidepanel.html' });
      }
    };

    this.storage = {
      local: {
        data: {},
        get: (keys, callback) => {
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach(key => {
              if (this.storage.local.data.hasOwnProperty(key)) {
                result[key] = this.storage.local.data[key];
              }
            });
          } else if (typeof keys === 'string') {
            if (this.storage.local.data.hasOwnProperty(keys)) {
              result[keys] = this.storage.local.data[keys];
            }
          }
          setTimeout(() => callback(result), 0);
        },
        set: (items, callback) => {
          Object.assign(this.storage.local.data, items);
          if (callback) setTimeout(callback, 0);
        },
        remove: (keys, callback) => {
          if (Array.isArray(keys)) {
            keys.forEach(key => delete this.storage.local.data[key]);
          } else {
            delete this.storage.local.data[keys];
          }
          if (callback) setTimeout(callback, 0);
        }
      }
    };
  }

  reset() {
    this.runtime.lastError = null;
    this.storage.local.data = {};
  }
}

/**
 * Mock File System Access API
 */
class FileSystemMock {
  constructor() {
    this.fileSystem = new Map();
  }

  /**
   * Mock file handle
   */
  createFileHandle(name, content = '') {
    return {
      kind: 'file',
      name,
      _content: content,
      
      async getFile() {
        return {
          name,
          size: this._content.length,
          type: 'application/json',
          text: async () => this._content,
          arrayBuffer: async () => new TextEncoder().encode(this._content).buffer,
          slice: () => new Blob([this._content])
        };
      },

      async createWritable(options = {}) {
        const fileHandle = this;
        const writable = {
          _buffer: options.keepExistingData ? fileHandle._content : '',
          
          async write(data) {
            if (typeof data === 'string') {
              this._buffer = data;
            } else if (data instanceof Blob) {
              this._buffer = await data.text();
            }
          },

          async close() {
            fileHandle._content = this._buffer;
          }
        };

        return writable;
      }
    };
  }

  /**
   * Mock directory handle
   */
  createDirectoryHandle(name, path = '/') {
    const fullPath = `${path}${name}/`;
    
    const handle = {
      kind: 'directory',
      name,
      _path: fullPath,
      _files: new Map(),
      _directories: new Map(),

      async getFileHandle(fileName, options = {}) {
        if (this._files.has(fileName)) {
          return this._files.get(fileName);
        }

        if (options.create) {
          const fileHandle = this.createFileHandle(fileName);
          this._files.set(fileName, fileHandle);
          return fileHandle;
        }

        throw new Error(`File not found: ${fileName}`);
      },

      async getDirectoryHandle(dirName, options = {}) {
        if (this._directories.has(dirName)) {
          return this._directories.get(dirName);
        }

        if (options.create) {
          const dirHandle = this.createDirectoryHandle(dirName, fullPath);
          this._directories.set(dirName, dirHandle);
          return dirHandle;
        }

        throw new Error(`Directory not found: ${dirName}`);
      },

      async queryPermission(options = {}) {
        return 'granted';
      },

      async requestPermission(options = {}) {
        return 'granted';
      },

      async removeEntry(name, options = {}) {
        if (this._files.has(name)) {
          this._files.delete(name);
          return;
        }
        if (this._directories.has(name)) {
          this._directories.delete(name);
          return;
        }
        throw new Error(`Entry not found: ${name}`);
      },

      async *values() {
        for (const file of this._files.values()) {
          yield file;
        }
        for (const dir of this._directories.values()) {
          yield dir;
        }
      },

      [Symbol.asyncIterator]() {
        return this.values();
      }
    };

    // Bind factory methods so nested handles work
    const self = this;
    handle.createFileHandle = (name, content) => self.createFileHandle(name, content);
    handle.createDirectoryHandle = (name, path) => self.createDirectoryHandle(name, path || fullPath);

    return handle;
  }

  /**
   * Mock showDirectoryPicker
   */
  async showDirectoryPicker(options = {}) {
    // Simulate user selecting a directory
    const dirHandle = this.createDirectoryHandle('test-project', '/');
    return dirHandle;
  }

  reset() {
    this.fileSystem.clear();
  }
}

/**
 * Mock IndexedDB for persistence testing
 */
class IndexedDBMock {
  constructor() {
    this.databases = new Map();
  }

  open(name, version) {
    return {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,

      result: {
        name,
        version,
        objectStoreNames: {
          contains: (storeName) => {
            return this.databases.get(name)?.stores.has(storeName) || false;
          }
        },
        createObjectStore: (storeName, options) => {
          if (!this.databases.has(name)) {
            this.databases.set(name, { stores: new Map() });
          }
          
          const store = {
            name: storeName,
            data: new Map(),
            indexes: new Map(),
            
            createIndex: (indexName, keyPath, options) => {
              this.indexes.set(indexName, { keyPath, options });
            }
          };

          this.databases.get(name).stores.set(storeName, store);
          return store;
        },

        transaction: (storeNames, mode) => {
          const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
          
          return {
            objectStore: (storeName) => {
              const db = this.databases.get(name);
              const store = db?.stores.get(storeName);

              return {
                get: (key) => ({
                  onsuccess: null,
                  onerror: null,
                  result: store?.data.get(key)
                }),

                put: (value) => ({
                  onsuccess: null,
                  onerror: null,
                  result: (() => {
                    store?.data.set(value.id, value);
                    return value.id;
                  })()
                }),

                delete: (key) => ({
                  onsuccess: null,
                  onerror: null,
                  result: (() => {
                    store?.data.delete(key);
                    return undefined;
                  })()
                }),

                getAll: () => ({
                  onsuccess: null,
                  onerror: null,
                  result: Array.from(store?.data.values() || [])
                })
              };
            }
          };
        }
      }
    };
  }

  deleteDatabase(name) {
    this.databases.delete(name);
  }

  reset() {
    this.databases.clear();
  }
}

/**
 * Setup global mocks
 */
function setupMocks() {
  const chromeMock = new ChromeMock();
  const fileSystemMock = new FileSystemMock();
  const indexedDBMock = new IndexedDBMock();

  // Set up global objects
  global.chrome = chromeMock;
  global.showDirectoryPicker = fileSystemMock.showDirectoryPicker.bind(fileSystemMock);
  global.indexedDB = indexedDBMock;

  // Mock window/document if not available
  if (typeof window === 'undefined') {
    global.window = {
      location: {
        href: 'http://localhost:3000/',
        origin: 'http://localhost:3000'
      },
      localStorage: {
        data: {},
        getItem: (key) => global.window.localStorage.data[key] || null,
        setItem: (key, value) => { global.window.localStorage.data[key] = value; },
        removeItem: (key) => { delete global.window.localStorage.data[key]; },
        clear: () => { global.window.localStorage.data = {}; }
      },
      dispatchEvent: (event) => {},
      addEventListener: (event, handler) => {},
      removeEventListener: (event, handler) => {},
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      fetch: async (url) => {
        // Mock fetch for template loading
        return {
          ok: true,
          status: 200,
          text: async () => '# Mock Template Content'
        };
      }
    };
  }

  if (typeof document === 'undefined') {
    global.document = {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
        classList: {
          add: () => {},
          remove: () => {}
        }
      },
      head: {
        appendChild: () => {}
      }
    };
  }

  return {
    chromeMock,
    fileSystemMock,
    indexedDBMock,
    reset: () => {
      chromeMock.reset();
      fileSystemMock.reset();
      indexedDBMock.reset();
      if (global.window?.localStorage) {
        global.window.localStorage.clear();
      }
    }
  };
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ChromeMock,
    FileSystemMock,
    IndexedDBMock,
    setupMocks
  };
} else {
  window.ChromeMock = ChromeMock;
  window.FileSystemMock = FileSystemMock;
  window.IndexedDBMock = IndexedDBMock;
  window.setupMocks = setupMocks;
}
