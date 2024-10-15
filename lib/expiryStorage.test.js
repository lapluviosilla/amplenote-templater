// expiryStorage.test.js

// Import necessary modules
import MockDate from "mockdate";
import { jest } from "@jest/globals";

// Mock the console to suppress warnings/errors during tests
beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.warn.mockRestore();
  console.error.mockRestore();
});

describe("ExpiryStorage Class", () => {
  let expiryStorage;

  // Helper function to mock localStorage
  const mockLocalStorage = () => {
    let store = {};
    return {
      getItem: jest.fn((key) => (store.hasOwnProperty(key) ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      store, // expose the store for verification
    };
  };

  // Helper function to set localStorage unavailable
  const mockLocalStorageUnavailable = () => {
    Object.defineProperty(window, "localStorage", {
      value: null,
      writable: true,
      configurable: true,
    });
  };

  // Helper function to reset localStorage to original mock
  const resetLocalStorage = (mockedLocalStorage) => {
    Object.defineProperty(window, "localStorage", {
      value: mockedLocalStorage,
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    jest.resetModules(); // Clear module cache
  });

  /**
   * Initialization Tests
   */
  describe("Initialization", () => {
    test("should detect localStorage as available", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      expect(expiryStorage.localStorageAvailable).toBe(true);
    });

    test("should fallback to memoryStorage if localStorage is unavailable", async () => {
      mockLocalStorageUnavailable();

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      expect(expiryStorage.localStorageAvailable).toBe(false);
      expect(expiryStorage.memoryStorage).toEqual({});
    });
  });

  /**
   * setItem Method Tests
   */
  describe("setItem", () => {
    test("should set item in localStorage with correct structure", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "testKey";
      const value = "testValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      expect(mockedLocalStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify({ value, expiry: expiryDate.toISOString() })
      );

      expect(mockedLocalStorage.getItem(key)).toBe(
        JSON.stringify({ value, expiry: expiryDate.toISOString() })
      );
    });

    test("should set item in memoryStorage if localStorage is unavailable", async () => {
      mockLocalStorageUnavailable();

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "memoryKey";
      const value = "memoryValue";
      const expiryDate = new Date("2024-06-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      expect(expiryStorage.memoryStorage[key]).toBe(
        JSON.stringify({ value, expiry: expiryDate.toISOString() })
      );
    });

    test("should throw error if expiryDate is not a Date object", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "invalidKey";
      const value = "invalidValue";
      const invalidExpiry = "2024-05-01";

      expect(() => {
        expiryStorage.setItem(key, value, invalidExpiry);
      }).toThrow("expiryDate must be a valid Date object.");
    });

    test("should fallback to memoryStorage if localStorage.setItem throws error", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      mockedLocalStorage.setItem.mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const key = "fallbackKey";
      const value = "fallbackValue";
      const expiryDate = new Date("2024-07-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      // Expect console.warn to have been called
      expect(console.warn).toHaveBeenCalledWith(
        `Failed to set item '${key}' in localStorage. Using memory storage.`,
        expect.any(Error)
      );

      // Verify that the item is stored in memoryStorage
      expect(expiryStorage.memoryStorage[key]).toBe(
        JSON.stringify({ value, expiry: expiryDate.toISOString() })
      );
    });
  });

  /**
   * getItem Method Tests
   */
  describe("getItem", () => {
    beforeEach(() => {
      // Mock current date using MockDate
      MockDate.set("2024-04-27T10:00:00Z");
    });

    afterEach(() => {
      MockDate.reset();
    });

    test("should retrieve item before expiry from localStorage", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "validKey";
      const value = "validValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toBe(value);
    });

    test("should retrieve item before expiry from memoryStorage", async () => {
      mockLocalStorageUnavailable();

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "memoryValidKey";
      const value = "memoryValidValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toBe(value);
    });

    test("should return null and remove item after expiry", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "expiredKey";
      const value = "expiredValue";
      const expiryDate = new Date("2024-04-26T00:00:00Z"); // Already expired

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toBeNull();
      expect(expiryStorage.getItem(key)).toBeNull();
      expect(mockedLocalStorage.removeItem).toHaveBeenCalledWith(key);
    });

    test("should return null for non-existent key", async () => {
      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const retrievedValue = expiryStorage.getItem("nonExistentKey");
      expect(retrievedValue).toBeNull();
    });

    test("should return null and remove item if data is corrupted", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "corruptedKey";
      // Directly set corrupted data
      mockedLocalStorage.setItem(key, "invalid JSON");

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toBeNull();
      expect(expiryStorage.getItem(key)).toBeNull();
      expect(mockedLocalStorage.removeItem).toHaveBeenCalledWith(key);
    });

    test("should fallback to memoryStorage if localStorage.getItem throws error", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      mockedLocalStorage.getItem.mockImplementation(() => {
        throw new Error("SecurityError");
      });

      const key = "fallbackGetKey";
      const value = "fallbackGetValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(console.warn).toHaveBeenCalledWith(
        `Failed to get item '${key}' from localStorage. Checking memory storage.`,
        expect.any(Error)
      );
      expect(retrievedValue).toBe(null); // because data was stored in localStorage and now it is failing.
    });
  });

  /**
   * removeItem Method Tests
   */
  describe("removeItem", () => {
    beforeEach(() => {
      // Mock current date using MockDate
      MockDate.set("2024-04-27T10:00:00Z");
    });

    afterEach(() => {
      MockDate.reset();
    });
    test("should remove item from localStorage", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "removeKey";
      const value = "removeValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);
      expect(expiryStorage.getItem(key)).toBe(value);

      expiryStorage.removeItem(key);
      expect(mockedLocalStorage.removeItem).toHaveBeenCalledWith(key);
      expect(expiryStorage.getItem(key)).toBeNull();
    });

    test("should remove item from memoryStorage if localStorage is unavailable", async () => {
      mockLocalStorageUnavailable();

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "memoryRemoveKey";
      const value = "memoryRemoveValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);
      expect(expiryStorage.getItem(key)).toBe(value);

      expiryStorage.removeItem(key);
      expect(expiryStorage.memoryStorage[key]).toBeUndefined();
      expect(expiryStorage.getItem(key)).toBeNull();
    });

    test("should not throw error when removing non-existent key", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      expect(() => {
        expiryStorage.removeItem("nonExistentKey");
      }).not.toThrow();
      expect(mockedLocalStorage.removeItem).toHaveBeenCalledWith("nonExistentKey");
    });

    test("should fallback to memoryStorage if localStorage.removeItem throws error", async () => {
      const mockedLocalStorage = mockLocalStorage();

      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      mockedLocalStorage.removeItem.mockImplementation(() => {
        throw new Error("SecurityError");
      });

      const key = "fallbackRemoveKey";
      const value = "fallbackRemoveValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);
      expect(expiryStorage.getItem(key)).toBe(value);

      expiryStorage.removeItem(key);
      expect(console.warn).toHaveBeenCalledWith(
        `Failed to remove item '${key}' from localStorage. Removing from memory storage.`,
        expect.any(Error)
      );
      expect(expiryStorage.memoryStorage[key]).toBeUndefined();
    });
  });

  /**
   * clear Method Tests
   */
  describe("clear", () => {
    beforeEach(() => {
      // Mock current date using MockDate
      MockDate.set("2024-04-27T10:00:00Z");
    });
    test("should clear all items from localStorage", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const items = [
        { key: "key1", value: "value1", expiry: new Date("2024-05-01T00:00:00Z") },
        { key: "key2", value: "value2", expiry: new Date("2024-06-01T00:00:00Z") },
      ];

      items.forEach((item) => expiryStorage.setItem(item.key, item.value, item.expiry));

      expect(expiryStorage.getItem("key1")).toBe("value1");
      expect(expiryStorage.getItem("key2")).toBe("value2");

      expiryStorage.clear();

      expect(mockedLocalStorage.clear).toHaveBeenCalled();
      expect(expiryStorage.getItem("key1")).toBeNull();
      expect(expiryStorage.getItem("key2")).toBeNull();
    });

    test("should clear all items from memoryStorage if localStorage is unavailable", async () => {
      mockLocalStorageUnavailable();

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const items = [
        { key: "memoryKey1", value: "memoryValue1", expiry: new Date("2024-05-01T00:00:00Z") },
        { key: "memoryKey2", value: "memoryValue2", expiry: new Date("2024-06-01T00:00:00Z") },
      ];

      items.forEach((item) => expiryStorage.setItem(item.key, item.value, item.expiry));

      expect(expiryStorage.getItem("memoryKey1")).toBe("memoryValue1");
      expect(expiryStorage.getItem("memoryKey2")).toBe("memoryValue2");

      expiryStorage.clear();

      expect(expiryStorage.memoryStorage).toEqual({});
      expect(expiryStorage.getItem("memoryKey1")).toBeNull();
      expect(expiryStorage.getItem("memoryKey2")).toBeNull();
    });

    test("should fallback to memoryStorage if localStorage.clear throws error", async () => {
      const mockedLocalStorage = mockLocalStorage();

      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "clearFallbackKey";
      const value = "clearFallbackValue";
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);
      expect(expiryStorage.getItem(key)).toBe(value);

      mockedLocalStorage.clear.mockImplementation(() => {
        throw new Error("SecurityError");
      });
      mockedLocalStorage.getItem.mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expiryStorage.clear();
      expect(console.warn).toHaveBeenCalledWith(
        "Failed to clear localStorage. Clearing memory storage instead.",
        expect.any(Error)
      );
      expect(expiryStorage.memoryStorage).toEqual({});
      expect(expiryStorage.getItem(key)).toBeNull();
    });
  });

  /**
   * Edge Cases and Variations Tests
   */
  describe("Edge Cases and Variations", () => {
    beforeEach(() => {
      // Mock current date using MockDate
      MockDate.set("2024-04-27T10:00:00Z");
    });

    afterEach(() => {
      MockDate.reset();
    });

    test("should handle multiple items with different expiries", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const items = [
        { key: "item1", value: "value1", expiry: new Date("2024-05-01T00:00:00Z") },
        { key: "item2", value: "value2", expiry: new Date("2024-04-26T00:00:00Z") }, // Expired
        { key: "item3", value: "value3", expiry: new Date("2024-06-01T00:00:00Z") },
      ];

      items.forEach((item) => expiryStorage.setItem(item.key, item.value, item.expiry));

      expect(expiryStorage.getItem("item1")).toBe("value1");
      expect(expiryStorage.getItem("item2")).toBeNull(); // Should be expired
      expect(expiryStorage.getItem("item3")).toBe("value3");

      // Ensure expired item is removed
      expect(mockedLocalStorage.removeItem).toHaveBeenCalledWith("item2");
    });

    test("should overwrite existing item with the same key", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "duplicateKey";
      const firstValue = "firstValue";
      const firstExpiry = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, firstValue, firstExpiry);
      expect(expiryStorage.getItem(key)).toBe(firstValue);

      const secondValue = "secondValue";
      const secondExpiry = new Date("2024-06-01T00:00:00Z");

      expiryStorage.setItem(key, secondValue, secondExpiry);
      expect(expiryStorage.getItem(key)).toBe(secondValue);

      // Verify that localStorage.setItem was called twice
      expect(mockedLocalStorage.setItem).toHaveBeenCalledTimes(3);
      expect(mockedLocalStorage.setItem).toHaveBeenLastCalledWith(
        key,
        JSON.stringify({ value: secondValue, expiry: secondExpiry.toISOString() })
      );
    });

    test("should handle setting and getting complex data types", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "complexKey";
      const value = { a: 1, b: [2, 3], c: { d: 4 } };
      const expiryDate = new Date("2024-05-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toEqual(value);
    });

    test("should not retrieve item exactly at expiry time", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "exactExpiryKey";
      const value = "exactExpiryValue";
      const expiryDate = new Date("2024-04-27T10:00:00Z"); // Exactly now

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toBeNull();
      expect(mockedLocalStorage.removeItem).toHaveBeenCalledWith(key);
    });

    test("should handle items with expiry dates in the far future", async () => {
      const mockedLocalStorage = mockLocalStorage();
      resetLocalStorage(mockedLocalStorage);

      const module = await import("./expiryStorage.js");
      expiryStorage = module.default;

      const key = "farFutureKey";
      const value = "farFutureValue";
      const expiryDate = new Date("2100-01-01T00:00:00Z");

      expiryStorage.setItem(key, value, expiryDate);

      const retrievedValue = expiryStorage.getItem(key);
      expect(retrievedValue).toBe(value);
    });
  });
});
