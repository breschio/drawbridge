/**
 * Moat Persistence Utility - Directory Handle Management
 * 
 * Provides robust persistence for File System Access API directory handles
 * using IndexedDB with permission verification and graceful fallbacks.
 */

class MoatPersistence {
  constructor() {
    this.DB_NAME = 'MoatPersistence';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'directoryHandles';
    this.db = null;
  }

  /**
   * Initialize IndexedDB connection
   */
  async initialize() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('🔴 Moat Persistence: Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Moat Persistence: IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for directory handles
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('origin', 'origin', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('🔧 Moat Persistence: Created IndexedDB object store');
        }
      };
    });
  }

  /**
   * Store a directory handle with metadata
   */
  async storeDirectoryHandle(projectId, directoryHandle, metadata = {}) {
    try {
      await this.initialize();

      // Verify we can store the handle
      if (!directoryHandle || typeof directoryHandle.getDirectoryHandle !== 'function') {
        throw new Error('Invalid directory handle provided');
      }

      const record = {
        id: projectId,
        handle: directoryHandle,
        origin: window.location.origin,
        timestamp: Date.now(),
        path: metadata.path || 'Unknown',
        ...metadata
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(record);

        request.onsuccess = () => {
          console.log('✅ Moat Persistence: Directory handle stored successfully');
          resolve(true);
        };

        request.onerror = () => {
          console.error('🔴 Moat Persistence: Failed to store directory handle:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('🔴 Moat Persistence: Store operation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve a stored directory handle
   */
  async getDirectoryHandle(projectId) {
    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(projectId);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.handle) {
            console.log('✅ Moat Persistence: Directory handle retrieved successfully');
            resolve(result);
          } else {
            console.log('ℹ️ Moat Persistence: No stored handle found for:', projectId);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('🔴 Moat Persistence: Failed to retrieve directory handle:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('🔴 Moat Persistence: Retrieve operation failed:', error);
      return null;
    }
  }

  /**
   * Verify that we still have permission to access a directory handle
   */
  async verifyPermission(directoryHandle, mode = 'readwrite') {
    try {
      if (!directoryHandle || typeof directoryHandle.queryPermission !== 'function') {
        return false;
      }

      const permission = await directoryHandle.queryPermission({ mode });
      return permission === 'granted';
    } catch (error) {
      console.error('🔴 Moat Persistence: Permission verification failed:', error);
      return false;
    }
  }

  /**
   * Request permission for a directory handle
   */
  async requestPermission(directoryHandle, mode = 'readwrite') {
    try {
      if (!directoryHandle || typeof directoryHandle.requestPermission !== 'function') {
        return false;
      }

      const permission = await directoryHandle.requestPermission({ mode });
      return permission === 'granted';
    } catch (error) {
      console.error('🔴 Moat Persistence: Permission request failed:', error);
      return false;
    }
  }

  /**
   * Test if a directory handle is still valid by attempting to access it
   */
  async testDirectoryAccess(directoryHandle) {
    try {
      if (!directoryHandle) return false;

      // Try to access the directory properties
      const name = directoryHandle.name;
      
      // Try to iterate entries (this will fail if permission is lost)
      const entries = directoryHandle.values();
      await entries.next();
      
      return true;
    } catch (error) {
      console.log('ℹ️ Moat Persistence: Directory access test failed:', error.message);
      return false;
    }
  }

  /**
   * Remove a stored directory handle
   */
  async removeDirectoryHandle(projectId) {
    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(projectId);

        request.onsuccess = () => {
          console.log('✅ Moat Persistence: Directory handle removed successfully');
          resolve(true);
        };

        request.onerror = () => {
          console.error('🔴 Moat Persistence: Failed to remove directory handle:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('🔴 Moat Persistence: Remove operation failed:', error);
      return false;
    }
  }

  /**
   * Get all stored directory handles for debugging
   */
  async getAllHandles() {
    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('🔴 Moat Persistence: GetAll operation failed:', error);
      return [];
    }
  }

  /**
   * Clean up old/invalid handles
   */
  async cleanupOldHandles(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    try {
      const allHandles = await this.getAllHandles();
      const now = Date.now();
      const cleaned = [];

      for (const record of allHandles) {
        const age = now - record.timestamp;
        
        if (age > maxAge) {
          await this.removeDirectoryHandle(record.id);
          cleaned.push(record.id);
          console.log(`🧹 Moat Persistence: Cleaned up old handle: ${record.id}`);
        }
      }

      return cleaned;
    } catch (error) {
      console.error('🔴 Moat Persistence: Cleanup operation failed:', error);
      return [];
    }
  }

  /**
   * Complete persistence workflow: store handle with all metadata
   */
  async persistProjectConnection(directoryHandle, projectPath) {
    try {
      const projectId = `project_${window.location.origin}`;
      
      const metadata = {
        path: projectPath,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        connectedAt: new Date().toISOString()
      };

      await this.storeDirectoryHandle(projectId, directoryHandle, metadata);
      
      console.log('✅ Moat Persistence: Project connection persisted successfully');
      return true;
    } catch (error) {
      console.error('🔴 Moat Persistence: Failed to persist project connection:', error);
      return false;
    }
  }

  /**
   * Complete restoration workflow: get handle and verify permissions
   */
  async restoreProjectConnection() {
    try {
      const projectId = `project_${window.location.origin}`;
      const record = await this.getDirectoryHandle(projectId);
      
      if (!record) {
        console.log('ℹ️ Moat Persistence: No stored connection found');
        return { success: false, reason: 'No stored connection' };
      }

      const { handle, path, timestamp } = record;
      
      // Test if handle is still accessible
      const isAccessible = await this.testDirectoryAccess(handle);
      if (!isAccessible) {
        console.log('ℹ️ Moat Persistence: Stored handle is no longer accessible');
        
        // Try to request permission again
        const permissionGranted = await this.requestPermission(handle);
        if (!permissionGranted) {
          console.log('❌ Moat Persistence: Permission could not be restored');
          return { 
            success: false, 
            reason: 'Permission denied',
            requiresReconnection: true,
            path 
          };
        }
      }

      // Verify we can create/access the .moat directory
      try {
        const moatDir = await handle.getDirectoryHandle('.moat', { create: true });
        
        console.log('✅ Moat Persistence: Project connection restored successfully');
        return {
          success: true,
          directoryHandle: handle,
          moatDirectory: moatDir,
          path,
          timestamp,
          restored: true
        };
      } catch (error) {
        console.error('🔴 Moat Persistence: Failed to access .moat directory:', error);
        return {
          success: false,
          reason: 'Cannot access .moat directory',
          path
        };
      }

    } catch (error) {
      console.error('🔴 Moat Persistence: Restoration failed:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Check if File System Access API is supported
   */
  static isSupported() {
    return 'showDirectoryPicker' in window && 'indexedDB' in window;
  }
}

// Create global instance
const moatPersistence = new MoatPersistence();

// Expose to global scope for use by other modules
if (typeof window !== 'undefined') {
  window.MoatPersistence = MoatPersistence;
  window.moatPersistence = moatPersistence;
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MoatPersistence, moatPersistence };
} 