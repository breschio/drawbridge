// Moat Markdown Generator - Convert JSON tasks to markdown format
// Generates human-readable moat-tasks.md from moat-tasks-detail.json

/**
 * Generate task summary statistics from task array
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Statistics object with total, to do, doing, done counts
 */
function generateTaskStats(tasks) {
    const stats = {
        total: tasks.length,
        'to do': 0,
        'doing': 0,
        'done': 0
    };

    tasks.forEach(task => {
        if (task.status && stats.hasOwnProperty(task.status)) {
            stats[task.status]++;
        }
    });

    return stats;
}

/**
 * Convert task status to checkbox format
 * @param {string} status - Task status ('to do', 'doing', 'done')
 * @returns {string} Checkbox representation
 */
function statusToCheckbox(status) {
    switch (status) {
        case 'done':
            return '[x]';
        case 'doing':
            return '[~]'; // Alternative representation for doing
        case 'to do':
        default:
            return '[ ]';
    }
}

/**
 * Truncate comment text for markdown summary
 * @param {string} comment - Full comment text
 * @param {number} maxLength - Maximum length (default 60)
 * @returns {string} Truncated comment with ellipsis if needed
 */
function truncateComment(comment, maxLength = 60) {
    if (!comment) return '';
    
    const cleaned = comment.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    if (cleaned.length <= maxLength) {
        return cleaned;
    }
    
    return cleaned.substring(0, maxLength - 3) + '...';
}

/**
 * Sort tasks by timestamp (chronological - oldest first, newest last)
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Sorted array of tasks
 */
function sortTasksByTimestamp(tasks) {
    return [...tasks].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generate markdown content from JSON task array
 * @param {Array} tasks - Array of task objects
 * @returns {string} Formatted markdown content
 */
function generateMarkdownFromTasks(tasks) {
    if (!Array.isArray(tasks)) {
        throw new Error('Tasks must be an array');
    }

    // Sort tasks by timestamp (oldest first, newest last)
    const sortedTasks = sortTasksByTimestamp(tasks);
    
    // Generate statistics
    const stats = generateTaskStats(sortedTasks);
    
    // Build markdown content
    let markdown = '# Moat Tasks\n\n';
    
    // Add summary statistics
    markdown += `**Total**: ${stats.total} | `;
    markdown += `**To Do**: ${stats['to do']} | `;
    markdown += `**Doing**: ${stats['doing']} | `;
    markdown += `**Done**: ${stats['done']}\n\n`;
    
    // Add tasks section
    if (sortedTasks.length === 0) {
        markdown += '## Tasks\n\n';
        markdown += '_press "F" to begin making annotations_\n';
    } else {
        markdown += '## Tasks\n\n';
        
        sortedTasks.forEach((task, index) => {
            const checkbox = statusToCheckbox(task.status);
            const taskNumber = index + 1;
            const title = task.title || 'Untitled Task';
            const comment = truncateComment(task.comment);

            markdown += `${taskNumber}. ${checkbox} ${title}`;
            if (comment) {
                markdown += ` – "${comment}"`;
            }

            // Add file reference for Claude Code (if available)
            if (task.targetFile) {
                markdown += ` \`${task.targetFile}\``;
            } else if (task.selector) {
                markdown += ` \`${task.selector}\``;
            }

            markdown += '\n';
        });
    }
    
    // Add footer with generation timestamp
    markdown += '\n---\n\n';
    markdown += `_Generated: ${new Date().toLocaleString()}_\n`;
    markdown += `_Source: moat-tasks-detail.json_\n`;
    
    return markdown;
}

/**
 * Rebuild markdown from JSON file (main function for external use)
 * @param {Array} tasks - Array of task objects from JSON
 * @returns {string} Complete markdown content
 */
function rebuildMarkdownFromJson(tasks) {
    try {
        return generateMarkdownFromTasks(tasks);
    } catch (error) {
        console.error('Error generating markdown from tasks:', error);
        
        // Return error markdown instead of throwing
        return `# Moat Tasks\n\n**Error generating task list**\n\n${error.message}\n\n---\n\n_Generated: ${new Date().toLocaleString()}_\n`;
    }
}

/**
 * Write markdown content to file using File System Access API
 * @param {string} markdownContent - Generated markdown content
 * @returns {Promise<boolean>} Promise resolving to write success status
 */
async function writeMarkdownToFile(markdownContent) {
    try {
        if (typeof window !== 'undefined' && window.directoryHandle) {
            const fileHandle = await window.directoryHandle.getFileHandle('moat-tasks.md', { create: true });
            const writable = await fileHandle.createWritable({ keepExistingData: false });

            // Atomic write
            await writable.write(markdownContent);
            await writable.close();
            
            console.log('Successfully wrote markdown to moat-tasks.md');
            return true;
        } else {
            throw new Error('File System Access API not available or directoryHandle not set');
        }
    } catch (error) {
        console.error('Error writing markdown to file:', error);
        throw new Error(`Failed to write markdown: ${error.message}`);
    }
}

/**
 * Complete rebuild pipeline: JSON tasks -> markdown content -> file write
 * @param {Array} tasks - Array of task objects
 * @returns {Promise<boolean>} Promise resolving to success status
 */
async function rebuildMarkdownFile(tasks) {
    try {
        const markdownContent = rebuildMarkdownFromJson(tasks);
        await writeMarkdownToFile(markdownContent);
        return true;
    } catch (error) {
        console.error('Error in markdown rebuild pipeline:', error);
        throw error;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment (for testing)
    module.exports = {
        generateMarkdownFromTasks,
        rebuildMarkdownFromJson,
        rebuildMarkdownFile,
        writeMarkdownToFile,
        generateTaskStats,
        statusToCheckbox,
        truncateComment,
        sortTasksByTimestamp
    };
} else {
    // Browser environment
    window.MoatMarkdownGenerator = {
        generateMarkdownFromTasks,
        rebuildMarkdownFromJson,
        rebuildMarkdownFile,
        writeMarkdownToFile,
        generateTaskStats,
        statusToCheckbox,
        truncateComment,
        sortTasksByTimestamp
    };
} 