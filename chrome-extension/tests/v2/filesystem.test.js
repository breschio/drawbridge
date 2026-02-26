/**
 * File System & Persistence Tests
 * Tests for JTBD-101 through JTBD-111
 */

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

describe('JTBD-101: System reads JSON file from directory', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should read JSON file content', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    // Write test data
    const testData = { test: 'data' };
    const fileHandle = await moatDir.getFileHandle('test.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(testData));
    await writable.close();
    
    // Read it back
    const file = await fileHandle.getFile();
    const content = await file.text();
    const parsed = JSON.parse(content);
    
    expect(parsed.test).toBe('data');
  });

  it('should handle empty JSON file', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    const fileHandle = await moatDir.getFileHandle('empty.json', { create: true });
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    expect(content).toBe('');
  });
});

describe('JTBD-102: System writes JSON file to directory', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should write JSON data to file', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    const data = { foo: 'bar', count: 42 };
    const fileHandle = await moatDir.getFileHandle('output.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
    
    // Verify
    const file = await fileHandle.getFile();
    const content = await file.text();
    const parsed = JSON.parse(content);
    
    expect(parsed.foo).toBe('bar');
    expect(parsed.count).toBe(42);
  });
});

describe('JTBD-103: System creates file if it does not exist', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should create file with create:true option', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    // File does not exist yet
    const fileHandle = await moatDir.getFileHandle('new-file.json', { create: true });
    
    expect(fileHandle).toBeTruthy();
    expect(fileHandle.kind).toBe('file');
    expect(fileHandle.name).toBe('new-file.json');
  });

  it('should throw error if file doesn\'t exist and create:false', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    try {
      await moatDir.getFileHandle('non-existent.json', { create: false });
      throw new Error('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('not found');
    }
  });
});

describe('JTBD-104: System truncates file before writing', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should overwrite existing content with keepExistingData:false', async () => {
    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    const fileHandle = await moatDir.getFileHandle('overwrite.json', { create: true });
    
    // Write initial content
    let writable = await fileHandle.createWritable();
    await writable.write('old content that should be overwritten');
    await writable.close();
    
    // Overwrite with truncation
    writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write('new content');
    await writable.close();
    
    // Verify
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    expect(content).toBe('new content');
    expect(content).not.toContain('old content');
  });
});

describe('JTBD-106: System stores directory handle in IndexedDB', () => {
  let mocks;
  let persistence;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatPersistence) {
      persistence = new window.MoatPersistence();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should store directory handle with metadata', async () => {
    if (!persistence) {
      throw new Error('Persistence module not loaded — check run-all.js module setup');
    }

    const dirHandle = await window.showDirectoryPicker();
    const projectId = 'test-project-123';
    const metadata = {
      path: 'test-project',
      origin: 'http://localhost:3000',
      connectedAt: new Date().toISOString()
    };
    
    const success = await persistence.storeDirectoryHandle(projectId, dirHandle, metadata);
    
    expect(success).toBe(true);
  });
});

describe('JTBD-107: System retrieves directory handle from IndexedDB', () => {
  let mocks;
  let persistence;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatPersistence) {
      persistence = new window.MoatPersistence();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should retrieve stored directory handle', async () => {
    if (!persistence) {
      throw new Error('Persistence module not loaded — check run-all.js module setup');
    }

    const dirHandle = await window.showDirectoryPicker();
    const projectId = 'test-project-123';
    
    // Store first
    await persistence.storeDirectoryHandle(projectId, dirHandle, { path: 'test' });
    
    // Retrieve
    const retrieved = await persistence.getDirectoryHandle(projectId);
    
    expect(retrieved).toBeTruthy();
    expect(retrieved.handle).toBeTruthy();
    expect(retrieved.path).toBe('test');
  });

  it('should return null for non-existent handle', async () => {
    if (!persistence) {
      throw new Error('Persistence module not loaded — check run-all.js module setup');
    }

    const retrieved = await persistence.getDirectoryHandle('non-existent-id');
    
    expect(retrieved).toBeNull();
  });
});

describe('JTBD-108: System verifies stored handle is still valid', () => {
  let mocks;
  let persistence;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatPersistence) {
      persistence = new window.MoatPersistence();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should test directory access', async () => {
    if (!persistence) {
      throw new Error('Persistence module not loaded — check run-all.js module setup');
    }

    const dirHandle = await window.showDirectoryPicker();
    const isValid = await persistence.testDirectoryAccess(dirHandle);
    
    expect(isValid).toBe(true);
  });

  it('should return false for invalid handle', async () => {
    if (!persistence) {
      throw new Error('Persistence module not loaded — check run-all.js module setup');
    }

    const isValid = await persistence.testDirectoryAccess(null);
    
    expect(isValid).toBe(false);
  });
});

describe('JTBD-110: System removes invalid handles from storage', () => {
  let mocks;
  let persistence;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatPersistence) {
      persistence = new window.MoatPersistence();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should remove directory handle from storage', async () => {
    if (!persistence) {
      throw new Error('Persistence module not loaded — check run-all.js module setup');
    }

    const dirHandle = await window.showDirectoryPicker();
    const projectId = 'test-project-to-remove';
    
    // Store first
    await persistence.storeDirectoryHandle(projectId, dirHandle, {});
    
    // Verify it's there
    let retrieved = await persistence.getDirectoryHandle(projectId);
    expect(retrieved).toBeTruthy();
    
    // Remove it
    await persistence.removeDirectoryHandle(projectId);
    
    // Verify it's gone
    retrieved = await persistence.getDirectoryHandle(projectId);
    expect(retrieved).toBeNull();
  });
});

// Export runner for test execution
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runner;
} else {
  window.filesystemTestRunner = runner;
}
