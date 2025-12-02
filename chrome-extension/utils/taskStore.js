// Moat Task Store - Core JSON CRUD operations for task management
// Handles task creation, reading, updating, and status management

/**
 * Generate a UUID v4 for unique task identification
 * @returns {string} UUID v4 string
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Valid task status values
 */
const TASK_STATUS = {
    TO_DO: 'to do',
    DOING: 'doing', 
    DONE: 'done'
};

/**
 * Create a new task object with proper structure
 * @param {Object} taskData - The task data
 * @param {string} taskData.title - Short title for the task
 * @param {string} taskData.comment - Full user comment/annotation
 * @param {string} taskData.selector - CSS selector for the target element
 * @param {Object} taskData.boundingRect - Element bounding rectangle {x, y, w, h}
 * @param {string} taskData.screenshotPath - Path to screenshot file
 * @returns {Object} Properly structured task object
 */
function createTaskObject(taskData) {
    if (!taskData.title || !taskData.comment || !taskData.selector) {
        throw new Error('Task must have title, comment, and selector');
    }

    return {
        id: generateUUID(),
        title: taskData.title,
        comment: taskData.comment,
        selector: taskData.selector,
        boundingRect: taskData.boundingRect || { x: 0, y: 0, w: 0, h: 0 },
        screenshotPath: taskData.screenshotPath || '',
        status: TASK_STATUS.TO_DO,
        timestamp: Date.now()
    };
}

/**
 * Validate task object structure
 * @param {Object} task - Task object to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateTaskObject(task) {
    const requiredFields = ['id', 'title', 'comment', 'selector', 'status', 'timestamp'];
    
    for (const field of requiredFields) {
        if (!task.hasOwnProperty(field)) {
            throw new Error(`Task missing required field: ${field}`);
        }
    }

    if (!Object.values(TASK_STATUS).includes(task.status)) {
        throw new Error(`Invalid task status: ${task.status}. Must be one of: ${Object.values(TASK_STATUS).join(', ')}`);
    }

    return true;
}

/**
 * Sort tasks by timestamp (reverse chronological - newest first)
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Sorted array of tasks
 */
function sortTasksByTimestamp(tasks) {
    return [...tasks].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * TaskStore class - Main interface for task management
 */
class TaskStore {
    constructor() {
        this.tasks = [];
        this.directoryHandle = null; // Will be set when connected to project directory
    }

    /**
     * Initialize the task store with directory handle
     * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle for the .moat folder
     */
    initialize(directoryHandle) {
        this.directoryHandle = directoryHandle;
    }

    /**
     * Check if TaskStore is properly initialized
     * @returns {boolean} True if initialized with directory handle
     */
    isInitialized() {
        return this.directoryHandle !== null;
    }

    /**
     * Load tasks from memory (for now - file operations will be added in task 1.5)
     * @returns {Array} Array of task objects
     */
    getTasks() {
        return sortTasksByTimestamp(this.tasks);
    }

    /**
     * Get all tasks (alias for getTasks for explicit naming)
     * @returns {Array} Array of task objects sorted by timestamp (newest first for UI)
     */
    getAllTasks() {
        return this.getTasks();
    }

    /**
     * Get all tasks in chronological order (oldest first, newest last)
     * Used for file operations to maintain consistent ordering with JSON file
     * @returns {Array} Array of task objects in chronological order
     */
    getAllTasksChronological() {
        return [...this.tasks].sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Find task by ID
     * @param {string} id - Task ID to find
     * @returns {Object|null} Task object or null if not found
     */
    getTaskById(id) {
        return this.tasks.find(task => task.id === id) || null;
    }

    /**
     * Add new task with intelligent deduplication
     * @param {Object} taskData - Raw task data to create task from
     * @param {string} [taskData.id] - Optional existing task ID for updates
     * @returns {Object} Created or updated task object
     */
    addTask(taskData) {
        // If an ID is provided, try to update existing task
        if (taskData.id) {
            const existingTask = this.getTaskById(taskData.id);
            if (existingTask) {
                // Update existing task with new data
                Object.assign(existingTask, {
                    title: taskData.title || existingTask.title,
                    comment: taskData.comment || existingTask.comment,
                    selector: taskData.selector || existingTask.selector,
                    boundingRect: taskData.boundingRect || existingTask.boundingRect,
                    screenshotPath: taskData.screenshotPath || existingTask.screenshotPath,
                    lastModified: Date.now()
                });
                console.log(`Updated existing task: ${existingTask.id}`);
                return existingTask;
            }
        }

        // Create new task
        const task = createTaskObject(taskData);
        
        // Check for functional duplicates (same selector and comment content)
        const functionalDuplicate = this.tasks.find(existingTask => 
            existingTask.selector === task.selector && 
            existingTask.comment.trim() === task.comment.trim() &&
            existingTask.status !== TASK_STATUS.DONE
        );

        if (functionalDuplicate) {
            console.warn('Functional duplicate detected, updating timestamp and refreshing existing task');
            functionalDuplicate.timestamp = task.timestamp;
            functionalDuplicate.lastModified = Date.now();
            // Update screenshot path if new one provided
            if (task.screenshotPath) {
                functionalDuplicate.screenshotPath = task.screenshotPath;
            }
            return functionalDuplicate;
        }

        // Add new task
        this.tasks.push(task);
        console.log(`Created new task: ${task.id}`);
        return task;
    }

    /**
     * Add or update task by ID (explicit method for ID-based operations)
     * @param {string} id - Task ID to update, or null to create new
     * @param {Object} taskData - Task data to set/update
     * @returns {Object} Task object
     */
    addOrUpdateTaskById(id, taskData) {
        if (id) {
            // Update existing task
            const updatedData = { ...taskData, id };
            return this.addTask(updatedData);
        } else {
            // Create new task
            return this.addTask(taskData);
        }
    }

    /**
     * Update task status
     * @param {string} id - Task ID to update
     * @param {string} status - New status value
     * @returns {Object|null} Updated task object or null if not found
     */
    updateTaskStatus(id, status) {
        if (!Object.values(TASK_STATUS).includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }

        const task = this.getTaskById(id);
        if (!task) {
            return null;
        }

        task.status = status;
        task.lastModified = Date.now();
        return task;
    }

    /**
     * Get task count statistics
     * @returns {Object} Statistics object with total, to do, doing, done counts
     */
    getTaskStats() {
        const stats = {
            total: this.tasks.length,
            'to do': 0,
            'doing': 0,
            'done': 0
        };

        this.tasks.forEach(task => {
            stats[task.status] = (stats[task.status] || 0) + 1;
        });

        return stats;
    }

    /**
     * Load tasks from JSON file (File System Access API)
     * @returns {Promise<Array>} Promise resolving to array of tasks
     */
    async loadTasksFromFile() {
        if (!this.directoryHandle) {
            throw new Error('TaskStore not initialized with directory handle');
        }

        try {
            const fileHandle = await this.directoryHandle.getFileHandle('moat-tasks-detail.json', { create: true });
            const file = await fileHandle.getFile();
            const jsonData = await file.text();
            
            if (!jsonData.trim()) {
                this.tasks = [];
                return this.tasks;
            }

            const loadedTasks = JSON.parse(jsonData);
            
            // Validate each task
            loadedTasks.forEach(task => validateTaskObject(task));
            
            this.tasks = loadedTasks;
            console.log(`Loaded ${this.tasks.length} tasks from file`);
            return this.getAllTasks();
        } catch (error) {
            if (error.name === 'NotFoundError') {
                // File doesn't exist yet, start with empty array
                console.log('Task file not found, starting with empty task list');
                this.tasks = [];
                return this.tasks;
            }
            console.error('Error loading tasks from file:', error);
            throw new Error(`Failed to load tasks: ${error.message}`);
        }
    }

    /**
     * Save tasks to JSON file with atomic write operations
     * @returns {Promise<boolean>} Promise resolving to success status
     */
    async saveTasksToFile() {
        if (!this.directoryHandle) {
            throw new Error('TaskStore not initialized with directory handle');
        }

        try {
            // Validate all tasks before writing
            this.tasks.forEach(task => validateTaskObject(task));

            // Prepare JSON data with proper formatting
            const jsonData = JSON.stringify(this.tasks, null, 2);

            // Write to file using File System Access API
            const fileHandle = await this.directoryHandle.getFileHandle('moat-tasks-detail.json', { create: true });

            // Use keepExistingData: false to truncate and overwrite
            const writable = await fileHandle.createWritable({ keepExistingData: false });

            // Write new content (file is truncated first)
            await writable.write(jsonData);
            await writable.close();

            console.log(`Successfully saved ${this.tasks.length} tasks to file`);
            return true;
        } catch (error) {
            console.error('Error saving tasks to file:', error);
            throw new Error(`Failed to save tasks: ${error.message}`);
        }
    }

    /**
     * Add task and automatically save to file
     * @param {Object} taskData - Task data to add
     * @returns {Promise<Object>} Promise resolving to created task
     */
    async addTaskAndSave(taskData) {
        const task = this.addTask(taskData);
        await this.saveTasksToFile();
        return task;
    }

    /**
     * Update task status and automatically save to file
     * @param {string} id - Task ID to update
     * @param {string} status - New status value
     * @returns {Promise<Object|null>} Promise resolving to updated task or null
     */
    async updateTaskStatusAndSave(id, status) {
        const task = this.updateTaskStatus(id, status);
        if (task) {
            await this.saveTasksToFile();
        }
        return task;
    }

    /**
     * Remove task by ID
     * @param {string} id - Task ID to remove
     * @returns {boolean} True if task was found and removed, false otherwise
     */
    removeTask(id) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks.splice(index, 1);
            console.log(`Removed task: ${id}`);
            return true;
        }
        console.warn(`Task not found for removal: ${id}`);
        return false;
    }

    /**
     * Remove task by ID and automatically save to file
     * Also deletes the associated screenshot file if it exists
     * @param {string} id - Task ID to remove
     * @returns {Promise<boolean>} Promise resolving to removal success status
     */
    async removeTaskAndSave(id) {
        // Get the task before removing it so we can delete its screenshot
        const task = this.getTaskById(id);

        if (!task) {
            console.warn(`Task not found for removal: ${id}`);
            return false;
        }

        // Delete screenshot file if it exists
        if (task.screenshotPath && this.directoryHandle) {
            await this.deleteScreenshotFile(task.screenshotPath);
        }

        // Remove the task from memory
        const removed = this.removeTask(id);

        // Save the updated task list to file
        if (removed) {
            await this.saveTasksToFile();
        }

        return removed;
    }

    /**
     * Delete a screenshot file from the filesystem
     * @param {string} screenshotPath - Relative path to screenshot (e.g., "./screenshots/task-id.png")
     * @returns {Promise<boolean>} Promise resolving to deletion success status
     */
    async deleteScreenshotFile(screenshotPath) {
        if (!this.directoryHandle) {
            console.warn('Cannot delete screenshot: no directory handle');
            return false;
        }

        try {
            // Parse the path to get the filename
            // screenshotPath format: "./screenshots/filename.png"
            const fileName = screenshotPath.replace(/^\.\/screenshots\//, '');

            if (!fileName || fileName === screenshotPath) {
                console.warn(`Invalid screenshot path format: ${screenshotPath}`);
                return false;
            }

            // Get the screenshots directory
            const screenshotsDir = await this.directoryHandle.getDirectoryHandle('screenshots', { create: false });

            // Delete the file
            await screenshotsDir.removeEntry(fileName);
            console.log(`Successfully deleted screenshot: ${fileName}`);
            return true;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                console.warn(`Screenshot file not found: ${screenshotPath}`);
            } else {
                console.error(`Error deleting screenshot file:`, error);
            }
            return false;
        }
    }

    /**
     * Delete screenshots from all completed tasks
     * @returns {Promise<Object>} Promise resolving to cleanup results
     */
    async deleteCompletedScreenshots() {
        if (!this.directoryHandle) {
            console.warn('Cannot delete screenshots: no directory handle');
            return { success: false, deletedCount: 0, errors: [] };
        }

        const completedTasks = this.tasks.filter(task => task.status === 'done');
        const tasksWithScreenshots = completedTasks.filter(task => task.screenshotPath);
        
        if (tasksWithScreenshots.length === 0) {
            return { success: true, deletedCount: 0, message: 'No screenshots to delete' };
        }

        let deletedCount = 0;
        const errors = [];

        for (const task of tasksWithScreenshots) {
            const deleted = await this.deleteScreenshotFile(task.screenshotPath);
            if (deleted) {
                // Clear the screenshot path from the task
                task.screenshotPath = '';
                deletedCount++;
            } else {
                errors.push(task.id);
            }
        }

        // Save updated tasks (with cleared screenshot paths)
        if (deletedCount > 0) {
            await this.saveTasksToFile();
        }

        return {
            success: true,
            deletedCount,
            totalCompleted: completedTasks.length,
            errors
        };
    }

    /**
     * Create backup of current tasks before risky operations
     * @returns {Promise<boolean>} Promise resolving to backup success
     */
    async createBackup() {
        if (!this.directoryHandle) {
            return false;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `moat-tasks-detail.backup.${timestamp}.json`;
            
            const fileHandle = await this.directoryHandle.getFileHandle(backupName, { create: true });
            const writable = await fileHandle.createWritable({ keepExistingData: false });
            const jsonData = JSON.stringify(this.tasks, null, 2);
            await writable.write(jsonData);
            await writable.close();
            console.log(`Backup created: ${backupName}`);
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }

    /**
     * Clear all tasks (for testing)
     */
    clear() {
        this.tasks = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment (for testing)
    module.exports = {
        TaskStore,
        TASK_STATUS,
        generateUUID,
        createTaskObject,
        validateTaskObject,
        sortTasksByTimestamp
    };
} else {
    // Browser environment
    window.MoatTaskStore = {
        TaskStore,
        TASK_STATUS,
        generateUUID,
        createTaskObject,
        validateTaskObject,
        sortTasksByTimestamp
    };
} 