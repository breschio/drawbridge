/**
 * Task Management (CRUD) Tests
 * Tests for JTBD-42 through JTBD-56
 */

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

describe('JTBD-42: System adds task to TaskStore', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should add a new task', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const taskData = {
      title: 'Test Task',
      comment: 'This is a test comment',
      selector: '.test-element',
      boundingRect: { x: 0, y: 0, w: 100, h: 50 }
    };

    const task = taskStore.addTask(taskData);

    expect(task).toBeTruthy();
    expect(task.id).toBeTruthy();
    expect(task.title).toBe('Test Task');
    expect(task.comment).toBe('This is a test comment');
    expect(task.status).toBe('to do');
  });

  it('should generate UUID for task ID', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(task.id.match(uuidPattern)).toBeTruthy();
  });

  it('should add timestamp to task', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const beforeTime = Date.now();
    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });
    const afterTime = Date.now();

    expect(task.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(task.timestamp).toBeLessThanOrEqual(afterTime);
  });
});

describe('JTBD-43: System validates task object structure', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should require title and comment', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    expect(() => {
      taskStore.addTask({ title: 'Test' }); // Missing comment
    }).toThrow();

    expect(() => {
      taskStore.addTask({ comment: 'Test comment' }); // Missing title
    }).toThrow();
  });

  it('should validate task status values', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });

    // Valid status change
    const updated = taskStore.updateTaskStatus(task.id, 'doing');
    expect(updated.status).toBe('doing');

    // Invalid status change
    expect(() => {
      taskStore.updateTaskStatus(task.id, 'invalid-status');
    }).toThrow();
  });

  it('should allow null selector for freeform rectangles', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Freeform Task',
      comment: 'Rectangle annotation',
      selector: null,
      boundingRect: { x: 10, y: 10, w: 100, h: 100 }
    });

    expect(task.selector).toBeNull();
    expect(task.boundingRect).toBeTruthy();
  });
});

describe('JTBD-44: System deduplicates identical tasks', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should detect duplicate tasks with same selector and comment', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const taskData = {
      title: 'Duplicate Test',
      comment: 'Same comment',
      selector: '.same-selector'
    };

    const task1 = taskStore.addTask(taskData);
    const task2 = taskStore.addTask(taskData);

    // Should return same task (deduplicated)
    expect(task2.id).toBe(task1.id);
    expect(taskStore.getAllTasks()).toHaveLength(1);
  });

  it('should not deduplicate completed tasks', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const taskData = {
      title: 'Test',
      comment: 'Same comment',
      selector: '.same-selector'
    };

    const task1 = taskStore.addTask(taskData);
    taskStore.updateTaskStatus(task1.id, 'done');

    const task2 = taskStore.addTask(taskData);

    // Should create new task since first is done
    expect(task2.id).not.toBe(task1.id);
    expect(taskStore.getAllTasks()).toHaveLength(2);
  });

  it('should detect duplicate freeform rectangles', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const taskData = {
      title: 'Rectangle',
      comment: 'Same comment',
      selector: null,
      boundingRect: { x: 10, y: 10, w: 100, h: 100 }
    };

    const task1 = taskStore.addTask(taskData);
    const task2 = taskStore.addTask(taskData);

    // Should detect as duplicate (within 10px threshold)
    expect(task2.id).toBe(task1.id);
    expect(taskStore.getAllTasks()).toHaveLength(1);
  });
});

describe('JTBD-48: System updates task status', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should update task status', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });

    expect(task.status).toBe('to do');

    taskStore.updateTaskStatus(task.id, 'doing');
    expect(task.status).toBe('doing');

    taskStore.updateTaskStatus(task.id, 'done');
    expect(task.status).toBe('done');
  });

  it('should add lastModified timestamp on status update', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });

    const beforeUpdate = Date.now();
    taskStore.updateTaskStatus(task.id, 'doing');
    const afterUpdate = Date.now();

    expect(task.lastModified).toBeTruthy();
    expect(task.lastModified).toBeGreaterThanOrEqual(beforeUpdate);
    expect(task.lastModified).toBeLessThanOrEqual(afterUpdate);
  });

  it('should return null when updating non-existent task', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const result = taskStore.updateTaskStatus('non-existent-id', 'doing');
    expect(result).toBeNull();
  });
});

describe('JTBD-51: System gets task by ID', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should retrieve task by ID', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });

    const retrieved = taskStore.getTaskById(task.id);

    expect(retrieved).toBeTruthy();
    expect(retrieved.id).toBe(task.id);
    expect(retrieved.title).toBe('Test');
  });

  it('should return null for non-existent ID', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const retrieved = taskStore.getTaskById('non-existent-id');
    expect(retrieved).toBeNull();
  });
});

describe('JTBD-52: System gets all tasks sorted by timestamp', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should return tasks sorted newest first', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task1 = taskStore.addTask({
      title: 'Task 1',
      comment: 'First task',
      selector: '.test1'
    });
    // Ensure task1 has an earlier timestamp
    task1.timestamp = Date.now() - 1000;

    const task2 = taskStore.addTask({
      title: 'Task 2',
      comment: 'Second task',
      selector: '.test2'
    });

    const tasks = taskStore.getAllTasks();

    expect(tasks).toHaveLength(2);
    // Newest first (reverse chronological)
    expect(tasks[0].id).toBe(task2.id);
    expect(tasks[1].id).toBe(task1.id);
  });
});

describe('JTBD-53: System gets tasks in chronological order', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should return tasks sorted oldest first', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task1 = taskStore.addTask({
      title: 'Task 1',
      comment: 'First task',
      selector: '.test1'
    });

    const task2 = taskStore.addTask({
      title: 'Task 2',
      comment: 'Second task',
      selector: '.test2'
    });

    const tasks = taskStore.getAllTasksChronological();

    expect(tasks).toHaveLength(2);
    // Oldest first (chronological)
    expect(tasks[0].id).toBe(task1.id);
    expect(tasks[1].id).toBe(task2.id);
  });
});

describe('JTBD-54: System calculates task statistics', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should count tasks by status', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task1 = taskStore.addTask({
      title: 'Task 1',
      comment: 'Test 1',
      selector: '.test1'
    });

    const task2 = taskStore.addTask({
      title: 'Task 2',
      comment: 'Test 2',
      selector: '.test2'
    });

    const task3 = taskStore.addTask({
      title: 'Task 3',
      comment: 'Test 3',
      selector: '.test3'
    });

    taskStore.updateTaskStatus(task2.id, 'doing');
    taskStore.updateTaskStatus(task3.id, 'done');

    const stats = taskStore.getTaskStats();

    expect(stats.total).toBe(3);
    expect(stats['to do']).toBe(1);
    expect(stats['doing']).toBe(1);
    expect(stats['done']).toBe(1);
  });

  it('should handle empty task list', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const stats = taskStore.getTaskStats();

    expect(stats.total).toBe(0);
    expect(stats['to do']).toBe(0);
    expect(stats['doing']).toBe(0);
    expect(stats['done']).toBe(0);
  });
});

describe('JTBD-46: System saves tasks to JSON file', () => {
  let taskStore;
  let mocks;

  beforeEach(async () => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
      const dirHandle = await window.showDirectoryPicker();
      const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });
      taskStore.initialize(moatDir);
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should save tasks to moat-tasks-detail.json', async () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    taskStore.addTask({
      title: 'Test Task',
      comment: 'Test comment',
      selector: '.test'
    });

    await taskStore.saveTasksToFile();

    // Verify file was written
    const fileHandle = await taskStore.directoryHandle.getFileHandle('moat-tasks-detail.json');
    const file = await fileHandle.getFile();
    const content = await file.text();
    const tasks = JSON.parse(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Test Task');
  });
});

describe('JTBD-50: System removes task by ID', () => {
  let taskStore;
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    if (window.MoatTaskStore) {
      taskStore = new window.MoatTaskStore.TaskStore();
    }
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should remove task from store', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const task = taskStore.addTask({
      title: 'Test',
      comment: 'Test comment',
      selector: '.test'
    });

    expect(taskStore.getAllTasks()).toHaveLength(1);

    const removed = taskStore.removeTask(task.id);

    expect(removed).toBe(true);
    expect(taskStore.getAllTasks()).toHaveLength(0);
  });

  it('should return false for non-existent task', () => {
    if (!taskStore) {
      throw new Error('TaskStore module not loaded — check run-all.js module setup');
    }

    const removed = taskStore.removeTask('non-existent-id');
    expect(removed).toBe(false);
  });
});

// Export runner for test execution
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runner;
} else {
  window.tasksTestRunner = runner;
}
