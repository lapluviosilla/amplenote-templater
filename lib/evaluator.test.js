// evaluator.test.js
import { jest } from "@jest/globals";
import { evaluateExpression } from "./evaluator";
import { addMonths, endOfMonth } from "date-fns";

// Test helper function to create date in local time zone
const createLocalDate = (
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) => {
  return new Date(year, month - 1, day, hour, minute, second, millisecond);
};

describe("evaluateExpression", () => {
  // Fixed system time for deterministic tests: April 27, 2024, 10:00:00 AM
  const fixedDate = new Date("2024-04-27T10:00:00");

  beforeAll(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(fixedDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // Helper function to create expected Date objects
  const createDate = (dateString) => new Date(dateString);

  describe("Math Expressions", () => {
    test("should evaluate simple addition {1+1}", () => {
      const input = "{1+1}";
      const expected = { type: "math", result: 2 };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should evaluate simple subtraction {12-3-1}", () => {
      const input = "{12-3-1}";
      const expected = { type: "math", result: 8 };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should evaluate expression with pi {pi*10**2}", () => {
      const input = "{pi*10**2}";
      const expected = { type: "math", result: Math.PI * Math.pow(10, 2) };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should evaluate complex math expression {(1+1)*(12/36)}", () => {
      const input = "{(1+1)*(12/36)}";
      const expected = { type: "math", result: (1 + 1) * (12 / 36) };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should ignore whitespace", () => {
      const input = "{   1 - 3 -1 * (12/36)*pi  + 4 }";
      const expected = {
        type: "math",
        result: 1 - 3 - 1 * (12 / 36) * Math.PI + 4,
      };
      expect(evaluateExpression(input)).toEqual(expected);
    });
  });

  describe("Date Expressions", () => {
    test("should evaluate {Today}", () => {
      const input = "{Today}";
      const expectedDate = new Date(fixedDate);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tomorrow}", () => {
      const input = "{Tomorrow}";
      const expectedDate = new Date(fixedDate);
      expectedDate.setDate(expectedDate.getDate() + 1);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Yesterday}", () => {
      const input = "{Yesterday}";
      const expectedDate = new Date(fixedDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate absolute date {October 31st}", () => {
      const input = "{October 31st}";
      const expectedDate = createLocalDate(2024, 10, 31, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate abbreviated month {Oct 31}", () => {
      const input = "{Oct 31}";
      const expectedDate = createLocalDate(2024, 10, 31, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {End of March}", () => {
      const input = "{End of March}";
      const expectedDate = endOfMonth(createLocalDate(2024, 3, 1, 0, 0, 0, 0));
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Beginning of April}", () => {
      const input = "{Beginning of April}";
      const expectedDate = createLocalDate(2024, 4, 1, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {First Monday of September}", () => {
      const input = "{First Monday of September}";
      const expectedDate = createLocalDate(2024, 9, 2, 0, 0, 0, 0); // September 2, 2024 is a Monday
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Last Friday of December}", () => {
      const input = "{Last Friday of December}";
      const expectedDate = createLocalDate(2024, 12, 27, 0, 0, 0, 0); // December 27, 2024, 00:00:00.000
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe("Relative Date Expressions", () => {
    test("should evaluate {Next Monday}", () => {
      const input = "{Next Monday}";
      const expectedDate = createLocalDate(2024, 4, 29, 10, 0, 0, 0); // Next Monday after April 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Last week}", () => {
      const input = "{Last week}";
      const expectedDate = new Date(fixedDate);
      expectedDate.setDate(expectedDate.getDate() - 7);
      expect(evaluateExpression(input).type).toBe("date");
      expect(evaluateExpression(input).result.getTime()).toBe(
        expectedDate.getTime()
      );
    });

    test("should evaluate {Next year}", () => {
      const input = "{Next year}";
      const expectedDate = new Date("2025-04-27T10:00:00"); // April 27, 2025
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In 14 days}", () => {
      const input = "{In 14 days}";
      const expectedDate = new Date("2024-05-11T10:00:00"); // 14 days after April 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {A month ago}", () => {
      const input = "{A month ago}";
      const expectedDate = new Date("2024-03-27T10:00:00"); // March 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {End of next month}", () => {
      const input = "{End of next month}";
      const expectedDate = endOfMonth(addMonths(fixedDate, 1)); // End of May 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe("Time Expressions", () => {
    test("should evaluate {Now}", () => {
      const input = "{Now}";
      const expectedDate = new Date(fixedDate);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {10 minutes ago}", () => {
      const input = "{10 minutes ago}";
      const expectedDate = new Date("2024-04-27T09:50:00");
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In three hours}", () => {
      const input = "{In three hours}";
      const expectedDate = new Date("2024-04-27T13:00:00");
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {9 pm}", () => {
      const input = "{9 pm}";
      const expectedDate = createLocalDate(2024, 4, 27, 21, 0, 0, 0); // 9 PM
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {21:30}", () => {
      const input = "{21:30}";
      const expectedDate = createLocalDate(2024, 4, 27, 21, 30, 0, 0); // 21:30
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe("Date and Time Expressions", () => {
    test("should evaluate {Today at 8pm}", () => {
      const input = "{Today at 8pm}";
      const expectedDate = createLocalDate(2024, 4, 27, 20, 0, 0, 0); // Today at 8 PM
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tomorrow at 10:45}", () => {
      const input = "{Tomorrow at 10:45}";
      const expectedDate = createLocalDate(2024, 4, 28, 10, 45, 0, 0); // Tomorrow at 10:45 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tuesday 22:00}", () => {
      const input = "{Tuesday 22:00}";
      const expectedDate = createLocalDate(2024, 4, 30, 22, 0, 0, 0); // Next Tuesday at 22:00
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Mar 12 8am}", () => {
      const input = "{Mar 12 8am}";
      const expectedDate = createLocalDate(2024, 3, 12, 8, 0, 0, 0); // March 12 at 8 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe("Format Specifier", () => {
    test('should evaluate formatted date {"MM-dd-yyyy":Tomorrow}', () => {
      const input = '{"MM-dd-yyyy":Tomorrow}';
      const expected = { type: "date", result: "04-28-2024" };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test('should evaluate formatted date {"yyyy/MM/dd":End of March}', () => {
      const input = '{"yyyy/MM/dd":End of March}';
      const expected = { type: "date", result: "2024/03/31" };
      expect(evaluateExpression(input)).toEqual(expected);
    });
  });

  describe("Unhandled Expressions", () => {
    test("should mark unsupported expression as unhandled {Every week on Monday and Thursday}", () => {
      const input = "{Every week on Monday and Thursday}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark unsupported expression as unhandled {toc}", () => {
      const input = "{toc}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark malformed expression as unhandled missing braces", () => {
      const input = "1+1";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test('should mark unsupported format specifier as unhandled {"invalid":Today}', () => {
      const input = '{"invalid":Today}';
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });
  });
});
