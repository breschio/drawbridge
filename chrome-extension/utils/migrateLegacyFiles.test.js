// Unit Tests for Legacy File Migration System
// Task 4.9: Write unit tests with sample legacy data files

const LegacyFileMigrator = require('./migrateLegacyFiles.js');

// Mock file system for testing
class MockFileHandle {
  constructor(name, content) {
    this.name = name;
    this.content = content;
  }

  async getFile() {
    return {
      text: async () => this.content
    };
  }
}

class MockDirectoryHandle {
  constructor() {
    this.files = new Map();
    this.directories = new Map();
  }

  async getFileHandle(name, options = {}) {
    if (this.files.has(name)) {
      return this.files.get(name);
    }
    if (options.create) {
      const handle = new MockFileHandle(name, '');
      this.files.set(name, handle);
      return handle;
    }
    throw new Error(`File not found: ${name}`);
  }

  async getDirectoryHandle(name, options = {}) {
    if (this.directories.has(name)) {
      return this.directories.get(name);
    }
    if (options.create) {
      const handle = new MockDirectoryHandle();
      this.directories.set(name, handle);
      return handle;
    }
    throw new Error(`Directory not found: ${name}`);
  }

  async removeEntry(name) {
    this.files.delete(name);
    this.directories.delete(name);
  }

  setFile(name, content) {
    this.files.set(name, new MockFileHandle(name, content));
  }
}

// Mock TaskStore for testing
class MockTaskStore {
  constructor() {
    this.tasks = [];
  }

  async addTask(task) {
    this.tasks.push(task);
    return task;
  }

  async getAllTasks() {
    return this.tasks;
  }
}

// Mock MarkdownGenerator for testing
class MockMarkdownGenerator {
  constructor() {
    this.lastGenerated = null;
  }

  async rebuildMarkdownFromJson(tasks) {
    this.lastGenerated = tasks;
    return true;
  }
}

// Sample legacy data for testing
const SAMPLE_JSONL_CONTENT = `
{"annotation":{"content":"Fix the header alignment","target":"header.main-header","elementLabel":"Main Header","timestamp":1640995200000},"formatting":{"cursorPrompt":"Fix header alignment"}}
{"annotation":{"content":"Add dark mode toggle","target":"button.theme-toggle","elementLabel":"Theme Toggle","timestamp":1640995300000},"formatting":{"cursorPrompt":"Add dark mode"}}
{"type":"user_message","content":"Update footer links","target":"footer a","elementLabel":"Footer Links","timestamp":1640995400000}
`.trim();

const SAMPLE_SUMMARY_CONTENT = `
# Moat Tasks Summary

**Total**: 3 | **Pending**: 2 | **Completed**: 1

## Tasks

1. [x] Main Header - "Fix the header alignment"
2. [ ] Theme Toggle - "Add dark mode toggle"
3. [ ] Footer Links - "Update footer links"

---
*Last updated: 2024-01-01 12:00:00*
`.trim();

const SAMPLE_DETAILED_CONTENT = `
# Moat Tasks Detailed

## 🔥 📋 Task 001: Main Header

**Priority**: High
**Type**: Styling
**Estimated Time**: 15 minutes

### Request
"Fix the header alignment"

### Technical Details
- **Element**: \`header.main-header\`
- **Location**: components/Header.tsx
- **Component**: Header

### Status Tracking
- **Created**: 2024-01-01T12:00:00.000Z
- **Status**: 📋 pending
- **ID**: \`task-001\`

---

## ⚡ 📋 Task 002: Theme Toggle

**Priority**: Medium
**Type**: Feature
**Estimated Time**: 30 minutes

### Request
"Add dark mode toggle"

### Technical Details
- **Element**: \`button.theme-toggle\`
- **Location**: components/ThemeToggle.tsx
- **Component**: ThemeToggle

### Status Tracking
- **Created**: 2024-01-01T12:05:00.000Z
- **Status**: 📋 pending
- **ID**: \`task-002\`

---
`.trim();

describe('LegacyFileMigrator', () => {
  let migrator;
  let mockDirectory;
  let mockTaskStore;
  let mockMarkdownGenerator;

  beforeEach(() => {
    mockDirectory = new MockDirectoryHandle();
    mockTaskStore = new MockTaskStore();
    mockMarkdownGenerator = new MockMarkdownGenerator();
    
    // Set up .moat directory
    const moatDir = new MockDirectoryHandle();
    mockDirectory.directories.set('.moat', moatDir);
    
    migrator = new LegacyFileMigrator(mockDirectory, mockTaskStore, mockMarkdownGenerator);
  });

  describe('Task 4.1: Legacy File Detection', () => {
    test('should detect no legacy files when none exist', async () => {
      const result = await migrator.detectLegacyFiles();
      
      expect(result.hasLegacyFiles).toBe(false);
      expect(result.jsonlStream).toBeNull();
      expect(result.summaryMd).toBeNull();
      expect(result.detailedMd).toBeNull();
    });

    test('should detect JSONL stream file', async () => {
      const moatDir = mockDirectory.directories.get('.moat');
      moatDir.setFile('.moat-stream.jsonl', SAMPLE_JSONL_CONTENT);
      
      const result = await migrator.detectLegacyFiles();
      
      expect(result.hasLegacyFiles).toBe(true);
      expect(result.jsonlStream).toBeDefined();
      expect(result.jsonlStream.name).toBe('.moat-stream.jsonl');
    });

    test('should detect summary markdown file', async () => {
      const moatDir = mockDirectory.directories.get('.moat');
      moatDir.setFile('moat-tasks-summary.md', SAMPLE_SUMMARY_CONTENT);
      
      const result = await migrator.detectLegacyFiles();
      
      expect(result.hasLegacyFiles).toBe(true);
      expect(result.summaryMd).toBeDefined();
      expect(result.summaryMd.name).toBe('moat-tasks-summary.md');
    });

    test('should detect detailed markdown file with various names', async () => {
      const moatDir = mockDirectory.directories.get('.moat');
      moatDir.setFile('moat-tasks.md', SAMPLE_DETAILED_CONTENT);
      
      const result = await migrator.detectLegacyFiles();
      
      expect(result.hasLegacyFiles).toBe(true);
      expect(result.detailedMd).toBeDefined();
      expect(result.detailedMd.name).toBe('moat-tasks.md');
    });
  });

  describe('Task 4.2: JSONL Stream Parser', () => {
    test('should parse JSONL annotations correctly', async () => {
      const fileHandle = new MockFileHandle('.moat-stream.jsonl', SAMPLE_JSONL_CONTENT);
      
      const annotations = await migrator.parseJsonlStream(fileHandle);
      
      expect(annotations).toHaveLength(3);
      expect(annotations[0].content).toBe('Fix the header alignment');
      expect(annotations[0].target).toBe('header.main-header');
      expect(annotations[1].content).toBe('Add dark mode toggle');
      expect(annotations[2].content).toBe('Update footer links');
    });

    test('should handle malformed JSONL lines gracefully', async () => {
      const malformedContent = `
{"annotation":{"content":"Valid line","target":"div"}}
{invalid json line}
{"annotation":{"content":"Another valid line","target":"span"}}
      `.trim();
      
      const fileHandle = new MockFileHandle('test.jsonl', malformedContent);
      
      const annotations = await migrator.parseJsonlStream(fileHandle);
      
      expect(annotations).toHaveLength(2);
      expect(annotations[0].content).toBe('Valid line');
      expect(annotations[1].content).toBe('Another valid line');
    });

    test('should handle empty JSONL file', async () => {
      const fileHandle = new MockFileHandle('empty.jsonl', '');
      
      const annotations = await migrator.parseJsonlStream(fileHandle);
      
      expect(annotations).toHaveLength(0);
    });
  });

  describe('Task 4.3: Summary Markdown Parser', () => {
    test('should parse checkbox format correctly', async () => {
      const fileHandle = new MockFileHandle('summary.md', SAMPLE_SUMMARY_CONTENT);
      
      const tasks = await migrator.parseSummaryMarkdown(fileHandle);
      
      expect(tasks).toHaveLength(3);
      expect(tasks[0].number).toBe(1);
      expect(tasks[0].completed).toBe(true);
      expect(tasks[0].title).toBe('Main Header');
      expect(tasks[0].description).toBe('Fix the header alignment');
      expect(tasks[1].completed).toBe(false);
      expect(tasks[2].completed).toBe(false);
    });

    test('should parse old format with status field', async () => {
      const oldFormatContent = `
1. Main Header - "Fix the header alignment" - completed
2. Theme Toggle - "Add dark mode toggle" - pending
3. Footer Links - "Update footer links" - done
      `.trim();
      
      const fileHandle = new MockFileHandle('old-summary.md', oldFormatContent);
      
      const tasks = await migrator.parseSummaryMarkdown(fileHandle);
      
      expect(tasks).toHaveLength(3);
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('pending');
      expect(tasks[2].status).toBe('completed'); // 'done' → 'completed'
    });
  });

  describe('Task 4.4: Schema Conversion', () => {
    test('should convert JSONL annotations to new schema', () => {
      const legacyData = {
        jsonlAnnotations: [
          {
            content: 'Test task',
            target: 'div.test',
            elementLabel: 'Test Element',
            timestamp: 1640995200000,
            id: 'old-id-1'
          }
        ]
      };
      
      const converted = migrator.convertToNewSchema(legacyData);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].comment).toBe('Test task');
      expect(converted[0].target).toBe('div.test');
      expect(converted[0].elementLabel).toBe('Test Element');
      expect(converted[0].source).toBe('migration-jsonl');
      expect(converted[0].migrationData.originalId).toBe('old-id-1');
      expect(converted[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should generate UUIDs for tasks without IDs', () => {
      const legacyData = {
        summaryTasks: [
          { title: 'Task 1', description: 'Description 1', status: 'pending' },
          { title: 'Task 2', description: 'Description 2', status: 'completed' }
        ]
      };
      
      const converted = migrator.convertToNewSchema(legacyData);
      
      expect(converted).toHaveLength(2);
      expect(converted[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(converted[1].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(converted[0].id).not.toBe(converted[1].id);
    });
  });

  describe('Utility Functions', () => {
    test('should generate valid UUIDs', () => {
      const uuid1 = migrator.generateUUID();
      const uuid2 = migrator.generateUUID();
      
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(uuid1).not.toBe(uuid2);
    });

    test('should extract element labels from selectors', () => {
      expect(migrator.extractElementLabel('#main-header')).toBe('#main-header');
      expect(migrator.extractElementLabel('.btn-primary')).toBe('.btn-primary');
      expect(migrator.extractElementLabel('button')).toBe('<button>');
      expect(migrator.extractElementLabel('div.very-long-class-name-that-should-be-truncated')).toBe('.very-long-class-na...');
      expect(migrator.extractElementLabel('')).toBeNull();
    });
  });

  // Task 4.6-4.10: Integration and end-to-end tests
  describe('Task 4.6-4.10: Complete Migration Process', () => {
    let migrator;
    let mockDirectoryHandle;
    let mockFileHandles;

    beforeEach(() => {
      // Setup comprehensive mock environment
      mockFileHandles = {
        '.moat-stream.jsonl': createMockFileHandle('.moat-stream.jsonl', JSON.stringify({
          annotation: { content: 'Test annotation 1', target: '.test-element' },
          formatting: { cursorPrompt: 'Fix this element' }
        }) + '\n' + JSON.stringify({
          annotation: { content: 'Test annotation 2', target: '.another-element' },
          formatting: { cursorPrompt: 'Update this component' }
        })),
        'moat-tasks-summary.md': createMockFileHandle('moat-tasks-summary.md', `# Tasks Summary
1. [x] Task 1 - "Completed task"
2. [ ] Task 2 - "Pending task"`),
        'moat-tasks.md': createMockFileHandle('moat-tasks.md', `# Detailed Tasks
## Task 1
Status: completed
Description: This is completed`),
      };

      mockDirectoryHandle = createMockDirectoryHandle(mockFileHandles);
      migrator = new LegacyFileMigrator(mockDirectoryHandle);
    });

    test('Task 4.6: archiveLegacyFiles creates timestamped backups', async () => {
      // Setup legacy files
      await migrator.detectLegacyFiles();
      
      const backups = await migrator.archiveLegacyFiles();
      
      expect(backups).toHaveLength(3);
      expect(backups[0].original).toBe('.moat-stream.jsonl');
      expect(backups[0].backup).toMatch(/\.moat-stream\.jsonl\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(backups[0].size).toBeGreaterThan(0);
      expect(backups[0].handle).toBeDefined();
    });

    test('Task 4.7: writeNewFormatFiles creates both required files', async () => {
      const testTasks = [
        {
          id: 'task-001',
          title: 'Test Task 1',
          description: 'Test description',
          status: 'pending',
          created: new Date().toISOString(),
          elementLabel: 'Test Element'
        },
        {
          id: 'task-002', 
          title: 'Test Task 2',
          description: 'Another test',
          status: 'completed',
          created: new Date().toISOString(),
          targetFile: 'test.tsx'
        }
      ];

      const result = await migrator.writeNewFormatFiles(testTasks);
      
      expect(result.detailFile).toBe('moat-tasks-detail.json');
      expect(result.markdownFile).toBe('moat-tasks.md');
      expect(result.taskCount).toBe(2);
      
      // Verify files were created
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('moat-tasks-detail.json', { create: true });
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('moat-tasks.md', { create: true });
    });

    test('Task 4.8: generateMarkdownFromTasks creates proper format', () => {
      const testTasks = [
        {
          id: 'task-001',
          title: 'Completed Task',
          description: 'This is done',
          status: 'completed',
          created: '2024-01-01T10:00:00Z',
          elementLabel: 'Button Element'
        },
        {
          id: 'task-002',
          title: 'Pending Task', 
          description: 'This needs work',
          status: 'pending',
          created: '2024-01-01T11:00:00Z',
          targetFile: 'component.tsx'
        },
        {
          id: 'task-003',
          title: 'In Progress Task',
          status: 'in-progress',
          created: '2024-01-01T12:00:00Z'
        }
      ];

      const markdown = migrator.generateMarkdownFromTasks(testTasks);
      
      expect(markdown).toContain('# Moat Tasks');
      expect(markdown).toContain('**Statistics:** 1 completed, 1 in progress, 1 pending');
      expect(markdown).toContain('[x] ✅ **Completed Task**');
      expect(markdown).toContain('[ ] 📋 **Pending Task**');
      expect(markdown).toContain('[ ] 🔄 **In Progress Task**');
      expect(markdown).toContain('- This is done');
      expect(markdown).toContain('- Element: Button Element');
      expect(markdown).toContain('- File: component.tsx');
      
      // Tasks should be in reverse chronological order (newest first)
      const taskOrder = markdown.indexOf('In Progress Task') < markdown.indexOf('Pending Task') &&
                       markdown.indexOf('Pending Task') < markdown.indexOf('Completed Task');
      expect(taskOrder).toBe(true);
    });

    test('Task 4.9: performMigration handles complete end-to-end process', async () => {
      const result = await migrator.performMigration();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Migration completed');
      expect(result.stats).toEqual({
        legacyFiles: 3,
        tasksConverted: expect.any(Number),
        backupsCreated: 3,
        newFiles: 2
      });
      expect(result.validation).toBeDefined();
      expect(result.validation.success).toBe(true);
    });

    test('Task 4.9: performMigration handles no legacy files', async () => {
      // Create migrator with no legacy files
      const emptyMockHandle = createMockDirectoryHandle({});
      const emptyMigrator = new LegacyFileMigrator(emptyMockHandle);
      
      const result = await emptyMigrator.performMigration();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('No migration needed');
    });

    test('Task 4.9: performMigration handles migration failure', async () => {
      // Mock a failure in the conversion process
      jest.spyOn(migrator, 'convertToNewSchema').mockRejectedValue(new Error('Conversion failed'));
      
      const result = await migrator.performMigration();
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Conversion failed');
      expect(result.error).toBeDefined();
    });

    test('Task 4.10: validateMigration checks file integrity', async () => {
      const originalTasks = [
        { id: 'task-001', title: 'Task 1', status: 'pending', created: '2024-01-01T10:00:00Z' },
        { id: 'task-002', title: 'Task 2', status: 'completed', created: '2024-01-01T11:00:00Z' }
      ];

      // Mock the new format files
      const detailFileContent = JSON.stringify(originalTasks, null, 2);
      const markdownFileContent = migrator.generateMarkdownFromTasks(originalTasks);
      
      mockFileHandles['moat-tasks-detail.json'] = createMockFileHandle('moat-tasks-detail.json', detailFileContent);
      mockFileHandles['moat-tasks.md'] = createMockFileHandle('moat-tasks.md', markdownFileContent);
      
      const validation = await migrator.validateMigration(originalTasks);
      
      expect(validation.success).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.stats.totalTasks).toBe(2);
      expect(validation.stats.validTasks).toBe(2);
      expect(validation.stats.missingTasks).toBe(0);
    });

    test('Task 4.10: validateMigration detects missing tasks', async () => {
      const originalTasks = [
        { id: 'task-001', title: 'Task 1', status: 'pending', created: '2024-01-01T10:00:00Z' },
        { id: 'task-002', title: 'Task 2', status: 'completed', created: '2024-01-01T11:00:00Z' }
      ];

      // Mock incomplete migration (missing one task)
      const incompleteTasks = [originalTasks[0]]; // Only first task
      const detailFileContent = JSON.stringify(incompleteTasks, null, 2);
      
      mockFileHandles['moat-tasks-detail.json'] = createMockFileHandle('moat-tasks-detail.json', detailFileContent);
      mockFileHandles['moat-tasks.md'] = createMockFileHandle('moat-tasks.md', 'Short content');
      
      const validation = await migrator.validateMigration(originalTasks);
      
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain('Task count mismatch: expected 2, got 1');
      expect(validation.errors).toContain('Missing tasks after migration: task-002');
    });

    test('Task 4.10: validateMigration handles invalid JSON', async () => {
      const originalTasks = [{ id: 'task-001', title: 'Task 1', status: 'pending', created: '2024-01-01T10:00:00Z' }];
      
      // Mock invalid JSON content
      mockFileHandles['moat-tasks-detail.json'] = createMockFileHandle('moat-tasks-detail.json', 'invalid json content');
      mockFileHandles['moat-tasks.md'] = createMockFileHandle('moat-tasks.md', 'Valid markdown');
      
      const validation = await migrator.validateMigration(originalTasks);
      
      expect(validation.success).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Validation error:');
    });

    test('Static helper: migrationNeeded detects when migration is required', async () => {
      const needed = await LegacyFileMigrator.migrationNeeded(mockDirectoryHandle);
      expect(needed).toBe(true);
    });

    test('Static helper: migrationNeeded returns false when new format exists', async () => {
      // Add new format files to mock
      mockFileHandles['moat-tasks-detail.json'] = createMockFileHandle('moat-tasks-detail.json', '[]');
      mockFileHandles['moat-tasks.md'] = createMockFileHandle('moat-tasks.md', '# Tasks');
      
      const needed = await LegacyFileMigrator.migrationNeeded(mockDirectoryHandle);
      expect(needed).toBe(false);
    });

    test('getMigrationStatus returns comprehensive status info', async () => {
      const status = await migrator.getMigrationStatus();
      
      expect(status).toEqual({
        hasLegacyFiles: true,
        hasNewFormat: false,
        legacyFileCount: 3,
        needsMigration: true
      });
    });

    test('Integration: Full migration workflow with real-world data structure', async () => {
      // Setup more realistic legacy data
      const realisticJsonl = [
        {
          annotation: {
            content: 'Move this button to the right side of the header',
            target: 'button.login-btn',
            elementLabel: 'Login Button',
            boundingRect: { x: 100, y: 50, width: 80, height: 32 }
          },
          formatting: {
            cursorPrompt: 'Reposition login button to right side of header',
            targetFile: 'components/Header.tsx'
          }
        },
        {
          annotation: {
            content: 'Change the color scheme to use dark mode',
            target: '.main-content',
            elementLabel: 'Main Content Area'
          },
          formatting: {
            cursorPrompt: 'Implement dark mode color scheme for main content',
            targetFile: 'styles/globals.css'
          }
        }
      ].map(item => JSON.stringify(item)).join('\n');

      const realisticSummary = `# Task Summary
1. [x] Header button positioning - "Move login button to right"
2. [ ] Dark mode implementation - "Add dark color scheme"
3. [ ] Form validation - "Add input validation"`;

      // Update mock files with realistic content
      mockFileHandles['.moat-stream.jsonl'] = createMockFileHandle('.moat-stream.jsonl', realisticJsonl);
      mockFileHandles['moat-tasks-summary.md'] = createMockFileHandle('moat-tasks-summary.md', realisticSummary);
      
      const result = await migrator.performMigration();
      
      expect(result.success).toBe(true);
      expect(result.stats.tasksConverted).toBeGreaterThan(0);
      expect(result.validation.success).toBe(true);
      
      // Verify migration preserved essential data
      expect(result.stats.legacyFiles).toBe(3);
      expect(result.stats.backupsCreated).toBe(3);
      expect(result.stats.newFiles).toBe(2);
    });
  });
});

// Export for running tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LegacyFileMigrator,
    MockFileHandle,
    MockDirectoryHandle,
    MockTaskStore,
    MockMarkdownGenerator,
    SAMPLE_JSONL_CONTENT,
    SAMPLE_SUMMARY_CONTENT,
    SAMPLE_DETAILED_CONTENT
  };
} 