// Unit tests for markdownGenerator.js
// Run with: npm test

const {
    generateMarkdownFromTasks,
    rebuildMarkdownFromJson,
    rebuildMarkdownFile,
    writeMarkdownToFile,
    generateTaskStats,
    statusToCheckbox,
    truncateComment,
    sortTasksByTimestamp
} = require('./markdownGenerator.js');

describe('Task Statistics Generation', () => {
    test('generateTaskStats should count tasks correctly', () => {
        const tasks = [
            { status: 'pending' },
            { status: 'pending' },
            { status: 'completed' },
            { status: 'in-progress' }
        ];
        
        const stats = generateTaskStats(tasks);
        expect(stats).toEqual({
            total: 4,
            pending: 2,
            'in-progress': 1,
            completed: 1
        });
    });

    test('generateTaskStats should handle empty array', () => {
        const stats = generateTaskStats([]);
        expect(stats).toEqual({
            total: 0,
            pending: 0,
            'in-progress': 0,
            completed: 0
        });
    });

    test('generateTaskStats should handle unknown status', () => {
        const tasks = [
            { status: 'pending' },
            { status: 'unknown-status' },
            { status: null }
        ];
        
        const stats = generateTaskStats(tasks);
        expect(stats.total).toBe(3);
        expect(stats.pending).toBe(1);
        expect(stats['in-progress']).toBe(0);
        expect(stats.completed).toBe(0);
    });
});

describe('Status to Checkbox Conversion', () => {
    test('statusToCheckbox should convert statuses correctly', () => {
        expect(statusToCheckbox('pending')).toBe('[ ]');
        expect(statusToCheckbox('in-progress')).toBe('[~]');
        expect(statusToCheckbox('completed')).toBe('[x]');
        expect(statusToCheckbox('unknown')).toBe('[ ]');
        expect(statusToCheckbox(null)).toBe('[ ]');
    });
});

describe('Comment Truncation', () => {
    test('truncateComment should truncate long comments', () => {
        const longComment = 'This is a very long comment that should be truncated because it exceeds the maximum length limit';
        const truncated = truncateComment(longComment, 30);
        
        expect(truncated).toBe('This is a very long comment...');
        expect(truncated.length).toBe(30);
    });

    test('truncateComment should not truncate short comments', () => {
        const shortComment = 'Short comment';
        const result = truncateComment(shortComment, 30);
        
        expect(result).toBe('Short comment');
    });

    test('truncateComment should handle empty or null input', () => {
        expect(truncateComment('')).toBe('');
        expect(truncateComment(null)).toBe('');
        expect(truncateComment(undefined)).toBe('');
    });

    test('truncateComment should clean up whitespace and newlines', () => {
        const messyComment = '  This has   multiple\nspaces  and\nnewlines  ';
        const result = truncateComment(messyComment);
        
        expect(result).toBe('This has multiple spaces and newlines');
    });

    test('truncateComment should use default max length', () => {
        const comment = 'a'.repeat(100);
        const result = truncateComment(comment);
        
        expect(result.length).toBe(60); // Default max length
        expect(result.endsWith('...')).toBe(true);
    });
});

describe('Task Sorting', () => {
    test('sortTasksByTimestamp should sort newest first', () => {
        const tasks = [
            { id: '1', timestamp: 1000 },
            { id: '2', timestamp: 3000 },
            { id: '3', timestamp: 2000 }
        ];
        
        const sorted = sortTasksByTimestamp(tasks);
        expect(sorted[0].id).toBe('2');
        expect(sorted[1].id).toBe('3');
        expect(sorted[2].id).toBe('1');
    });

    test('sortTasksByTimestamp should not mutate original array', () => {
        const tasks = [
            { timestamp: 1000 },
            { timestamp: 2000 }
        ];
        const original = [...tasks];
        
        sortTasksByTimestamp(tasks);
        expect(tasks).toEqual(original);
    });
});

describe('Markdown Generation', () => {
    const sampleTasks = [
        {
            id: '1',
            title: 'First Task',
            comment: 'This is the first task comment',
            selector: '.first',
            status: 'pending',
            timestamp: 2000
        },
        {
            id: '2',
            title: 'Second Task',
            comment: 'This is the second task comment',
            selector: '.second',
            status: 'completed',
            timestamp: 3000
        },
        {
            id: '3',
            title: 'Third Task',
            comment: 'This is the third task comment',
            selector: '.third',
            status: 'in-progress',
            timestamp: 1000
        }
    ];

    test('generateMarkdownFromTasks should create valid markdown', () => {
        const markdown = generateMarkdownFromTasks(sampleTasks);
        
        expect(markdown).toContain('# Moat Tasks');
        expect(markdown).toContain('**Total**: 3');
        expect(markdown).toContain('**Pending**: 1');
        expect(markdown).toContain('**In Progress**: 1');
        expect(markdown).toContain('**Completed**: 1');
        expect(markdown).toContain('## Tasks');
        expect(markdown).toContain('1. [x] Second Task');
        expect(markdown).toContain('2. [ ] First Task');
        expect(markdown).toContain('3. [~] Third Task');
    });

    test('generateMarkdownFromTasks should handle empty task array', () => {
        const markdown = generateMarkdownFromTasks([]);
        
        expect(markdown).toContain('# Moat Tasks');
        expect(markdown).toContain('**Total**: 0');
        expect(markdown).toContain('_press "F" to begin making annotations_');
    });

    test('generateMarkdownFromTasks should include footer', () => {
        const markdown = generateMarkdownFromTasks(sampleTasks);
        
        expect(markdown).toContain('---');
        expect(markdown).toContain('_Generated:');
        expect(markdown).toContain('_Source: moat-tasks-detail.json_');
    });

    test('generateMarkdownFromTasks should handle tasks without titles', () => {
        const tasksWithoutTitles = [
            {
                id: '1',
                comment: 'Comment without title',
                selector: '.test',
                status: 'pending',
                timestamp: 1000
            }
        ];
        
        const markdown = generateMarkdownFromTasks(tasksWithoutTitles);
        expect(markdown).toContain('Untitled Task');
    });

    test('generateMarkdownFromTasks should truncate long comments', () => {
        const taskWithLongComment = [
            {
                id: '1',
                title: 'Task',
                comment: 'This is a very long comment that should be truncated in the markdown output because it exceeds the reasonable length for display',
                selector: '.test',
                status: 'pending',
                timestamp: 1000
            }
        ];
        
        const markdown = generateMarkdownFromTasks(taskWithLongComment);
        expect(markdown).toContain('...');
        expect(markdown).not.toContain('because it exceeds the reasonable length for display');
    });

    test('generateMarkdownFromTasks should throw error for non-array input', () => {
        expect(() => generateMarkdownFromTasks(null)).toThrow('Tasks must be an array');
        expect(() => generateMarkdownFromTasks('not an array')).toThrow('Tasks must be an array');
        expect(() => generateMarkdownFromTasks({})).toThrow('Tasks must be an array');
    });
});

describe('Rebuild Functions', () => {
    const validTasks = [
        {
            id: '1',
            title: 'Test Task',
            comment: 'Test comment',
            selector: '.test',
            status: 'pending',
            timestamp: 1000
        }
    ];

    test('rebuildMarkdownFromJson should return markdown string', () => {
        const result = rebuildMarkdownFromJson(validTasks);
        
        expect(typeof result).toBe('string');
        expect(result).toContain('# Moat Tasks');
        expect(result).toContain('Test Task');
    });

    test('rebuildMarkdownFromJson should handle errors gracefully', () => {
        const result = rebuildMarkdownFromJson(null);
        
        expect(result).toContain('# Moat Tasks');
        expect(result).toContain('**Error generating task list**');
        expect(result).toContain('Tasks must be an array');
    });
});

describe('File Writing Integration', () => {
    let mockDirectoryHandle;
    let mockFileHandle;
    let mockWritable;

    beforeEach(() => {
        mockWritable = {
            write: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined)
        };

        mockFileHandle = {
            createWritable: jest.fn().mockResolvedValue(mockWritable)
        };

        mockDirectoryHandle = {
            getFileHandle: jest.fn().mockResolvedValue(mockFileHandle)
        };

        global.window = {
            directoryHandle: mockDirectoryHandle
        };
    });

    afterEach(() => {
        delete global.window;
    });

    test('writeMarkdownToFile should write content to file', async () => {
        const content = '# Test Markdown\n\nTest content';
        
        const result = await writeMarkdownToFile(content);
        
        expect(result).toBe(true);
        expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('moat-tasks.md', { create: true });
        expect(mockWritable.write).toHaveBeenCalledWith(content);
        expect(mockWritable.close).toHaveBeenCalled();
    });

    test('writeMarkdownToFile should throw error without directoryHandle', async () => {
        delete global.window.directoryHandle;
        
        await expect(writeMarkdownToFile('content')).rejects.toThrow('File System Access API not available');
    });

    test('rebuildMarkdownFile should complete full pipeline', async () => {
        const tasks = [
            {
                id: '1',
                title: 'Test Task',
                comment: 'Test comment',
                selector: '.test',
                status: 'pending',
                timestamp: 1000
            }
        ];
        
        const result = await rebuildMarkdownFile(tasks);
        
        expect(result).toBe(true);
        expect(mockWritable.write).toHaveBeenCalled();
        expect(mockWritable.close).toHaveBeenCalled();
    });
});

describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
        global.window = {
            directoryHandle: {
                getFileHandle: jest.fn().mockRejectedValue(new Error('File system error'))
            }
        };
        
        await expect(writeMarkdownToFile('content')).rejects.toThrow('Failed to write markdown');
        
        delete global.window;
    });

    test('should handle write errors gracefully', async () => {
        const mockWritable = {
            write: jest.fn().mockRejectedValue(new Error('Write error')),
            close: jest.fn()
        };

        global.window = {
            directoryHandle: {
                getFileHandle: jest.fn().mockResolvedValue({
                    createWritable: jest.fn().mockResolvedValue(mockWritable)
                })
            }
        };
        
        await expect(writeMarkdownToFile('content')).rejects.toThrow('Failed to write markdown');
        
        delete global.window;
    });
}); 