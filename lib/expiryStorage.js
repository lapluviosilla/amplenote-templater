// expiryStorage.js

/**
 * ExpiryStorage Class
 * Provides methods to set, get, remove, and clear items with a custom expiry feature.
 */
class ExpiryStorage {
  constructor() {
    this.localStorageAvailable = this.checkLocalStorage();
    this.memoryStorage = {};
  }

  /**
   * Checks if localStorage is available and functional.
   * @returns {boolean} True if available, false otherwise.
   */
  checkLocalStorage() {
    try {
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, "test");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      // console.warn("localStorage is not available. Falling back to in-memory storage.", e);
      return false;
    }
  }

  /**
   * Sets an item with a custom expiration date.
   * @param {string} key - The key under which the value is stored.
   * @param {*} value - The value to store (will be serialized to JSON).
   * @param {Date} expiryDate - The exact date and time when the item should expire.
   */
  setItem(key, value, expiryDate) {
    if (!(expiryDate instanceof Date)) {
      throw new Error("expiryDate must be a valid Date object.");
    }

    const item = {
      value,
      expiry: expiryDate.toISOString(), // Store as ISO string
    };
    const serializedItem = JSON.stringify(item);

    if (this.localStorageAvailable) {
      try {
        window.localStorage.setItem(key, serializedItem);
      } catch (e) {
        console.warn(`Failed to set item '${key}' in localStorage. Using memory storage.`, e);
        this.memoryStorage[key] = serializedItem;
      }
    } else {
      this.memoryStorage[key] = serializedItem;
    }
  }

  /**
   * Retrieves an item by key. Returns null if not found or expired.
   * @param {string} key - The key to retrieve.
   * @returns {*} The stored value or null.
   */
  getItem(key) {
    let serializedItem;

    if (this.localStorageAvailable) {
      try {
        serializedItem = window.localStorage.getItem(key);
      } catch (e) {
        console.warn(`Failed to get item '${key}' from localStorage. Checking memory storage.`, e);
        serializedItem = this.memoryStorage[key] || null;
      }
    } else {
      serializedItem = this.memoryStorage[key] || null;
    }

    if (!serializedItem) {
      return null;
    }

    try {
      const item = JSON.parse(serializedItem);
      const now = new Date();

      const expiryDate = new Date(item.expiry);
      if (now >= expiryDate) {
        // Item has expired
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (e) {
      console.error(`Failed to parse item '${key}'. Removing it.`, e);
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Removes an item by key.
   * @param {string} key - The key to remove.
   */
  removeItem(key) {
    if (this.localStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn(
          `Failed to remove item '${key}' from localStorage. Removing from memory storage.`,
          e
        );
        delete this.memoryStorage[key];
      }
    } else {
      delete this.memoryStorage[key];
    }
  }

  /**
   * Clears all items from storage.
   */
  clear() {
    if (this.localStorageAvailable) {
      try {
        window.localStorage.clear();
      } catch (e) {
        console.warn("Failed to clear localStorage. Clearing memory storage instead.", e);
        this.memoryStorage = {};
      }
    } else {
      this.memoryStorage = {};
    }
  }
}

// Export a singleton instance
const expiryStorage = new ExpiryStorage();
export default expiryStorage;
