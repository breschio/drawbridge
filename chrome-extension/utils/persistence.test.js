/**
 * Moat Persistence Tests
 * 
 * Tests for the MoatPersistence utility that handles storing and restoring
 * directory handles using IndexedDB.
 */

// Mock IndexedDB for testing
class MockIDBDatabase {
  constructor() {
    this.objectStoreNames = { contains: () => false };
    this.stores = new Map();
  }

  transaction(stores, mode) {
    return new MockIDBTransaction(this.stores);
  }

  createObjectStore(name, options) {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }
}

class MockIDBTransaction {
  constructor(stores) {
    this.stores = stores;
  }

  objectStore(name) {
    return this.stores.get(name) || new MockIDBObjectStore();
  }
}

class MockIDBObjectStore {
  constructor() {
    this.data = new Map();
  }

  createIndex() {
    return this;
  }

  put(value) {
    this.data.set(value.id, value);
    return { 
      onsuccess: null,
      onerror: null,
      result: value
    };
  }

  get(id) {
    const result = this.data.get(id);
    return { 
      onsuccess: null,
      onerror: null,
      result
    };
  }

  delete(id) {
    this.data.delete(id);
    return { 
      onsuccess: null,
      onerror: null
    };
  }

  getAll() {
    return { 
      onsuccess: null,
      onerror: null,
      result: Array.from(this.data.values())
    };
  }
}

class MockIDBRequest {
  constructor(result = null, error = null) {
    this.result = result;
    this.error = error;
    this.onsuccess = null;
    this.onerror = null;
    
    // Simulate async behavior
    setTimeout(() => {
      if (error) {
        this.onerror && this.onerror({ target: this });
      } else {
        this.onsuccess && this.onsuccess({ target: this });
      }
    }, 0);
  }
}

// Mock Directory Handle
class MockDirectoryHandle {
  constructor(name = 'test-project') {
    this.name = name;
    this.kind = 'directory';
  }

  async queryPermission() {
    return 'granted';
  }

  async requestPermission() {
    return 'granted';
  }

  async getDirectoryHandle(name, options) {
    if (name === '.moat') {
      return new MockDirectoryHandle('.moat');
    }
    throw new Error('Directory not found');
  }

  values() {
    return {
      async next() {
        return { done: true };
      }
    };
  }
}

// Test setup
function setupMockEnvironment() {
  // Mock IndexedDB
  global.indexedDB = {
    open: (name, version) => {
      const db = new MockIDBDatabase();
      return new MockIDBRequest(db);
    }
  };

  // Mock window
  global.window = {
    location: { origin: 'http://localhost:3000' },
    showDirectoryPicker: () => Promise.resolve(new MockDirectoryHandle()),
    MoatPersistence: null,
    moatPersistence: null
  };

  // Load the persistence module
  require('./persistence.js');
  
  return {
    persistence: global.window.moatPersistence,
    mockDirectoryHandle: new MockDirectoryHandle()
  };
}

// Tests
describe('MoatPersistence', () => {
  let persistence;
  let mockDirectoryHandle;

  beforeEach(() => {
    const setup = setupMockEnvironment();
    persistence = setup.persistence;
    mockDirectoryHandle = setup.mockDirectoryHandle;
  });

  test('should support feature detection', () => {
    // Mock supported environment
    global.window.showDirectoryPicker = () => {};
    global.indexedDB = {};
    
    expect(global.window.MoatPersistence.isSupported()).toBe(true);
    
    // Mock unsupported environment
    delete global.window.showDirectoryPicker;
    expect(global.window.MoatPersistence.isSupported()).toBe(false);
  });

  test('should initialize IndexedDB correctly', async () => {
    const result = await persistence.initialize();
    expect(result).toBeDefined();
  });

  test('should persist project connection', async () => {
    const result = await persistence.persistProjectConnection(
      mockDirectoryHandle,
      'test-project'
    );
    expect(result).toBe(true);
  });

  test('should restore project connection', async () => {
    // First store a connection
    await persistence.persistProjectConnection(
      mockDirectoryHandle,
      'test-project'
    );

    // Then restore it
    const result = await persistence.restoreProjectConnection();
    expect(result.success).toBe(true);
    expect(result.path).toBe('test-project');
    expect(result.directoryHandle).toBeDefined();
  });

  test('should handle permission verification', async () => {
    const hasPermission = await persistence.verifyPermission(mockDirectoryHandle);
    expect(hasPermission).toBe(true);
  });

  test('should handle permission requests', async () => {
    const permissionGranted = await persistence.requestPermission(mockDirectoryHandle);
    expect(permissionGranted).toBe(true);
  });

  test('should test directory access', async () => {
    const isAccessible = await persistence.testDirectoryAccess(mockDirectoryHandle);
    expect(isAccessible).toBe(true);
  });

  test('should handle missing connections gracefully', async () => {
    const result = await persistence.restoreProjectConnection();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('No stored connection');
  });

  test('should clean up old handles', async () => {
    // Store a connection
    await persistence.persistProjectConnection(
      mockDirectoryHandle,
      'old-project'
    );

    // Clean up handles older than 0ms (everything)
    const cleaned = await persistence.cleanupOldHandles(0);
    expect(cleaned.length).toBeGreaterThan(0);
  });

  test('should remove stored connections', async () => {
    // Store a connection
    await persistence.persistProjectConnection(
      mockDirectoryHandle,
      'removable-project'
    );

    // Remove it
    const removed = await persistence.removeDirectoryHandle(
      `project_${global.window.location.origin}`
    );
    expect(removed).toBe(true);

    // Verify it's gone
    const result = await persistence.restoreProjectConnection();
    expect(result.success).toBe(false);
  });

  test('should handle invalid directory handles', async () => {
    try {
      await persistence.storeDirectoryHandle('test', null);
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('Invalid directory handle');
    }
  });

  test('should get all stored handles', async () => {
    await persistence.persistProjectConnection(
      mockDirectoryHandle,
      'project1'
    );

    const handles = await persistence.getAllHandles();
    expect(Array.isArray(handles)).toBe(true);
  });
});

// Integration test
describe('MoatPersistence Integration', () => {
  test('should work with complete workflow', async () => {
    const { persistence, mockDirectoryHandle } = setupMockEnvironment();

    // 1. Check initial state (no connection)
    let result = await persistence.restoreProjectConnection();
    expect(result.success).toBe(false);

    // 2. Store a connection
    const stored = await persistence.persistProjectConnection(
      mockDirectoryHandle,
      'integration-test'
    );
    expect(stored).toBe(true);

    // 3. Restore the connection
    result = await persistence.restoreProjectConnection();
    expect(result.success).toBe(true);
    expect(result.path).toBe('integration-test');

    // 4. Verify permission still works
    const hasPermission = await persistence.verifyPermission(result.directoryHandle);
    expect(hasPermission).toBe(true);

    // 5. Clean up
    const removed = await persistence.removeDirectoryHandle(
      `project_${global.window.location.origin}`
    );
    expect(removed).toBe(true);

    // 6. Verify it's gone
    result = await persistence.restoreProjectConnection();
    expect(result.success).toBe(false);
  });
});

console.log('✅ MoatPersistence tests defined successfully');

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MockDirectoryHandle,
    setupMockEnvironment
  };
} 