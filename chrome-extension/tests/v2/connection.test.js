/**
 * Connection & Project Setup Tests
 * Tests for JTBD-01 through JTBD-13
 */

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

// Load utility modules
const persistence = window.MoatPersistence ? new window.MoatPersistence() : null;

describe('JTBD-01: User can connect to a project directory', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should allow user to select a directory', async () => {
    const dirHandle = await window.showDirectoryPicker();
    
    expect(dirHandle).toBeTruthy();
    expect(dirHandle.kind).toBe('directory');
    expect(dirHandle.name).toBe('test-project');
  });

  it('should store directory handle reference', async () => {
    const dirHandle = await window.showDirectoryPicker();
    window.directoryHandle = dirHandle;
    
    expect(window.directoryHandle).toBeTruthy();
    expect(window.directoryHandle.name).toBe('test-project');
  });

  it('should handle user canceling directory picker', async () => {
    // Mock user canceling
    const originalPicker = window.showDirectoryPicker;
    window.showDirectoryPicker = async () => {
      throw new DOMException('User cancelled', 'AbortError');
    };

    try {
      await window.showDirectoryPicker();
      throw new Error('Should have thrown');
    } catch (error) {
      expect(error.name).toBe('AbortError');
    } finally {
      window.showDirectoryPicker = originalPicker;
    }
  });
});

describe('JTBD-02: System creates .moat/ subdirectory in selected project', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should create .moat directory if it does not exist', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const moatDir = await projectRoot.getDirectoryHandle('.moat', { create: true });
    
    expect(moatDir).toBeTruthy();
    expect(moatDir.kind).toBe('directory');
    expect(moatDir.name).toBe('.moat');
  });

  it('should not fail if .moat directory already exists', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const moatDir1 = await projectRoot.getDirectoryHandle('.moat', { create: true });
    const moatDir2 = await projectRoot.getDirectoryHandle('.moat', { create: true });
    
    expect(moatDir1).toBeTruthy();
    expect(moatDir2).toBeTruthy();
  });
});

describe('JTBD-03: System creates screenshots/ subdirectory proactively', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should create screenshots directory inside .moat', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const moatDir = await projectRoot.getDirectoryHandle('.moat', { create: true });
    const screenshotsDir = await moatDir.getDirectoryHandle('screenshots', { create: true });
    
    expect(screenshotsDir).toBeTruthy();
    expect(screenshotsDir.kind).toBe('directory');
    expect(screenshotsDir.name).toBe('screenshots');
  });

  it('should handle existing screenshots directory', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const moatDir = await projectRoot.getDirectoryHandle('.moat', { create: true });
    
    // Create once
    const screenshotsDir1 = await moatDir.getDirectoryHandle('screenshots', { create: true });
    // Create again (should not throw)
    const screenshotsDir2 = await moatDir.getDirectoryHandle('screenshots', { create: true });
    
    expect(screenshotsDir1).toBeTruthy();
    expect(screenshotsDir2).toBeTruthy();
  });
});

describe('JTBD-04: System deploys workflow templates to project', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should deploy drawbridge-workflow.md template', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const moatDir = await projectRoot.getDirectoryHandle('.moat', { create: true });
    
    // Simulate template deployment
    const templateContent = '# Drawbridge Workflow';
    const fileHandle = await moatDir.getFileHandle('drawbridge-workflow.md', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(templateContent);
    await writable.close();
    
    // Verify file was written
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    expect(content).toBe(templateContent);
  });

  it('should deploy README.md template', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const moatDir = await projectRoot.getDirectoryHandle('.moat', { create: true });
    
    const templateContent = '# Moat - Connected Project';
    const fileHandle = await moatDir.getFileHandle('README.md', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(templateContent);
    await writable.close();
    
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    expect(content).toBe(templateContent);
  });

  it('should deploy bridge.md to .claude/commands/', async () => {
    const projectRoot = await window.showDirectoryPicker();
    const claudeDir = await projectRoot.getDirectoryHandle('.claude', { create: true });
    const commandsDir = await claudeDir.getDirectoryHandle('commands', { create: true });
    
    const templateContent = '# Bridge Command';
    const fileHandle = await commandsDir.getFileHandle('bridge.md', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(templateContent);
    await writable.close();
    
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    expect(content).toBe(templateContent);
  });
});

describe('JTBD-05: System persists connection to IndexedDB', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should store directory handle in IndexedDB', async () => {
    if (!persistence) {
      console.log('⏭️  Persistence not available, skipping test');
      return;
    }

    const dirHandle = await window.showDirectoryPicker();
    const projectPath = 'test-project';
    
    const success = await persistence.persistProjectConnection(dirHandle, projectPath);
    
    expect(success).toBe(true);
  });

  it('should include metadata with stored handle', async () => {
    if (!persistence) {
      console.log('⏭️  Persistence not available, skipping test');
      return;
    }

    const dirHandle = await window.showDirectoryPicker();
    const projectPath = 'test-project';
    
    await persistence.persistProjectConnection(dirHandle, projectPath);
    
    // Retrieve and verify
    const projectId = `project_${window.location.origin}`;
    const stored = await persistence.getDirectoryHandle(projectId);
    
    expect(stored).toBeTruthy();
    expect(stored.path).toBe(projectPath);
    expect(stored.origin).toBe(window.location.origin);
  });
});

describe('JTBD-06: System restores connection from IndexedDB on page load', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should retrieve stored connection', async () => {
    if (!persistence) {
      console.log('⏭️  Persistence not available, skipping test');
      return;
    }

    // Store first
    const dirHandle = await window.showDirectoryPicker();
    await persistence.persistProjectConnection(dirHandle, 'test-project');
    
    // Restore
    const restored = await persistence.restoreProjectConnection();
    
    expect(restored.success).toBe(true);
    expect(restored.path).toBe('test-project');
    expect(restored.moatDirectory).toBeTruthy();
  });

  it('should return failure when no connection stored', async () => {
    if (!persistence) {
      console.log('⏭️  Persistence not available, skipping test');
      return;
    }

    const restored = await persistence.restoreProjectConnection();
    
    expect(restored.success).toBe(false);
    expect(restored.reason).toBeTruthy();
  });
});

describe('JTBD-07: System verifies directory handle permissions', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should verify readwrite permission', async () => {
    if (!persistence) {
      console.log('⏭️  Persistence not available, skipping test');
      return;
    }

    const dirHandle = await window.showDirectoryPicker();
    const hasPermission = await persistence.verifyPermission(dirHandle, 'readwrite');
    
    expect(hasPermission).toBe(true);
  });

  it('should request permission if not granted', async () => {
    if (!persistence) {
      console.log('⏭️  Persistence not available, skipping test');
      return;
    }

    const dirHandle = await window.showDirectoryPicker();
    const permission = await persistence.requestPermission(dirHandle, 'readwrite');
    
    expect(permission).toBe(true);
  });
});

describe('JTBD-13: System loads existing tasks on connection', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should load tasks from moat-tasks-detail.json', async () => {
    if (!window.MoatTaskStore) {
      console.log('⏭️  TaskStore not available, skipping test');
      return;
    }

    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    // Create sample tasks JSON
    const sampleTasks = [
      {
        id: 'task-1',
        title: 'Test Task',
        comment: 'This is a test task',
        selector: '.test-button',
        status: 'to do',
        timestamp: Date.now()
      }
    ];
    
    const fileHandle = await moatDir.getFileHandle('moat-tasks-detail.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(sampleTasks));
    await writable.close();
    
    // Load tasks
    const taskStore = new window.MoatTaskStore.TaskStore();
    taskStore.initialize(moatDir);
    await taskStore.loadTasksFromFile();
    
    const loadedTasks = taskStore.getAllTasks();
    
    expect(loadedTasks).toHaveLength(1);
    expect(loadedTasks[0].id).toBe('task-1');
    expect(loadedTasks[0].title).toBe('Test Task');
  });

  it('should handle empty tasks file', async () => {
    if (!window.MoatTaskStore) {
      console.log('⏭️  TaskStore not available, skipping test');
      return;
    }

    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    
    // Create empty file
    const fileHandle = await moatDir.getFileHandle('moat-tasks-detail.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write('');
    await writable.close();
    
    const taskStore = new window.MoatTaskStore.TaskStore();
    taskStore.initialize(moatDir);
    await taskStore.loadTasksFromFile();
    
    const loadedTasks = taskStore.getAllTasks();
    
    expect(loadedTasks).toHaveLength(0);
  });
});

// Export runner for test execution
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runner;
} else {
  window.connectionTestRunner = runner;
}
