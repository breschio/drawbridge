// Legacy File Migration System for Moat Chrome Extension
// Tasks 4.1-4.10: Migrate from three-file system to two-file system

class LegacyFileMigrator {
  constructor(directoryHandle, taskStore, markdownGenerator) {
    this.directoryHandle = directoryHandle;
    this.taskStore = taskStore;
    this.markdownGenerator = markdownGenerator;
    this.migrationLog = [];
    this.backupFiles = [];
    this.legacyFiles = [];
  }

  // Task 4.1: Detection logic for old files
  async detectLegacyFiles() {
    console.log('🔍 Migration: Detecting legacy files...');
    
    try {
      const moatDir = await this.directoryHandle.getDirectoryHandle('.moat', { create: false });
      const legacyFiles = {
        jsonlStream: null,
        summaryMd: null,
        detailedMd: null,
        hasLegacyFiles: false
      };

      // Check for .moat-stream.jsonl
      try {
        legacyFiles.jsonlStream = await moatDir.getFileHandle('.moat-stream.jsonl');
        console.log('🔍 Found: .moat-stream.jsonl');
      } catch (e) {
        console.log('🔍 Not found: .moat-stream.jsonl');
      }

      // Check for moat-tasks-summary.md
      try {
        legacyFiles.summaryMd = await moatDir.getFileHandle('moat-tasks-summary.md');
        console.log('🔍 Found: moat-tasks-summary.md');
      } catch (e) {
        console.log('🔍 Not found: moat-tasks-summary.md');
      }

      // Check for detailed markdown (various possible names)
      const detailedNames = ['moat-tasks.md', 'moat-tasks-detailed.md', 'tasks.md'];
      for (const name of detailedNames) {
        try {
          legacyFiles.detailedMd = await moatDir.getFileHandle(name);
          console.log(`🔍 Found: ${name}`);
          break;
        } catch (e) {
          // Continue checking
        }
      }

      legacyFiles.hasLegacyFiles = !!(legacyFiles.jsonlStream || legacyFiles.summaryMd || legacyFiles.detailedMd);
      
      this.log(`Legacy file detection complete. Found ${Object.values(legacyFiles).filter(f => f && typeof f === 'object').length} legacy files`);
      
      this.legacyFiles = [
        { name: '.moat-stream.jsonl', handle: legacyFiles.jsonlStream },
        { name: 'moat-tasks-summary.md', handle: legacyFiles.summaryMd },
        { name: 'moat-tasks.md', handle: legacyFiles.detailedMd }
      ].filter(f => f.handle && typeof f.handle === 'object');
      
      return legacyFiles;
    } catch (error) {
      this.log(`Error detecting legacy files: ${error.message}`, 'error');
      return { hasLegacyFiles: false, error: error.message };
    }
  }

  // Task 4.2: Parser for .moat-stream.jsonl format
  async parseJsonlStream(fileHandle) {
    console.log('📄 Migration: Parsing .moat-stream.jsonl...');
    
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const lines = content.trim().split('\n').filter(line => line.trim());
      const annotations = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const lineData = JSON.parse(lines[i]);
          
          // Extract annotation from various possible structures
          let annotation = null;
          if (lineData.annotation) {
            annotation = lineData.annotation;
          } else if (lineData.type === 'user_message') {
            annotation = lineData;
          } else if (lineData.content && lineData.target) {
            annotation = lineData;
          }

          if (annotation) {
            annotations.push(annotation);
          }
        } catch (parseError) {
          this.log(`Error parsing JSONL line ${i + 1}: ${parseError.message}`, 'warn');
        }
      }

      this.log(`Parsed ${annotations.length} annotations from JSONL stream`);
      return annotations;
    } catch (error) {
      this.log(`Error reading JSONL file: ${error.message}`, 'error');
      return [];
    }
  }

  // Task 4.3: Parser for .moat-tasks-summary.md checkbox format
  async parseSummaryMarkdown(fileHandle) {
    console.log('📄 Migration: Parsing moat-tasks-summary.md...');
    
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const tasks = [];

      // Parse checkbox format: "1. [x] Title - "Description""
      const checkboxPattern = /^(\d+)\.\s*\[([x ])\]\s*(.+?)\s*-\s*"(.+?)"$/gm;
      let match;

      while ((match = checkboxPattern.exec(content)) !== null) {
        const [, number, checked, title, description] = match;
        
        tasks.push({
          number: parseInt(number),
          completed: checked === 'x',
          title: title.trim(),
          description: description.trim(),
          status: checked === 'x' ? 'completed' : 'pending'
        });
      }

      // Also try old format: "1. Title - "Description" - status"
      if (tasks.length === 0) {
        const oldPattern = /^(\d+)\.\s*(.+?)\s*-\s*"(.+?)"\s*-\s*(pending|completed|done)$/gm;
        while ((match = oldPattern.exec(content)) !== null) {
          const [, number, title, description, status] = match;
          
          tasks.push({
            number: parseInt(number),
            completed: status === 'completed' || status === 'done',
            title: title.trim(),
            description: description.trim(),
            status: status === 'completed' || status === 'done' ? 'completed' : 'pending'
          });
        }
      }

      this.log(`Parsed ${tasks.length} tasks from summary markdown`);
      return tasks;
    } catch (error) {
      this.log(`Error reading summary markdown: ${error.message}`, 'error');
      return [];
    }
  }

  // Parse detailed markdown with enhanced task format
  async parseDetailedMarkdown(fileHandle) {
    console.log('📄 Migration: Parsing detailed markdown...');
    
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const tasks = [];

      // Parse enhanced task format with ## headers
      const taskPattern = /^## (?:🔥|⚡|💡)?\s*📋\s*(?:Task\s*\d+:\s*)?(.+?)$\n([\s\S]*?)(?=^##|\Z)/gm;
      let match;

      while ((match = taskPattern.exec(content)) !== null) {
        const [, title, body] = match;
        const task = { title: title.trim() };

        // Extract various fields from the task body
        const requestMatch = body.match(/### Request\s*\n"(.+?)"/s);
        if (requestMatch) task.request = requestMatch[1].trim();

        const elementMatch = body.match(/- \*\*Element\*\*:\s*`(.+?)`/);
        if (elementMatch) task.element = elementMatch[1];

        const statusMatch = body.match(/- \*\*Status\*\*:\s*📋\s*(.+?)$/m);
        if (statusMatch) task.status = statusMatch[1].trim();

        const createdMatch = body.match(/- \*\*Created\*\*:\s*(.+?)$/m);
        if (createdMatch) task.created = createdMatch[1].trim();

        const idMatch = body.match(/- \*\*ID\*\*:\s*`(.+?)`/);
        if (idMatch) task.id = idMatch[1];

        tasks.push(task);
      }

      this.log(`Parsed ${tasks.length} tasks from detailed markdown`);
      return tasks;
    } catch (error) {
      this.log(`Error reading detailed markdown: ${error.message}`, 'error');
      return [];
    }
  }

  // Task 4.4: Conversion logic to new JSON schema with UUID assignment
  convertToNewSchema(legacyData) {
    console.log('🔄 Migration: Converting to new schema...');
    
    const convertedTasks = [];
    const now = new Date().toISOString();

    // Process JSONL annotations
    if (legacyData.jsonlAnnotations) {
      for (const annotation of legacyData.jsonlAnnotations) {
        const task = {
          id: this.generateUUID(),
          comment: annotation.content || annotation.description || 'Migrated task',
          elementLabel: annotation.elementLabel || this.extractElementLabel(annotation.target) || 'UI Element',
          target: annotation.target || 'body',
          status: annotation.status === 'resolved' ? 'completed' : 'pending',
          createdAt: annotation.timestamp ? new Date(annotation.timestamp).toISOString() : now,
          updatedAt: now,
          source: 'migration-jsonl',
          migrationData: {
            originalId: annotation.id,
            originalType: annotation.type,
            pageUrl: annotation.pageUrl,
            sessionId: annotation.sessionId
          }
        };

        if (annotation.screenshot) {
          task.screenshotPath = `./screenshots/${task.id}.png`;
        }

        convertedTasks.push(task);
      }
    }

    // Process summary markdown tasks
    if (legacyData.summaryTasks) {
      for (const summaryTask of legacyData.summaryTasks) {
        // Skip if we already have this task from JSONL
        const existingTask = convertedTasks.find(t => 
          t.comment === summaryTask.description || 
          t.elementLabel === summaryTask.title
        );
        
        if (!existingTask) {
          const task = {
            id: this.generateUUID(),
            comment: summaryTask.description,
            elementLabel: summaryTask.title,
            target: 'body', // Default since summary doesn't have selectors
            status: summaryTask.status,
            createdAt: now,
            updatedAt: now,
            source: 'migration-summary',
            migrationData: {
              originalNumber: summaryTask.number,
              wasCompleted: summaryTask.completed
            }
          };
          
          convertedTasks.push(task);
        }
      }
    }

    // Process detailed markdown tasks
    if (legacyData.detailedTasks) {
      for (const detailedTask of legacyData.detailedTasks) {
        // Try to match with existing tasks and enhance them
        const existingTask = convertedTasks.find(t => 
          t.comment === detailedTask.request ||
          t.elementLabel === detailedTask.title ||
          (detailedTask.id && t.migrationData?.originalId === detailedTask.id)
        );

        if (existingTask) {
          // Enhance existing task with detailed information
          if (detailedTask.element) existingTask.target = detailedTask.element;
          if (detailedTask.created) existingTask.createdAt = new Date(detailedTask.created).toISOString();
          if (detailedTask.status) existingTask.status = detailedTask.status === 'pending' ? 'pending' : 'completed';
          existingTask.source = 'migration-enhanced';
        } else {
          // Create new task from detailed data
          const task = {
            id: detailedTask.id || this.generateUUID(),
            comment: detailedTask.request || detailedTask.title || 'Migrated detailed task',
            elementLabel: detailedTask.title || 'UI Element',
            target: detailedTask.element || 'body',
            status: detailedTask.status === 'pending' ? 'pending' : 'completed',
            createdAt: detailedTask.created ? new Date(detailedTask.created).toISOString() : now,
            updatedAt: now,
            source: 'migration-detailed',
            migrationData: {
              originalId: detailedTask.id
            }
          };
          
          convertedTasks.push(task);
        }
      }
    }

    // Sort by creation date (newest first)
    convertedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    this.log(`Converted ${convertedTasks.length} tasks to new schema`);
    return convertedTasks;
  }

  // Task 4.5: File archiving (rename with .backup extension)
  async archiveLegacyFiles() {
    console.log('📦 Migration: Archiving legacy files...');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backups = [];

    try {
      const moatDir = await this.directoryHandle.getDirectoryHandle('.moat');

      // Archive each legacy file
      for (const file of this.legacyFiles) {
        if (file.handle && typeof file.handle === 'object' && file.name) {
          try {
            const originalName = file.name;
            const backupName = `${originalName}.backup-${timestamp}`;
            
            // Read original content
            const originalFile = await file.handle.getFile();
            const content = await originalFile.text();
            
            // Create backup file
            const backupHandle = await moatDir.getFileHandle(backupName, { create: true });
            const writable = await backupHandle.createWritable({ keepExistingData: false });
            await writable.write(content);
            await writable.close();
            
            backups.push({
              original: originalName,
              backup: backupName,
              handle: backupHandle,
              size: originalFile.size
            });
            
            this.backupFiles.push({ original: originalName, backup: backupName, handle: backupHandle });
            this.log(`Archived ${originalName} → ${backupName}`);
            
          } catch (error) {
            this.log(`Error archiving ${file.name}: ${error.message}`, 'error');
          }
        }
      }

      this.log(`Successfully archived ${backups.length} legacy files`);
      return backups;
      
    } catch (error) {
      this.log(`Error during archiving: ${error.message}`, 'error');
      throw error;
    }
  }

  // Task 4.8: Rollback mechanism
  async rollbackMigration() {
    console.log('🔙 Migration: Rolling back migration...');
    
    try {
      const moatDir = await this.directoryHandle.getDirectoryHandle('.moat');
      let restoredCount = 0;

      for (const backup of this.backupFiles) {
        try {
          // Read backup content
          const backupFile = await backup.handle.getFile();
          const content = await backupFile.text();
          
          // Restore original file
          const originalHandle = await moatDir.getFileHandle(backup.original, { create: true });
          const writable = await originalHandle.createWritable({ keepExistingData: false });
          await writable.write(content);
          await writable.close();
          
          // Remove backup file
          await moatDir.removeEntry(backup.backup);
          
          restoredCount++;
          this.log(`Restored ${backup.original} from backup`);
          
        } catch (error) {
          this.log(`Error restoring ${backup.original}: ${error.message}`, 'error');
        }
      }

      // Clear new files if they exist
      try {
        await moatDir.removeEntry('moat-tasks.md');
        await moatDir.removeEntry('moat-tasks-detail.json');
        this.log('Removed new format files');
      } catch (error) {
        // Files might not exist, that's okay
      }

      this.log(`Rollback completed. Restored ${restoredCount} files`);
      return { success: true, restoredCount };
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Task 4.7: Migration status reporting and error logging
  async performMigration() {
    console.log('🚀 Migration: Starting legacy file migration...');
    this.migrationLog = [];
    this.backupFiles = [];
    
    const migrationResult = {
      success: false,
      tasksConverted: 0,
      filesArchived: 0,
      errors: [],
      warnings: [],
      startTime: new Date().toISOString(),
      endTime: null
    };

    try {
      // Step 1: Detect legacy files
      await this.detectLegacyFiles();
      
      if (this.legacyFiles.length === 0) {
        this.log('No legacy files found. Migration not needed.');
        migrationResult.success = true;
        migrationResult.endTime = new Date().toISOString();
        return migrationResult;
      }

      // Step 2: Parse legacy data
      const legacyData = {};
      
      if (this.legacyFiles.find(f => f.name === '.moat-stream.jsonl')) {
        legacyData.jsonlAnnotations = await this.parseJsonlStream(this.legacyFiles.find(f => f.name === '.moat-stream.jsonl').handle);
      }
      
      if (this.legacyFiles.find(f => f.name === 'moat-tasks-summary.md')) {
        legacyData.summaryTasks = await this.parseSummaryMarkdown(this.legacyFiles.find(f => f.name === 'moat-tasks-summary.md').handle);
      }
      
      if (this.legacyFiles.find(f => f.name === 'moat-tasks.md')) {
        legacyData.detailedTasks = await this.parseDetailedMarkdown(this.legacyFiles.find(f => f.name === 'moat-tasks.md').handle);
      }

      // Step 3: Convert to new schema
      const convertedTasks = this.convertToNewSchema(legacyData);
      migrationResult.tasksConverted = convertedTasks.length;

      // Step 4: Archive legacy files
      const archivedFiles = await this.archiveLegacyFiles();
      migrationResult.filesArchived = archivedFiles.length;

      // Step 5: Save to new format
      if (convertedTasks.length > 0) {
        // Save to TaskStore
        for (const task of convertedTasks) {
          await this.taskStore.addTask(task);
        }
        
        // Generate markdown
        await this.markdownGenerator.rebuildMarkdownFromJson(convertedTasks);
        
        this.log(`Saved ${convertedTasks.length} tasks to new format`);
      }

      // Step 6: Clean up legacy files (after successful backup)
      await this.cleanupLegacyFiles();

      migrationResult.success = true;
      migrationResult.endTime = new Date().toISOString();
      
      this.log(`Migration completed successfully! Converted ${convertedTasks.length} tasks, archived ${archivedFiles.length} files`);
      
    } catch (error) {
      migrationResult.success = false;
      migrationResult.errors.push(error.message);
      migrationResult.endTime = new Date().toISOString();
      
      this.log(`Migration failed: ${error.message}`, 'error');
      
      // Attempt rollback on failure
      try {
        await this.rollbackMigration();
        this.log('Rollback completed after migration failure');
      } catch (rollbackError) {
        this.log(`Rollback also failed: ${rollbackError.message}`, 'error');
        migrationResult.errors.push(`Rollback failed: ${rollbackError.message}`);
      }
    }

    // Collect warnings from log
    migrationResult.warnings = this.migrationLog
      .filter(entry => entry.level === 'warn')
      .map(entry => entry.message);
    
    migrationResult.errors.push(...this.migrationLog
      .filter(entry => entry.level === 'error')
      .map(entry => entry.message));

    return migrationResult;
  }

  // Clean up original legacy files after successful backup
  async cleanupLegacyFiles() {
    console.log('🧹 Migration: Cleaning up original legacy files...');
    
    try {
      const moatDir = await this.directoryHandle.getDirectoryHandle('.moat');
      
      for (const file of this.legacyFiles) {
        if (file.handle && typeof file.handle === 'object' && file.name) {
          try {
            await moatDir.removeEntry(file.name);
            this.log(`Removed original file: ${file.name}`);
          } catch (error) {
            this.log(`Could not remove ${file.name}: ${error.message}`, 'warn');
          }
        }
      }
      
    } catch (error) {
      this.log(`Error during cleanup: ${error.message}`, 'warn');
    }
  }

  // Utility functions
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  extractElementLabel(target) {
    if (!target) return null;
    
    // Extract meaningful label from CSS selector
    if (target.includes('#')) {
      const id = target.match(/#([^.\s\[]+)/)?.[1];
      if (id) return `#${id}`;
    }
    
    if (target.includes('.')) {
      const className = target.match(/\.([^#\s\[]+)/)?.[1];
      if (className) return `.${className}`;
    }
    
    const tagMatch = target.match(/^([a-zA-Z]+)/);
    if (tagMatch) return `<${tagMatch[1]}>`;
    
    return target.length > 20 ? target.substring(0, 20) + '...' : target;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.migrationLog.push(logEntry);
    
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} Migration: ${message}`);
  }

  // Get migration report
  getMigrationReport() {
    return {
      log: this.migrationLog,
      backupFiles: this.backupFiles,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Task 4.6: Create backup files with timestamped names
   */
  async archiveLegacyFiles() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backups = [];

    for (const file of this.legacyFiles) {
      try {
        const backupName = `${file.name}.backup-${timestamp}`;
        const backupHandle = await this.directoryHandle.getFileHandle(backupName, { create: true });
        
        // Copy original content to backup
        const originalFile = await file.handle.getFile();
        const content = await originalFile.text();

        const writable = await backupHandle.createWritable({ keepExistingData: false });
        await writable.write(content);
        await writable.close();
        
        backups.push({
          original: file.name,
          backup: backupName,
          handle: backupHandle,
          size: originalFile.size
        });
        
        console.log(`✓ Archived ${file.name} → ${backupName}`);
      } catch (error) {
        console.error(`✗ Failed to archive ${file.name}:`, error);
      }
    }
    
    return backups;
  }

  /**
   * Task 4.7: Write converted data to new format files
   */
  async writeNewFormatFiles(tasks) {
    try {
      // Write moat-tasks-detail.json
      const detailHandle = await this.directoryHandle.getFileHandle('moat-tasks-detail.json', { create: true });
      const detailWritable = await detailHandle.createWritable({ keepExistingData: false });
      await detailWritable.write(JSON.stringify(tasks, null, 2));
      await detailWritable.close();

      // Generate and write moat-tasks.md
      const markdownContent = this.generateMarkdownFromTasks(tasks);
      const markdownHandle = await this.directoryHandle.getFileHandle('moat-tasks.md', { create: true });
      const markdownWritable = await markdownHandle.createWritable({ keepExistingData: false });
      await markdownWritable.write(markdownContent);
      await markdownWritable.close();
      
      console.log(`✓ Created moat-tasks-detail.json with ${tasks.length} tasks`);
      console.log(`✓ Generated moat-tasks.md from task data`);
      
      return {
        detailFile: 'moat-tasks-detail.json',
        markdownFile: 'moat-tasks.md',
        taskCount: tasks.length
      };
    } catch (error) {
      console.error('✗ Failed to write new format files:', error);
      throw error;
    }
  }

  /**
   * Task 4.8: Generate markdown content from task data
   */
  generateMarkdownFromTasks(tasks) {
    let markdown = '# Moat Tasks\n\n';
    
    // Add statistics
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    
    markdown += `**Statistics:** ${completed} completed, ${inProgress} in progress, ${pending} pending\n\n`;
    
    // Add tasks in reverse chronological order (newest first)
    const sortedTasks = [...tasks].sort((a, b) => new Date(b.created) - new Date(a.created));
    
    sortedTasks.forEach((task, index) => {
      const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
      const statusEmoji = task.status === 'completed' ? '✅' : 
                         task.status === 'in-progress' ? '🔄' : '📋';
      
      markdown += `${index + 1}. ${checkbox} ${statusEmoji} **${task.title}**\n`;
      if (task.description) {
        markdown += `   - ${task.description}\n`;
      }
      if (task.elementLabel) {
        markdown += `   - Element: ${task.elementLabel}\n`;
      }
      if (task.targetFile) {
        markdown += `   - File: ${task.targetFile}\n`;
      }
      markdown += '\n';
    });
    
    return markdown;
  }

  /**
   * Task 4.9: Complete migration process with validation
   */
  async performMigration() {
    try {
      console.log('🔄 Starting legacy file migration...');
      
      // Step 1: Detect legacy files
      await this.detectLegacyFiles();
      if (this.legacyFiles.length === 0) {
        console.log('ℹ️ No legacy files found to migrate');
        return { success: true, message: 'No migration needed' };
      }
      
      console.log(`📁 Found ${this.legacyFiles.length} legacy files to migrate`);
      
      // Step 2: Parse and convert data
      const tasks = await this.convertToNewSchema();
      if (tasks.length === 0) {
        console.log('⚠️ No valid task data found in legacy files');
        return { success: false, message: 'No valid data to migrate' };
      }
      
      console.log(`�� Converted ${tasks.length} tasks from legacy format`);
      
      // Step 3: Create backups
      const backups = await this.archiveLegacyFiles();
      console.log(`💾 Created ${backups.length} backup files`);
      
      // Step 4: Write new format files
      const result = await this.writeNewFormatFiles(tasks);
      
      // Step 5: Validation
      const validation = await this.validateMigration(tasks);
      
      if (validation.success) {
        console.log('✅ Migration completed successfully!');
        return {
          success: true,
          message: 'Migration completed',
          stats: {
            legacyFiles: this.legacyFiles.length,
            tasksConverted: tasks.length,
            backupsCreated: backups.length,
            newFiles: 2
          },
          validation
        };
      } else {
        throw new Error(`Migration validation failed: ${validation.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Task 4.10: Validate migration results
   */
  async validateMigration(originalTasks) {
    const errors = [];
    const warnings = [];
    
    try {
      // Check if new files exist and are readable
      const detailHandle = await this.directoryHandle.getFileHandle('moat-tasks-detail.json');
      const markdownHandle = await this.directoryHandle.getFileHandle('moat-tasks.md');
      
      // Validate JSON file content
      const detailFile = await detailHandle.getFile();
      const detailContent = await detailFile.text();
      const parsedTasks = JSON.parse(detailContent);
      
      if (!Array.isArray(parsedTasks)) {
        errors.push('Detail file does not contain valid task array');
      } else if (parsedTasks.length !== originalTasks.length) {
        errors.push(`Task count mismatch: expected ${originalTasks.length}, got ${parsedTasks.length}`);
      }
      
      // Validate markdown file exists and has content
      const markdownFile = await markdownHandle.getFile();
      const markdownContent = await markdownFile.text();
      
      if (markdownContent.length < 50) {
        warnings.push('Markdown file seems unusually short');
      }
      
      // Validate task structure
      let validTasks = 0;
      for (const task of parsedTasks) {
        if (task.id && task.title && task.status && task.created) {
          validTasks++;
        } else {
          warnings.push(`Task missing required fields: ${task.id || 'unknown'}`);
        }
      }
      
      if (validTasks < parsedTasks.length * 0.9) {
        errors.push(`Too many invalid tasks: only ${validTasks}/${parsedTasks.length} are valid`);
      }
      
      // Check for data preservation
      const originalIds = new Set(originalTasks.map(t => t.id));
      const migratedIds = new Set(parsedTasks.map(t => t.id));
      const missingIds = [...originalIds].filter(id => !migratedIds.has(id));
      
      if (missingIds.length > 0) {
        errors.push(`Missing tasks after migration: ${missingIds.join(', ')}`);
      }
      
      console.log(`✓ Validation: ${validTasks}/${parsedTasks.length} valid tasks`);
      if (warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', warnings);
      }
      
      return {
        success: errors.length === 0,
        errors,
        warnings,
        stats: {
          totalTasks: parsedTasks.length,
          validTasks,
          missingTasks: missingIds.length,
          markdownSize: markdownContent.length
        }
      };
      
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Integration helper: Check if migration is needed
   */
  static async migrationNeeded(directoryHandle) {
    try {
      const migrator = new LegacyFileMigrator(directoryHandle);
      await migrator.detectLegacyFiles();
      
      // Check if new format files already exist
      try {
        await directoryHandle.getFileHandle('moat-tasks-detail.json');
        await directoryHandle.getFileHandle('moat-tasks.md');
        return false; // New format already exists
      } catch {
        // New format doesn't exist, check for legacy
        return migrator.legacyFiles.length > 0;
      }
    } catch {
      return false;
    }
  }

  /**
   * Integration helper: Quick migration status check
   */
  async getMigrationStatus() {
    await this.detectLegacyFiles();
    
    let newFormatExists = false;
    try {
      await this.directoryHandle.getFileHandle('moat-tasks-detail.json');
      await this.directoryHandle.getFileHandle('moat-tasks.md');
      newFormatExists = true;
    } catch {
      newFormatExists = false;
    }
    
    return {
      hasLegacyFiles: this.legacyFiles.length > 0,
      hasNewFormat: newFormatExists,
      legacyFileCount: this.legacyFiles.length,
      needsMigration: this.legacyFiles.length > 0 && !newFormatExists
    };
  }
}

// Export for use in Chrome extension
if (typeof window !== 'undefined') {
  window.LegacyFileMigrator = LegacyFileMigrator;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LegacyFileMigrator;
} 