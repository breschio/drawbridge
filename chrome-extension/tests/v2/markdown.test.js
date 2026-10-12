/**
 * Markdown File Generation Tests
 * Tests for JTBD-57 through JTBD-66
 */

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

describe('JTBD-57: System generates markdown from task array', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should generate valid markdown structure', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const tasks = [
      {
        id: 'task-1',
        title: 'Test Task',
        comment: 'This is a test task comment',
        selector: '.test-button',
        status: 'to do',
        timestamp: Date.now()
      }
    ];

    const markdown = window.MoatMarkdownGenerator.generateMarkdownFromTasks(tasks);

    expect(markdown).toContain('# Moat Tasks');
    expect(markdown).toContain('**Total**: 1');
    expect(markdown).toContain('Test Task');
  });

  it('should handle empty task array', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const markdown = window.MoatMarkdownGenerator.generateMarkdownFromTasks([]);

    expect(markdown).toContain('# Moat Tasks');
    expect(markdown).toContain('**Total**: 0');
    expect(markdown).toContain('press "F" to begin making annotations');
  });
});

describe('JTBD-60: System displays task summary statistics', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should calculate and display task statistics', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const tasks = [
      { id: '1', title: 'Task 1', comment: 'Test 1', selector: '.test1', status: 'to do', timestamp: 1 },
      { id: '2', title: 'Task 2', comment: 'Test 2', selector: '.test2', status: 'doing', timestamp: 2 },
      { id: '3', title: 'Task 3', comment: 'Test 3', selector: '.test3', status: 'done', timestamp: 3 }
    ];

    const markdown = window.MoatMarkdownGenerator.generateMarkdownFromTasks(tasks);

    expect(markdown).toContain('**Total**: 3');
    expect(markdown).toContain('**To Do**: 1');
    expect(markdown).toContain('**Doing**: 1');
    expect(markdown).toContain('**Done**: 1');
  });
});

describe('JTBD-61: System converts status to checkbox format', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should convert statuses to correct checkbox format', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    expect(window.MoatMarkdownGenerator.statusToCheckbox('to do')).toBe('[ ]');
    expect(window.MoatMarkdownGenerator.statusToCheckbox('doing')).toBe('[~]');
    expect(window.MoatMarkdownGenerator.statusToCheckbox('done')).toBe('[x]');
  });
});

describe('JTBD-62: System truncates long comments in markdown', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should truncate comments longer than 60 characters', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const longComment = 'This is a very long comment that should definitely be truncated because it exceeds the maximum length';
    const truncated = window.MoatMarkdownGenerator.truncateComment(longComment, 60);

    expect(truncated.length).toBeLessThanOrEqual(60);
    expect(truncated).toContain('...');
  });

  it('should not truncate short comments', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const shortComment = 'Short comment';
    const result = window.MoatMarkdownGenerator.truncateComment(shortComment, 60);

    expect(result).toBe('Short comment');
    expect(result).not.toContain('...');
  });
});

describe('JTBD-63: System numbers tasks sequentially', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should number tasks starting from 1', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const tasks = [
      { id: '1', title: 'Task 1', comment: 'Test 1', selector: '.test1', status: 'to do', timestamp: 1 },
      { id: '2', title: 'Task 2', comment: 'Test 2', selector: '.test2', status: 'to do', timestamp: 2 },
      { id: '3', title: 'Task 3', comment: 'Test 3', selector: '.test3', status: 'to do', timestamp: 3 }
    ];

    const markdown = window.MoatMarkdownGenerator.generateMarkdownFromTasks(tasks);

    expect(markdown).toContain('1. [ ] Task 1');
    expect(markdown).toContain('2. [ ] Task 2');
    expect(markdown).toContain('3. [ ] Task 3');
  });
});

describe('JTBD-64: System includes timestamp in markdown footer', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should include generation timestamp', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const tasks = [];
    const markdown = window.MoatMarkdownGenerator.generateMarkdownFromTasks(tasks);

    expect(markdown).toContain('_Generated:');
    expect(markdown).toContain('_Source: moat-tasks-detail.json_');
  });
});

describe('JTBD-66: System sorts tasks chronologically in markdown', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should sort tasks by timestamp (oldest first)', () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const tasks = [
      { id: '3', title: 'Task 3', comment: 'Third', selector: '.test3', status: 'to do', timestamp: 3000 },
      { id: '1', title: 'Task 1', comment: 'First', selector: '.test1', status: 'to do', timestamp: 1000 },
      { id: '2', title: 'Task 2', comment: 'Second', selector: '.test2', status: 'to do', timestamp: 2000 }
    ];

    const markdown = window.MoatMarkdownGenerator.generateMarkdownFromTasks(tasks);

    // Verify order in markdown
    const task1Index = markdown.indexOf('Task 1');
    const task2Index = markdown.indexOf('Task 2');
    const task3Index = markdown.indexOf('Task 3');

    expect(task1Index).toBeLessThan(task2Index);
    expect(task2Index).toBeLessThan(task3Index);
  });
});

describe('JTBD-58: System writes markdown to file', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should write markdown content to file', async () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    window.directoryHandle = moatDir;

    const markdownContent = '# Test Markdown\n\nTest content';
    await window.MoatMarkdownGenerator.writeMarkdownToFile(markdownContent);

    // Verify file was written
    const fileHandle = await moatDir.getFileHandle('moat-tasks.md');
    const file = await fileHandle.getFile();
    const content = await file.text();

    expect(content).toBe(markdownContent);
  });
});

describe('JTBD-59: System rebuilds markdown file completely', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should rebuild markdown file from task array', async () => {
    if (!window.MoatMarkdownGenerator) {
      throw new Error('MarkdownGenerator module not loaded — check run-all.js module setup');
    }

    const dirHandle = await window.showDirectoryPicker();
    const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
    window.directoryHandle = moatDir;

    const tasks = [
      {
        id: 'task-1',
        title: 'Test Task',
        comment: 'Test comment',
        selector: '.test',
        status: 'to do',
        timestamp: Date.now()
      }
    ];

    await window.MoatMarkdownGenerator.rebuildMarkdownFile(tasks);

    // Verify file content
    const fileHandle = await moatDir.getFileHandle('moat-tasks.md');
    const file = await fileHandle.getFile();
    const content = await file.text();

    expect(content).toContain('# Moat Tasks');
    expect(content).toContain('Test Task');
    expect(content).toContain('**Total**: 1');
  });
});

// Export runner for test execution
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runner;
} else {
  window.markdownTestRunner = runner;
}
