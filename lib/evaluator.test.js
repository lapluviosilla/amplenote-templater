// evaluator.test.js
import { jest } from "@jest/globals";
import MockDate from "mockdate";
import { addMonths, addDays, addWeeks, subDays, endOfMonth, set } from "date-fns";

import { evaluateExpression } from "./evaluator.js";

// Helper function to create Date objects in local time zone
const createLocalDate = (year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) => {
  return new Date(year, month - 1, day, hour, minute, second, millisecond);
};

function clearTime(dateTime) {
  return set(dateTime, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
}

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

    test("should evalute remainder {13 % 5}", () => {
      const input = "{13 % 5}";
      const expected = { type: "math", result: 3 };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should evaluate unary expressions {-5}, {+32}", () => {
      expect(evaluateExpression("{-5}")).toEqual({ type: "math", result: -5 });
      expect(evaluateExpression("{+32}")).toEqual({ type: "math", result: 32 });
    });

    test("should evaluate expression with pi {pi*10**2}", () => {
      const input = "{pi*10**2}";
      const expected = { type: "math", result: Math.PI * Math.pow(10, 2) };
      expect(evaluateExpression(input)).toEqual(expected);
      expect(evaluateExpression("{pi() * 10**2}")).toEqual(expected);
    });

    test("should evaluate expression with e {e**2}", () => {
      const expected = { type: "math", result: Math.pow(Math.E, 2) };
      expect(evaluateExpression("{e**2}")).toEqual(expected);
      expect(evaluateExpression("{e()**2}")).toEqual(expected);
    });

    test("should evaluate complex math expression {(1+1)*(12/36)}", () => {
      const input = "{(1+1)*(12/36)}";
      const expected = { type: "math", result: (1 + 1) * (12 / 36) };
      expect(evaluateExpression(input)).toEqual(expected);
    });

    test("should handle escaped *", () => {
      const input = "{5\\*2}";
      const expected = { type: "math", result: 10 };
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

    test("should evaluate {This Day}", () => {
      const expectedDate = createLocalDate(2024, 4, 27, 0, 0, 0, 0);
      const result = evaluateExpression("{This Day}");
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {This Week}", () => {
      const expectedDate = createLocalDate(2024, 4, 21, 0, 0, 0, 0);
      const result = evaluateExpression("{This Week}");
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {This Month}", () => {
      const expectedDate = createLocalDate(2024, 4, 1, 0, 0, 0, 0);
      const result = evaluateExpression("{This Month}");
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {This Year}", () => {
      const expectedDate = createLocalDate(2024, 1, 1, 0, 0, 0, 0);
      const result = evaluateExpression("{This Year}");
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

      test("should evaluate weekdays after the current", () => {
        MockDate.set(createLocalDate(2024, 4, 23, 0, 0, 0, 0)); // Tuesday
        const input = "{Thursday}";
        const expectedDate = createLocalDate(2024, 4, 25, 0, 0, 0, 0);
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
        MockDate.set(fixedDate);
      });

      test("should evaluate weekdays across month boundary", () => {
        MockDate.set(createLocalDate(2024, 4, 30, 0, 0, 0, 0)); // Tuesday April 30th
        const input = "{Thursday}";
        const expectedDate = createLocalDate(2024, 5, 2, 0, 0, 0, 0); // Thursday May 2nd
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
        MockDate.set(fixedDate);
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

      test("should evaluate {Next Saturday} to be in a week if it's Saturday", () => {
        const input = "{Next Saturday}";
        const expectedDate = createLocalDate(2024, 5, 4, 0, 0, 0, 0); // April 27, 2024 is a Saturday
        const result = evaluateExpression(input);
        expect(result.type).toBe("date");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
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

    test("should evaluate {Second Tuesday of September}", () => {
      const input = "{Second Tuesday of September}";
      const expectedDate = createLocalDate(2024, 9, 10, 0, 0, 0, 0); // September 10, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Fourth Wednesday of July}", () => {
      const input = "{Fourth Wednesday of July}";
      const expectedDate = createLocalDate(2024, 7, 24, 0, 0, 0, 0); // July 24, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Fifth Wednesday of July}", () => {
      const input = "{Fifth Wednesday of July}";
      const expectedDate = createLocalDate(2024, 7, 31, 0, 0, 0, 0); // July 31, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Third Thursday of March}", () => {
      const input = "{Third Thursday of March}";
      const expectedDate = createLocalDate(2024, 3, 21, 0, 0, 0, 0); // July 31, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Fifth Wednesday of April} as unhandled", () => {
      const input = "{Fifth Wednesday of April}";
      const expectedDate = createLocalDate(2024, 4, 24, 0, 0, 0, 0); // April 24, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("unhandled");
      expect(result.result).toBe(null);
    });

    test("should evaluate {Last Friday of December}", () => {
      const input = "{Last Friday of December}";
      const expectedDate = createLocalDate(2024, 12, 27, 0, 0, 0, 0); // December 27, 2024, 00:00:00.000
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {First Weekday of June}", () => {
      const input = "{First Weekday of June}";
      const expectedDate = createLocalDate(2024, 6, 3, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evalute {Tuesday of Last Week}", () => {
      const input = "{Tuesday of Last Week}";
      const expectedDate = createLocalDate(2024, 4, 16, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Friday of Next Week}", () => {
      const input = "{Friday of Next Week}";
      const expectedDate = createLocalDate(2024, 5, 3, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Friday of Last Week} when Friday is later than today", () => {
      MockDate.set(createLocalDate(2024, 4, 24, 10, 0, 0, 0)); // April 24th, Wednesday
      const input = "{Friday of Last Week}";
      const expectedDate = createLocalDate(2024, 4, 19, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
      MockDate.set(fixedDate);
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
      const expectedDate = createLocalDate(2024, 4, 29, 0, 0, 0, 0); // April 29, 2024 is the next Monday
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Last Wednesday}", () => {
      const expectedDate = createLocalDate(2024, 4, 24, 0, 0, 0, 0); // April 29, 2024 is the next Monday
      const result = evaluateExpression("{Last Wednesday}");
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Last week}", () => {
      const input = "{Last week}";
      const expectedDate = clearTime(new Date(fixedDate));
      expectedDate.setDate(expectedDate.getDate() - 7);
      expect(evaluateExpression(input).type).toBe("date");
      expect(evaluateExpression(input).result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {The weekend}", () => {
      MockDate.set(createLocalDate(2024, 4, 23, 0, 0, 0, 0)); // Set for tuesday
      const expectedDate = createLocalDate(2024, 4, 27, 0, 0, 0, 0);
      const evaluation = evaluateExpression("{The weekend}");
      expect(evaluation.type).toBe("date");
      expect(evaluation.result.getTime()).toBe(expectedDate.getTime());
      MockDate.set(fixedDate);
    });

    test("should evaluate {Next year}", () => {
      const input = "{Next year}";
      const expectedDate = createLocalDate(2025, 4, 27, 0, 0, 0, 0); // April 27, 2025
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {A year ago}", () => {
      const input = "{A year ago}";
      const expectedDate = createLocalDate(2023, 4, 27, 0, 0, 0, 0); // April 27, 2025
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In 14 days}", () => {
      const input = "{In 14 days}";
      const expectedDate = createLocalDate(2024, 5, 11, 0, 0, 0, 0); // 14 days after April 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate compound numbers {In Twenty Four Hours}", () => {
      const input = "{In Twenty Four Hours}";
      const expectedDate = createLocalDate(2024, 4, 28, 10, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate 'from now' as an alias for In", () => {
      expect(evaluateExpression("{2 hours from now}")).toStrictEqual(
        evaluateExpression("{In 2 Hours}")
      );
      expect(evaluateExpression("{5 days from now}")).toStrictEqual(
        evaluateExpression("{In 5 days}")
      );
      expect(evaluateExpression("{3 years from now}")).toStrictEqual(
        evaluateExpression("{In 3 years}")
      );
    });

    test("should evaluate {A month ago}", () => {
      const input = "{A month ago}";
      const expectedDate = createLocalDate(2024, 3, 27, 0, 0, 0, 0); // March 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Last Weekday of Last Month}", () => {
      const input = "{Last Weekday of Last Month}";
      const expectedDate = createLocalDate(2024, 3, 29, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should handle adding one month to January 31st", () => {
      const input = "{Next month}";
      // Reference date: January 31, 2024, 10:00 AM
      const referenceDate = createLocalDate(2024, 1, 31, 10, 0, 0, 0);
      MockDate.set(referenceDate);
      const expectedDate = createLocalDate(2024, 2, 29, 0, 0, 0, 0); // February 29, 2024 (leap year)
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
      const expectedDate = clearTime(subDays(fixedDate, 3)); // 3 days before April 27, 2024
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe("Relative Date Beginning/End Expressions", () => {
    // Consolidated Test Cases for "End of" and "Beginning of" Expressions
    const testCases = [
      // "End of" Expressions
      {
        input: "{End of next day}",
        expectedDate: createLocalDate(2024, 4, 28, 23, 59, 59, 999), // April 28, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of last day}",
        expectedDate: createLocalDate(2024, 4, 26, 23, 59, 59, 999), // April 26, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of this day}",
        expectedDate: createLocalDate(2024, 4, 27, 23, 59, 59, 999), // April 27, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of next week}",
        expectedDate: createLocalDate(2024, 5, 4, 23, 59, 59, 999), // May 4, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of last week}",
        expectedDate: createLocalDate(2024, 4, 20, 23, 59, 59, 999), // April 20, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of this week}",
        expectedDate: createLocalDate(2024, 4, 27, 23, 59, 59, 999), // April 27, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of next month}",
        expectedDate: createLocalDate(2024, 5, 31, 23, 59, 59, 999), // May 31, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of last month}",
        expectedDate: createLocalDate(2024, 3, 31, 23, 59, 59, 999), // March 31, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of this month}",
        expectedDate: createLocalDate(2024, 4, 30, 23, 59, 59, 999), // April 30, 2024 at 23:59:59.999 UTC
      },
      {
        input: "{End of next year}",
        expectedDate: createLocalDate(2025, 12, 31, 23, 59, 59, 999), // December 31, 2025 at 23:59:59.999 UTC
      },
      {
        input: "{End of last year}",
        expectedDate: createLocalDate(2023, 12, 31, 23, 59, 59, 999), // December 31, 2023 at 23:59:59.999 UTC
      },
      {
        input: "{End of this year}",
        expectedDate: createLocalDate(2024, 12, 31, 23, 59, 59, 999), // December 31, 2024 at 23:59:59.999 UTC
      },

      // "Beginning of" Expressions
      {
        input: "{Beginning of next day}",
        expectedDate: createLocalDate(2024, 4, 28, 0, 0, 0, 0), // April 28, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of last day}",
        expectedDate: createLocalDate(2024, 4, 26, 0, 0, 0, 0), // April 26, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of this day}",
        expectedDate: createLocalDate(2024, 4, 27, 0, 0, 0, 0), // April 27, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of next week}",
        expectedDate: createLocalDate(2024, 4, 28, 0, 0, 0, 0), // Sunday, April 28, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of last week}",
        expectedDate: createLocalDate(2024, 4, 14, 0, 0, 0, 0), // Sunday, April 14, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of this week}",
        expectedDate: createLocalDate(2024, 4, 21, 0, 0, 0, 0), // Sunday, April 21, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of week}",
        expectedDate: createLocalDate(2024, 4, 21, 0, 0, 0, 0), // Sunday, April 21, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of next month}",
        expectedDate: createLocalDate(2024, 5, 1, 0, 0, 0, 0), // May 1, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of last month}",
        expectedDate: createLocalDate(2024, 3, 1, 0, 0, 0, 0), // March 1, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of this month}",
        expectedDate: createLocalDate(2024, 4, 1, 0, 0, 0, 0), // April 1, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of month}",
        expectedDate: createLocalDate(2024, 4, 1, 0, 0, 0, 0), // April 1, 2024 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of next year}",
        expectedDate: createLocalDate(2025, 1, 1, 0, 0, 0, 0), // January 1, 2025 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of last year}",
        expectedDate: createLocalDate(2023, 1, 1, 0, 0, 0, 0), // January 1, 2023 at 00:00:00.000 UTC
      },
      {
        input: "{Beginning of this year}",
        expectedDate: createLocalDate(2024, 1, 1, 0, 0, 0, 0), // January 1, 2024 at 00:00:00.000 UTC
      },
    ];

    // Describe block for Valid Expressions ("End of" and "Beginning of")
    describe("Valid Expressions", () => {
      test.each(testCases)("should correctly evaluate %s", ({ input, expectedDate }) => {
        const result = evaluateExpression(input, fixedDate);
        expect(result.type).toBe(input.includes("Beginning") ? "date" : "dateTime");
        expect(result.result.getTime()).toBe(expectedDate.getTime());
      });
    });
  });

  describe("Compound Expressions", () => {
    test("should evaluate {Two weeks after Friday}", () => {
      const input = "{Two weeks after Friday}";
      let expectedDate = createLocalDate(2024, 5, 10, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
    test("should evaluate {2 days after Tuesday of Last Week}", () => {
      const input = "{2 days after Tuesday of Last Week}";
      let expectedDate = createLocalDate(2024, 4, 18, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
    test("should evaluate {Three days before Two Months from Now}", () => {
      const input = "{Three days before Two Months from Now}";
      let expectedDate = new Date(fixedDate);
      expectedDate = clearTime(subDays(addMonths(expectedDate, 2), 3));
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
    test("should evaluate {2 days before the Last Weekday of Four Months from Now}", () => {
      const input = "{2 days before the Last Weekday of Four Months from Now}";
      let expectedDate = createLocalDate(2024, 8, 28, 0, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("date");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
    test("should evaluate {First weekday of next month at 11am}", () => {
      const input = "{First weekday of next month at 11am}";
      let expectedDate = createLocalDate(2024, 5, 1, 11, 0, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe("Time Expressions", () => {
    test("should evaluate {Now}", () => {
      const input = "{Now}";
      const expectedDate = new Date(fixedDate);
      const result = evaluateExpression(input);
      expect(result.type).toBe("time");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {10 minutes ago}", () => {
      const input = "{10 minutes ago}";
      const expectedDate = createLocalDate(2024, 4, 27, 9, 50, 0, 0); // 10 minutes before 10:00 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {30 seconds ago}", () => {
      const expectedDate = createLocalDate(2024, 4, 27, 9, 59, 30, 0); // 30 seconds before 10:00 AM
      const result = evaluateExpression("{30 seconds ago}");
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {2 hours ago}", () => {
      const expectedDate = createLocalDate(2024, 4, 27, 8, 0, 0, 0); // 2 hours before 10:00 AM
      const result = evaluateExpression("{2 hours ago}");
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In three hours}", () => {
      const input = "{In three hours}";
      const expectedDate = createLocalDate(2024, 4, 27, 13, 0, 0, 0); // 3 hours after 10:00 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Next hour}", () => {
      const input = "{Next hour}";
      const expectedDate = createLocalDate(2024, 4, 27, 11, 0, 0, 0); // 1 hours after 10:00 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In ten minutes}", () => {
      const expectedDate = createLocalDate(2024, 4, 27, 10, 10, 0, 0); // 10:10 AM
      const result = evaluateExpression("{In ten minutes}");
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {In 58 seconds}", () => {
      const expectedDate = createLocalDate(2024, 4, 27, 10, 0, 58, 0); // 10:00:58 AM
      const result = evaluateExpression("{In 58 seconds}");
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {9 pm}", () => {
      const input = "{9 pm}";
      const expectedDate = createLocalDate(2024, 4, 27, 21, 0, 0, 0); // 9 PM
      const result = evaluateExpression(input);
      expect(result.type).toBe("time");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {21:30}", () => {
      const input = "{21:30}";
      const expectedDate = createLocalDate(2024, 4, 27, 21, 30, 0, 0); // 21:30
      const result = evaluateExpression(input);
      expect(result.type).toBe("time");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate time with leading zeros {09:05}", () => {
      const input = "{09:05}";
      const expectedDate = createLocalDate(2024, 4, 27, 9, 5, 0, 0);
      const result = evaluateExpression(input);
      expect(result.type).toBe("time");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should handle daylight saving time change {Tomorrow at 2 am}", () => {
      const input = "{Tomorrow at 2 am}";
      // Reference date: March 9, 2024, 10:00 AM
      const referenceDate = createLocalDate(2024, 3, 9, 10, 0, 0, 0);
      MockDate.set(referenceDate);
      const expectedDate = createLocalDate(2024, 3, 10, 2, 0, 0, 0); // March 10, 2024, 2:00 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
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
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tomorrow at 10:45}", () => {
      const input = "{Tomorrow at 10:45}";
      const expectedDate = createLocalDate(2024, 4, 28, 10, 45, 0, 0); // Tomorrow at 10:45 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tuesday 22:00}", () => {
      const input = "{Tuesday 22:00}";
      const expectedDate = createLocalDate(2024, 4, 23, 22, 0, 0, 0); // Next Tuesday at 22:00
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Tomorrow at 12am}", () => {
      const expectedDate = createLocalDate(2024, 4, 28, 0, 0, 0, 0); // Next Tuesday at 22:00
      const result = evaluateExpression("{Tomorrow at 12am}");
      expect(result.type).toBe("dateTime");
      expect(result.result.getTime()).toBe(expectedDate.getTime());
    });

    test("should evaluate {Mar 12 8am}", () => {
      const input = "{Mar 12 8am}";
      const expectedDate = createLocalDate(2024, 3, 12, 8, 0, 0, 0); // March 12 at 8 AM
      const result = evaluateExpression(input);
      expect(result.type).toBe("dateTime");
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

    test("should mark invalid numbers {$ days ago}, {In % hours} as unhandled", () => {
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression("{$ days ago}")).toEqual(expected);
      expect(evaluateExpression("{In % hours}")).toEqual(expected);
      expect(evaluateExpression("{In Fife hours}")).toEqual(expected);
      expect(evaluateExpression("{Tn months ago}")).toEqual(expected);
    });

    test("should mark invalid operators {3 $ 2}, {5 ! 6} as unhandled", () => {
      const expected = { type: "unhandled", result: null };
      expect(evaluateExpression("{3 $ 2}")).toEqual(expected);
      expect(evaluateExpression("{5 ! 6}")).toEqual(expected);
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
