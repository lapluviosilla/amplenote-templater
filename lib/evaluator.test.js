// evaluator.test.js
import { jest } from "@jest/globals";
import MockDate from "mockdate";
import { addMonths, addDays, addWeeks, subDays, endOfMonth, set } from "date-fns";

import { evaluateExpression } from "./evaluator.js";

// Helper function to create Date objects in local time zone
const createLocalDate = (year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) => {
  return new Date(year, month - 1, day, hour, minute, second, millisecond);
};

describe("Timezones", () => {
  it("should always be UTC", () => {
    expect(new Date().getTimezoneOffset()).toBe(0);
  });
});

describe("evaluateExpression", () => {
  // Fixed system time for deterministic tests: April 27, 2024, 10:00:00 AM
  let fixedDate;

  beforeAll(() => {
    fixedDate = createLocalDate(2024, 4, 27, 10, 0, 0, 0); // April 27, 2024, 10:00:00 AM local time
    MockDate.set(fixedDate); // Set the global Date to the fixed date
  });

  beforeEach(() => {
    MockDate.set(fixedDate);
  });

  afterAll(() => {
    MockDate.reset(); // Reset the global Date to its original state
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
      const expectedDate = set(new Date(fixedDate), {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate expression with extra whitespace {   Today   }", () => {
      const input = "{   Today   }";
      const expectedDate = set(new Date(fixedDate), {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tomorrow}", () => {
      const input = "{Tomorrow}";
      const expectedDate = set(new Date(fixedDate), {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      expectedDate.setDate(expectedDate.getDate() + 1);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Yesterday}", () => {
      const input = "{Yesterday}";
      const expectedDate = set(new Date(fixedDate), {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      expectedDate.setDate(expectedDate.getDate() - 1);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate single digit month and day {Mar 5}", () => {
      const input = "{Mar 5}";
      const expectedDate = createLocalDate(2024, 3, 5, 0, 0, 0, 0);
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

    // **New Test Cases for Days of the Week and Months of the Year**

    describe("Days of the Week", () => {
      test("should evaluate {Monday} to the Monday of the current week", () => {
        const input = "{Monday}";
        const expectedDate = createLocalDate(2024, 4, 22, 0, 0, 0, 0); // April 22, 2024 is a Monday
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });

      test("should evaluate {Sunday} to the Sunday of the current week", () => {
        const input = "{Sunday}";
        const expectedDate = createLocalDate(2024, 4, 21, 0, 0, 0, 0); // April 28, 2024 is a Sunday
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });

      test("should evaluate {Thursday} to the Thursday of the current week", () => {
        const input = "{Thursday}";
        const expectedDate = createLocalDate(2024, 4, 25, 0, 0, 0, 0); // April 28, 2024 is a Sunday
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });

      test("should evaluate {Saturday} to the current day if it's Saturday", () => {
        const input = "{Saturday}";
        const expectedDate = createLocalDate(2024, 4, 27, 0, 0, 0, 0); // April 27, 2024 is a Saturday
        MockDate.set(expectedDate);
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
        MockDate.set(fixedDate);
      });
    });

    describe("Months of the Year", () => {
      test("should evaluate {September} to September 1st of the current year", () => {
        const input = "{September}";
        const expectedDate = createLocalDate(2024, 9, 1, 0, 0, 0, 0); // September 1, 2024
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });

      test("should evaluate {October} to October 1st of the current year", () => {
        const input = "{October}";
        const expectedDate = createLocalDate(2024, 10, 1, 0, 0, 0, 0); // October 1, 2024
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });

      test("should evaluate {January} to January 1st of the current year", () => {
        const input = "{January}";
        const expectedDate = createLocalDate(2024, 1, 1, 0, 0, 0, 0); // January 1, 2024
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });
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

    test("should evaluate {February 29th} on a leap year", () => {
      const input = "{February 29th}";
      const expectedDate = createLocalDate(2024, 2, 29, 0, 0, 0, 0); // February 29, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should handle invalid February 29th on a non-leap year", () => {
      const input = "{February 29th}";
      // Change MockDate to a non-leap year
      const nonLeapYearDate = createLocalDate(2023, 2, 28, 0, 0, 0, 0); // February 28, 2023
      MockDate.set(nonLeapYearDate);
      const expectedDate = createLocalDate(2023, 3, 1, 0, 0, 0, 0); // Assuming fallback to March 1st
      const result = evaluateExpression(input);
      // Depending on implementation, expect either February 28 or an error/handled case
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
      // Reset MockDate to the original fixedDate
      MockDate.set(fixedDate);
    });
  });

  describe("Relative Date Expressions", () => {
    test("should evaluate {Next Monday}", () => {
      const input = "{Next Monday}";
      const expectedDate = createLocalDate(2024, 4, 29, 10, 0, 0, 0); // April 29, 2024 is the next Monday
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Last week}", () => {
      const input = "{Last week}";
      const expectedDate = new Date(fixedDate);
      expectedDate.setDate(expectedDate.getDate() - 7);
      expect(evaluateExpression(input).type).toBe("date");
      expect(evaluateExpression(input).result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Next year}", () => {
      const input = "{Next year}";
      const expectedDate = createLocalDate(2025, 4, 27, 10, 0, 0, 0); // April 27, 2025
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In 14 days}", () => {
      const input = "{In 14 days}";
      const expectedDate = createLocalDate(2024, 5, 11, 10, 0, 0, 0); // 14 days after April 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {A month ago}", () => {
      const input = "{A month ago}";
      const expectedDate = createLocalDate(2024, 3, 27, 10, 0, 0, 0); // March 27, 2024
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

    test("should handle adding one month to January 31st", () => {
      const input = "{Next month}";
      // Reference date: January 31, 2024, 10:00 AM
      const referenceDate = createLocalDate(2024, 1, 31, 10, 0, 0, 0);
      MockDate.set(referenceDate);
      const expectedDate = createLocalDate(2024, 2, 29, 10, 0, 0, 0); // February 29, 2024 (leap year)
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
      // Reset MockDate to the original fixedDate
      MockDate.set(fixedDate);
    });

    test("should handle {April 31st} as May 1st", () => {
      const input = "{April 31st}";
      const expectedDate = createLocalDate(2024, 5, 1, 0, 0, 0, 0); // May 1, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should handle negative time {In -3 days}", () => {
      const input = "{In -3 days}";
      const expectedDate = subDays(fixedDate, 3); // 3 days before April 27, 2024
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
      const expectedDate = createLocalDate(2024, 4, 27, 9, 50, 0, 0); // 10 minutes before 10:00 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In three hours}", () => {
      const input = "{In three hours}";
      const expectedDate = createLocalDate(2024, 4, 27, 13, 0, 0, 0); // 3 hours after 10:00 AM
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

    test("should evaluate time with leading zeros {09:05}", () => {
      const input = "{09:05}";
      const expectedDate = createLocalDate(2024, 4, 27, 9, 5, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should handle daylight saving time change {Tomorrow at 2 am}", () => {
      const input = "{Tomorrow at 2 am}";
      // Reference date: March 9, 2024, 10:00 AM
      const referenceDate = createLocalDate(2024, 3, 9, 10, 0, 0, 0);
      MockDate.set(referenceDate);
      const expectedDate = createLocalDate(2024, 3, 10, 2, 0, 0, 0); // March 10, 2024, 2:00 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
      // Reset MockDate to the original fixedDate
      MockDate.set(fixedDate);
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
      const expected = { type: "formattedDate", result: "04-28-2024" };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test('should evaluate formatted date {"MM-dd-yy":Two days ago}', () => {
      const input = '{"MM-dd-yy":Two days ago}';
      const expected = { type: "formattedDate", result: "04-25-24" };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test('should evaluate formatted date {"yyyy/MM/dd":End of March}', () => {
      const input = '{"yyyy/MM/dd":End of March}';
      const expected = { type: "formattedDate", result: "2024/03/31" };
      expect(evaluateExpression(input)).toEqual(expected);
    });
  });

  describe("Unhandled Expressions", () => {
    test("should mark typo in month name {Febtember 10th} as unhandled", () => {
      const input = "{Febtember 10th}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark unsupported math function {sin(pi/2)} as unhandled", () => {
      const input = "{sin(pi/2)}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should handle division by zero {10 / 0}", () => {
      const input = "{10 / 0}";
      const expected = { type: "math", result: Infinity };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark unsupported expression as unhandled {Every week on Monday and Thursday}", () => {
      const input = "{Every week on Monday and Thursday}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark empty braces as unhandled {}", () => {
      const input = "{}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark nested braces as unhandled {{1+1}}", () => {
      const input = "{{1+1}}";
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should mark multiple expressions in one brace as unhandled {1+1 and Today}", () => {
      const input = "{1+1 and Today}";
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
