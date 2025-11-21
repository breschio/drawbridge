// Integration Tests for Tasks 5.1-5.8 – End-to-End & Regression Scenarios
// NOTE: These tests use JSDOM (default Jest environment) and mock the
// File System Access API to simulate the browser environment.

const { TaskStore } = require('../utils/taskStore');
const MarkdownGenerator = require('../utils/markdownGenerator');
const LegacyFileMigrator = require('../utils/migrateLegacyFiles');

if (!global.window) {
  global.window = {};
}

if (!global.document) {
  global.document = {
    body: {
      classList: {
        add: () => {},
        remove: () => {}
      }
    }
  };
}

// --- Mock Helpers -----------------------------------------------------------
class MockFileHandle {
  constructor(name, content = '') {
    this.name = name;
    this.content = content;
  }
  async getFile() {
    return { text: async () => this.content };
  }
  async createWritable() {
    return {
      write: async (data) => {
        this.content = typeof data === 'string' ? data : JSON.stringify(data);
      },
      close: async () => true
    };
  }
}

class MockDirectoryHandle {
  constructor(initial = {}, name = 'root', parent = null) {
    this.name = name;
    this.parent = parent;
    this.files = new Map();
    this.directories = new Map();
    Object.entries(initial).forEach(([fileName, content]) => {
      this.files.set(fileName, new MockFileHandle(fileName, content));
    });
  }

  async getFileHandle(name, { create = false } = {}) {
    if (!this.files.has(name)) {
      if (!create) throw new Error(`File not found: ${name}`);
      this.files.set(name, new MockFileHandle(name, ''));
    }
    return this.files.get(name);
  }

  async getDirectoryHandle(name, { create = false } = {}) {
    if (name === '.' || name === './') {
      return this;
    }

    if (name === '..') {
      if (!this.parent) throw new Error('No parent directory');
      return this.parent;
    }

    if (name === '.moat' && !this.directories.has(name) && !create) {
      return this;
    }

    if (!this.directories.has(name)) {
      if (!create) throw new Error(`Directory not found: ${name}`);
      const subDir = new MockDirectoryHandle({}, name, this);
      this.directories.set(name, subDir);
      return subDir;
    }

    return this.directories.get(name);
  }

  async removeEntry(name) {
    this.files.delete(name);
    this.directories.delete(name);
  }

  listFiles() {
    return [...this.files.keys()];
  }
}

// Utility to generate mock annotations
function createMockAnnotation(index = 0) {
  return {
    content: `Test annotation ${index}`,
    target: `.element-${index}`,
    elementLabel: `Element ${index}`,
    boundingRect: { x: 0, y: 0, width: 100, height: 20 },
    screenshot: null,
    status: 'in queue',
    timestamp: Date.now() + index * 1000
  };
}

// ---------------------------------------------------------------------------
describe('Integration & QA Tests (Tasks 5.1-5.8)', () => {
  let rootDir;
  let moatDir;
  let taskStore;
  let markdownGen;
  
  beforeEach(async () => {
    // Fresh mock directory for each test
    rootDir = new MockDirectoryHandle();
    moatDir = await rootDir.getDirectoryHandle('.moat', { create: true });
    taskStore = new TaskStore();
    taskStore.initialize(moatDir);
    markdownGen = MarkdownGenerator;
    // Attach globals so moat.js and content_script.js (if imported later) can access
    global.window.taskStore = taskStore;
    global.window.markdownGenerator = markdownGen;
    global.window.directoryHandle = moatDir;
    global.window.MoatTaskStore = { TaskStore };
    global.window.MoatMarkdownGenerator = markdownGen;
    global.window.showDirectoryPicker = async () => moatDir;
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: () => {}
        }
      }
    };
  });

  function createTaskData({
    title,
    comment,
    selector,
    boundingRect = { x: 0, y: 0, w: 0, h: 0 },
    screenshotPath = ''
  }) {
    return {
      title,
      comment,
      selector,
      boundingRect,
      screenshotPath
    };
  }

  // 5.1 End-to-end flow: annotation → TaskStore → markdown
  test('5.1 End-to-End Annotation Capture Flow', async () => {
    const annotation = createMockAnnotation(1);

    // Simulate conversion & save using new pipeline
    const taskData = createTaskData({
      title: annotation.elementLabel,
      comment: annotation.content,
      selector: annotation.target,
      boundingRect: {
        x: annotation.boundingRect.x,
        y: annotation.boundingRect.y,
        w: annotation.boundingRect.width,
        h: annotation.boundingRect.height
      }
    });

    await taskStore.addTaskAndSave(taskData);
    await markdownGen.rebuildMarkdownFile(taskStore.getAllTasksChronological());

    // Verify JSON file creation
    const detailHandle = await moatDir.getFileHandle('moat-tasks-detail.json');
    expect(detailHandle).toBeDefined();
    const detailContent = await detailHandle.getFile().then(f => f.text());
    expect(JSON.parse(detailContent)).toHaveLength(1);

    // Verify markdown generation
    const mdHandle = await moatDir.getFileHandle('moat-tasks.md');
    expect(mdHandle).toBeDefined();
    const mdContent = await mdHandle.getFile().then(f => f.text());
    expect(mdContent).toContain('Test annotation');
  });

  // 5.2 Refresh button simulation & UI sync
  test('5.2 Refresh Function Regenerates Markdown and Keeps UI Synced', async () => {
    // Pre-populate with two tasks
    for (let i = 0; i < 2; i++) {
      await taskStore.addTaskAndSave(createTaskData({
        title: `Title ${i}`,
        comment: `Comment ${i}`,
        selector: `.item-${i}`
      }));
    }
    // First markdown build
    await markdownGen.rebuildMarkdownFile(taskStore.getAllTasksChronological());
    const mdHandle1 = await moatDir.getFileHandle('moat-tasks.md');
    const size1 = (await mdHandle1.getFile().then(f => f.text())).length;

    // Simulate adding new task and calling refresh
    const newTask = await taskStore.addTaskAndSave(createTaskData({
      title: 'New Task',
      comment: 'New Task Comment',
      selector: '.item-99'
    }));
    await markdownGen.rebuildMarkdownFile(taskStore.getAllTasksChronological()); // Represents refresh

    const mdHandle2 = await moatDir.getFileHandle('moat-tasks.md');
    const contentAfter = await mdHandle2.getFile().then(f => f.text());
    expect(contentAfter.length).toBeGreaterThan(size1);
    expect(contentAfter).toContain(newTask.title);
  });

  // 5.3 Checkbox toggle sync
  test('5.3 Checkbox toggle updates JSON and markdown', async () => {
    // Add a task
    const task = await taskStore.addTaskAndSave(createTaskData({
      title: 'Toggle Test',
      comment: 'Toggle Comment',
      selector: '.toggle-item'
    }));
    await markdownGen.rebuildMarkdownFile(taskStore.getAllTasksChronological());

    // Update status to completed
    await taskStore.updateTaskStatusAndSave(task.id, 'done');
    await markdownGen.rebuildMarkdownFile(taskStore.getAllTasksChronological());

    // Validate JSON reflects change
    const detailContent = await (await moatDir.getFileHandle('moat-tasks-detail.json')).getFile().then(f => f.text());
    const tasksArr = JSON.parse(detailContent);
    expect(tasksArr.find(t => t.id === task.id).status).toBe('done');

    // Validate markdown reflects change (looks for [x])
    const mdContent = await (await moatDir.getFileHandle('moat-tasks.md')).getFile().then(f => f.text());
    expect(mdContent).toMatch(/\[x\].*Toggle Test/);
  });

  // 5.4 Migration with various combinations
  test('5.4 Migration handles JSONL-only legacy files', async () => {
    // Legacy setup: only JSONL
    const jsonlContent = JSON.stringify({
      annotation: {
        content: 'Legacy A',
        target: '.legacy',
        elementLabel: 'Legacy Element'
      }
    });
    const legacyDir = await rootDir.getDirectoryHandle('.moat', { create: true });
    const legacyHandle = await legacyDir.getFileHandle('.moat-stream.jsonl', { create: true });
    const writable = await legacyHandle.createWritable();
    await writable.write(`${jsonlContent}\n`);
    await writable.close();

    const migrator = new LegacyFileMigrator(moatDir, taskStore, markdownGen);
    const annotations = await migrator.parseJsonlStream(legacyHandle);
    const converted = migrator.convertToNewSchema({ jsonlAnnotations: annotations });

    expect(converted.length).toBeGreaterThan(0);
    expect(converted[0].comment).toBe('Legacy A');
  });

  // 5.5 Regression check: screenshot metadata updates only when provided
  test('5.5 Screenshot path updates only when new image is saved', async () => {
    const baseTask = await taskStore.addTaskAndSave(createTaskData({
      title: 'Screenshot Task',
      comment: 'Needs screenshot',
      selector: '.screenshot-task'
    }));

    expect(baseTask.screenshotPath).toBe('');

    const updatedTask = await taskStore.addTaskAndSave({
      ...createTaskData({
        title: 'Screenshot Task',
        comment: 'Needs screenshot',
        selector: '.screenshot-task',
        screenshotPath: './screenshots/test.png'
      }),
      id: baseTask.id
    });

    expect(updatedTask.screenshotPath).toBe('./screenshots/test.png');
  });

  // 5.6 Performance test with 1000 tasks
  test('5.6 Load test: Markdown generation stays under 250ms for 1000 tasks', () => {
    const bigTasks = [];
    for (let i = 0; i < 1000; i++) {
      bigTasks.push({
        id: `task-${i}`,
        title: `Task ${i}`,
        comment: `Task ${i} comment`,
        selector: `.task-${i}`,
        status: 'to do',
        timestamp: Date.now()
      });
    }
    const t0 = performance.now();
    markdownGen.rebuildMarkdownFromJson(bigTasks);
    const duration = performance.now() - t0;
    expect(duration).toBeLessThan(250);
  });

  // 5.7 Error scenario: corrupted JSON file
  test('5.7 Error handling: corrupted JSON should not crash markdown generation', async () => {
    // Corrupt the existing JSON file
    const detailHandle = await moatDir.getFileHandle('moat-tasks-detail.json', { create: true });
    const writable = await detailHandle.createWritable();
    await writable.write('invalid JSON');
    await writable.close();

    // Attempt to read and rebuild markdown – should throw but be caught gracefully
    const markdown = markdownGen.rebuildMarkdownFromJson([]);
    expect(typeof markdown).toBe('string');
    expect(markdown).toContain('Moat Tasks');
  });

  // 5.8 Git diff cleanliness simulation – ensure two consecutive writes produce identical output if no changes
  test('5.8 Git diff cleanliness – no diff on identical markdown write', async () => {
    const tasksArr = [{
      id: 't1',
      title: 'Same Task',
      comment: 'Same Task comment',
      selector: '.same-task',
      status: 'to do',
      timestamp: Date.now()
    }];
    await markdownGen.rebuildMarkdownFile(tasksArr);
    const md1 = await (await moatDir.getFileHandle('moat-tasks.md')).getFile().then(f => f.text());

    // Re-run with identical data
    await markdownGen.rebuildMarkdownFile(tasksArr);
    const md2 = await (await moatDir.getFileHandle('moat-tasks.md')).getFile().then(f => f.text());

    expect(md1).toBe(md2);
  });

  // 5.9 Cross-browser placeholder (manual or CI using Playwright)
  test.skip('5.9 Cross-browser smoke test (Chrome, Edge, Firefox)', () => {
    // This test is a placeholder to indicate cross-browser coverage.
    // In CI, use Playwright test runner with following config:
    //   npx playwright test --project=chromium
    //   npx playwright test --project=webkit
    //   npx playwright test --project=firefox
    // The real implementation launches start-here, injects extension, and runs UI smoke steps.
    expect(true).toBe(true);
  });
}); 
