/**
 * Moat Safe Storage Utility
 * 
 * Provides protected access to localStorage with graceful error handling.
 * Prevents crashes when localStorage is unavailable or restricted.
 */

const MoatSafeStorage = {
  /**
   * Safely get an item from localStorage
   * @param {string} key - The storage key
   * @param {*} defaultValue - Default value if key doesn't exist or access fails
   * @returns {string|null} The stored value or defaultValue
   */
  getItem(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.warn('Moat SafeStorage: Failed to read from localStorage:', error.message);
      return defaultValue;
    }
  },

  /**
   * Safely set an item in localStorage
   * @param {string} key - The storage key
   * @param {string} value - The value to store
   * @returns {boolean} True if successful, false otherwise
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Moat SafeStorage: Failed to write to localStorage:', error.message);
      return false;
    }
  },

  /**
   * Safely remove an item from localStorage
   * @param {string} key - The storage key
   * @returns {boolean} True if successful, false otherwise
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Moat SafeStorage: Failed to remove from localStorage:', error.message);
      return false;
    }
  },

  /**
   * Safely get and parse JSON from localStorage
   * @param {string} key - The storage key
   * @param {*} defaultValue - Default value if key doesn't exist, access fails, or parse fails
   * @returns {*} The parsed value or defaultValue
   */
  getJSON(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      return JSON.parse(value);
    } catch (error) {
      console.warn('Moat SafeStorage: Failed to read/parse JSON from localStorage:', error.message);
      return defaultValue;
    }
  },

  /**
   * Safely stringify and set JSON in localStorage
   * @param {string} key - The storage key
   * @param {*} value - The value to stringify and store
   * @returns {boolean} True if successful, false otherwise
   */
  setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Moat SafeStorage: Failed to write JSON to localStorage:', error.message);
      return false;
    }
  },

  /**
   * Check if localStorage is available and accessible
   * @returns {boolean} True if localStorage is available
   */
  isAvailable() {
    try {
      const testKey = '__moat_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Expose to global scope for use by other modules
if (typeof window !== 'undefined') {
  window.MoatSafeStorage = MoatSafeStorage;
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MoatSafeStorage };
}


