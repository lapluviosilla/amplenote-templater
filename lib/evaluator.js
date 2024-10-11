// evaluator.js

import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  addHours,
  addMinutes,
  addSeconds,
  subHours,
  subMinutes,
  subSeconds,
  startOfMonth,
  endOfMonth,
  format,
  set,
} from "date-fns";
import esprima from "esprima";

/**
 * Main function to evaluate expressions.
 * @param {string} expressionString - The expression string, including curly braces.
 * @returns {Object} - { type: 'date'|'math'|'formattedDate'|'unhandled', result: ... }
 */
export function evaluateExpression(expressionString) {
  // Trim and check for enclosing braces
  const trimmed = expressionString.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return { type: "unhandled", result: null };
  }

  // Extract the inner content
  const innerContent = trimmed.slice(1, -1).trim();

  // Check for format specifier
  const formatMatch = innerContent.match(/^"([^"]+)":(.+)$/);
  let formatSpecifier = null;
  let expression = innerContent;

  if (formatMatch) {
    formatSpecifier = formatMatch[1];
    expression = formatMatch[2].trim();
  }

  // Try parsing as date
  const dateResult = parseDateExpression(expression);
  if (dateResult.success) {
    let finalDate = dateResult.date;
    if (formatSpecifier) {
      try {
        finalDate = format(finalDate, formatSpecifier);
      } catch (error) {
        // Invalid format specifier
        return { type: "unhandled", result: null };
      }
      return { type: "formattedDate", result: finalDate };
    }
    return { type: dateResult.type, result: finalDate };
  }

  // Try parsing as math
  const mathResult = parseMathExpression(expression);
  if (mathResult.success) {
    return { type: "math", result: mathResult.value };
  }

  // If neither, unhandled
  return { type: "unhandled", result: null };
}

/**
 * Parses date expressions based on the specifications.
 * @param {string} expr - The date expression.
 * @returns {Object} - { success: boolean, date: Date }
 */
function parseDateExpression(expr) {
  const lowerExpr = expr.toLowerCase();

  const now = new Date();

  // Date and Time Expressions
  const dateTime = parseDateTimeExpression(expr, now);
  if (dateTime) {
    return { success: true, type: "dateTime", date: dateTime };
  }

  // Compound Date Expressions
  const compoundDate = parseCompoundExpression(expr, now);
  if (compoundDate) {
    return { success: true, type: "date", date: compoundDate };
  }

  // Relative Dates
  if (lowerExpr === "today") {
    return { success: true, type: "date", date: clearTime(now) };
  }
  if (lowerExpr === "tomorrow") {
    return { success: true, type: "date", date: clearTime(addDays(now, 1)) };
  }
  if (lowerExpr === "yesterday") {
    return { success: true, type: "date", date: clearTime(subDays(now, 1)) };
  }

  // Absolute Dates
  const absoluteDate = parseAbsoluteDate(expr, now);
  if (absoluteDate) {
    return { success: true, type: "date", date: absoluteDate };
  }

  // Past and Future Dates
  const relativeDate = parseRelativeDate(expr, now);
  if (relativeDate) {
    return { success: true, type: hasTime(relativeDate) ? "dateTime" : "date", date: relativeDate };
  }

  // Time Expressions
  const timeDate = parseTimeExpression(expr, now);
  if (timeDate) {
    return { success: true, type: "time", date: timeDate };
  }

  // If none matched
  return { success: false };
}

/**
 * Parses absolute date expressions.
 * @param {string} expr - The absolute date expression.
 * @param {Date} referenceDate - The date from which to calculate absolute dates.
 * @returns {Date|null} - The calculated Date object or null if parsing fails.
 */
function parseAbsoluteDate(expr, referenceDate) {
  // Define full and abbreviated month and weekday names
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const trimmed = expr.trim().toLowerCase();

  // 1. Handle "The weekend"
  if (trimmed === "the weekend") {
    const saturday = nextWeekday(referenceDate, 6); // Saturday index is 6
    // Set time to start of Saturday
    const saturdayStart = clearTime(saturday);
    return saturdayStart;
  }

  // 2. Handle single month names like "September"
  for (let month of months) {
    if (trimmed === month) {
      const monthIndex = getMonthIndex(month);
      const date = new Date(referenceDate.getFullYear(), monthIndex, 1);
      // Set time to start of day
      return clearTime(date);
    }
  }

  // 3. Handle specific dates like "October 31st" or "Oct 31"
  const specificDateMatch = expr.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(st|nd|rd|th)?$/i
  );
  if (specificDateMatch) {
    const month = specificDateMatch[1];
    const day = parseInt(specificDateMatch[2], 10);
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
      const date = new Date(referenceDate.getFullYear(), monthIndex, day);
      // Set time to start of day
      return clearTime(date);
    }
  }

  // 4. Handle "End of March", "Beginning of April"
  const endBeginningMatch = expr.match(
    /^(end|beginning)\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)$/i
  );
  if (endBeginningMatch) {
    const type = endBeginningMatch[1].toLowerCase(); // 'end' or 'beginning'
    const month = endBeginningMatch[2];
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
      let date = new Date(referenceDate.getFullYear(), monthIndex, 1);
      if (type === "end") {
        date = endOfMonth(date); // Sets to end of month with time 23:59:59.999
        // Set time to end of day
        date = set(date, {
          hours: 23,
          minutes: 59,
          seconds: 59,
          milliseconds: 999,
        });
      } else if (type === "beginning") {
        // Set time to start of day
        date = set(date, {
          hours: 0,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        });
      }
      return date;
    }
  }

  // Updated code in parseAbsoluteDate
  if (weekdays.includes(trimmed)) {
    const weekdayIndex = getWeekdayIndex(trimmed);
    const targetDate = getCurrentWeekday(referenceDate, weekdayIndex);
    // Set time to start of day
    return clearTime(targetDate);
  }

  // If no patterns matched, return null
  return null;
}

/**
 * Parses relative date expressions like "Next Monday", "In 14 days", "A month ago".
 * @param {string} expr - The relative date expression.
 * @param {Date} referenceDate - The date from which to calculate relative dates.
 * @returns {Date|null} - The calculated Date object or null if parsing fails.
 */
function parseRelativeDate(expr, referenceDate) {
  const trimmed = expr.trim().toLowerCase();

  // Handle "[Weekday] of Last/Next Week"
  const weekdayOfWeekMatch = trimmed.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+(last|next)\s+week$/i
  );
  if (weekdayOfWeekMatch) {
    const weekday = weekdayOfWeekMatch[1].toLowerCase();
    const weekDirection = weekdayOfWeekMatch[2].toLowerCase();
    const weekdayIndex = getWeekdayIndex(weekday);

    // Find the start of the current week (Sunday)
    const startOfCurrentWeek = set(referenceDate, {
      date: referenceDate.getDate() - referenceDate.getDay(),
    });

    // Determine the reference week by subtracting/adding one week
    const referenceWeek =
      weekDirection === "last" ? subDays(startOfCurrentWeek, 7) : addDays(startOfCurrentWeek, 7);

    // Adjust the reference week to find the correct weekday
    const resultDate = addDays(referenceWeek, weekdayIndex);
    return clearTime(resultDate);
  }

  // Handle "Next Monday", "Last Friday", etc.
  const nextLastWeekdayMatch = trimmed.match(
    /^(next|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i
  );
  if (nextLastWeekdayMatch) {
    const direction = nextLastWeekdayMatch[1].toLowerCase();
    const weekday = nextLastWeekdayMatch[2].toLowerCase();
    const weekdayIndex = getWeekdayIndex(weekday);
    if (weekdayIndex !== -1) {
      if (direction === "next") {
        return clearTime(nextWeekday(referenceDate, weekdayIndex));
      } else if (direction === "last") {
        return clearTime(previousWeekday(referenceDate, weekdayIndex));
      }
    }
  }

  // 2. Handle "Next month", "Last year", etc.
  const nextLastUnitMatch = trimmed.match(
    /^(next|last)\s+(day|week|month|year|hour|minute|second)s?$/i
  );
  if (nextLastUnitMatch) {
    const direction = nextLastUnitMatch[1].toLowerCase();
    const unit = nextLastUnitMatch[2].toLowerCase();

    let result;
    if (direction === "next") {
      result = addTime(referenceDate, 1, unit);
    } else if (direction === "last") {
      result = subtractTime(referenceDate, 1, unit);
    }
    return isTimeUnit(unit) ? result : clearTime(result);
  }

  // Handle "In 14 days", "In three hours", etc. and "Two Months from Now" as alias for "In Two Months"
  const inMatch = trimmed.match(
    /^(in\s+(-?\d+|\w+)\s+(day|week|month|year|hour|minute|second)s?|(-?\d+|\w+)\s+(day|week|month|year|hour|minute|second)s? from now)$/i
  );
  if (inMatch) {
    let value = parseInt(inMatch[2] || inMatch[4], 10);
    if (isNaN(value)) {
      value = wordToNumber(inMatch[2] || inMatch[4]);
      if (isNaN(value)) return null;
    }
    const unit = (inMatch[3] || inMatch[5]).toLowerCase();
    const result = addTime(referenceDate, value, unit);
    return isTimeUnit(unit) ? result : clearTime(result); // value can be negative
  }

  // 4. Handle "A month ago", "2 days ago", etc.
  const agoMatch = trimmed.match(/^(\d+|\w+)\s+(day|week|month|year|hour|minute|second)s?\s+ago$/i);
  if (agoMatch) {
    const value = parseInt(agoMatch[1], 10) || wordToNumber(agoMatch[1]);
    const unit = agoMatch[2].toLowerCase();
    if (isNaN(value)) return null;
    const result = subtractTime(referenceDate, value, unit);
    return isTimeUnit(unit) ? result : clearTime(result);
  }

  // 5. Handle "End of next month", "Beginning of last week", "End of this year", etc.
  const endBeginningRelativeMatch = trimmed.match(
    /^(end|beginning)\s+of\s+(next|last|this)?\s*(day|week|month|year)$/i
  );
  if (endBeginningRelativeMatch) {
    const type = endBeginningRelativeMatch[1].toLowerCase(); // 'end' or 'beginning'
    const direction = endBeginningRelativeMatch[2]
      ? endBeginningRelativeMatch[2].toLowerCase()
      : "this"; // 'next', 'last', 'this', or undefined
    const unit = endBeginningRelativeMatch[3].toLowerCase(); // 'day', 'week', 'month', 'year'

    let date = new Date(referenceDate);

    // Adjust the reference date based on direction
    if (direction === "next") {
      if (unit === "day") date = addDays(referenceDate, 1);
      if (unit === "week") date = addWeeks(referenceDate, 1);
      if (unit === "month") date = addMonths(referenceDate, 1);
      if (unit === "year") date = addYears(referenceDate, 1);
    } else if (direction === "last") {
      if (unit === "day") date = subtractTime(referenceDate, 1, unit);
      if (unit === "week") date = subtractTime(referenceDate, 1, unit);
      if (unit === "month") date = subtractTime(referenceDate, 1, unit);
      if (unit === "year") date = subtractTime(referenceDate, 1, unit);
    } else if (direction === "this") {
      // No adjustment needed for 'this'
    }

    // Normalize date based on unit
    if (unit === "day") {
      // For 'day', no normalization needed
    } else if (unit === "week") {
      // Assuming week starts on Sunday
      date = set(date, { date: date.getDate() - date.getDay() });
    } else if (unit === "month") {
      date = set(date, { date: 1 });
    } else if (unit === "year") {
      date = set(date, { month: 0, date: 1 });
    }

    // Return end or beginning of the unit
    if (type === "end") {
      if (unit === "day") {
        return set(date, {
          hours: 23,
          minutes: 59,
          seconds: 59,
          milliseconds: 999,
        });
      }
      if (unit === "week") {
        return addDays(date, 6); // End of the week (Saturday)
      }
      if (unit === "month") {
        return endOfMonth(date);
      }
      if (unit === "year") {
        return set(new Date(date.getFullYear(), 11, 31), {
          hours: 23,
          minutes: 59,
          seconds: 59,
          milliseconds: 999,
        });
      }
    } else if (type === "beginning") {
      if (unit === "day") {
        return clearTime(date);
      }
      if (unit === "week") {
        return clearTime(date); // Beginning of the week (Sunday)
      }
      if (unit === "month") {
        return startOfMonth(date);
      }
      if (unit === "year") {
        return clearTime(date);
      }
    }
  }

  // 6. Handle "This [unit]"
  const thisUnitMatch = trimmed.match(/^this\s+(day|week|month|year)$/i);
  if (thisUnitMatch) {
    const unit = thisUnitMatch[1].toLowerCase();
    let date = new Date(referenceDate);

    if (unit === "day") {
      return set(date, {
        hours: 23,
        minutes: 59,
        seconds: 59,
        milliseconds: 999,
      });
    }
    if (unit === "week") {
      // Assuming week starts on Sunday
      const startOfWeek = set(date, { date: date.getDate() - date.getDay() });
      const endOfWeek = addDays(startOfWeek, 6);
      return set(endOfWeek, {
        hours: 23,
        minutes: 59,
        seconds: 59,
        milliseconds: 999,
      });
    }
    if (unit === "month") {
      return endOfMonth(date);
    }
    if (unit === "year") {
      return set(new Date(date.getFullYear(), 11, 31), {
        hours: 23,
        minutes: 59,
        seconds: 59,
        milliseconds: 999,
      });
    }
  }

  // If no patterns matched, return null
  return null;
}

/**
 * Parses compound date expressions like "Two weeks after Friday".
 * @param {string} expr - The compound date expression.
 * @param {Date} referenceDate - The reference date.
 * @returns {Date|null} - The calculated Date object or null if parsing fails.
 */
function parseCompoundExpression(expr, referenceDate) {
  const compoundMatch = expr.match(/^(\w+\s+\w+)\s+(before|after)\s+(?:the\s+)?(.*)$/i);
  if (compoundMatch) {
    const valueUnit = compoundMatch[1].toLowerCase();
    const direction = compoundMatch[2].toLowerCase();
    const baseExpression = compoundMatch[3].trim();

    const baseDateResult = parseDateExpression(baseExpression);
    if (baseDateResult.success) {
      let value = parseInt(valueUnit.split(" ")[0], 10);
      if (isNaN(value)) {
        value = wordToNumber(valueUnit.split(" ")[0]);
      }
      const unit = valueUnit.split(" ")[1];

      if (direction === "after") {
        return addTime(baseDateResult.date, value, unit);
      } else if (direction === "before") {
        return subtractTime(baseDateResult.date, value, unit);
      }
    }
  }

  // Handle "First/Last Weekday of [Month Expression]"
  const weekdayOfMonthMatch = expr.match(
    /^(first|last)\s+(weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+(.*)$/i
  );
  if (weekdayOfMonthMatch) {
    const position = weekdayOfMonthMatch[1].toLowerCase();
    const dayType = weekdayOfMonthMatch[2].toLowerCase();
    const baseExpression = weekdayOfMonthMatch[3].trim();

    const baseDateResult = parseDateExpression(baseExpression);
    if (baseDateResult.success) {
      let date = baseDateResult.date;
      date = set(date, { date: position === "first" ? 1 : endOfMonth(date).getDate() });

      if (dayType === "weekday") {
        while (date.getDay() === 0 || date.getDay() === 6) {
          date = position === "first" ? addDays(date, 1) : subDays(date, 1);
        }
      } else {
        const targetDayIndex = getWeekdayIndex(dayType);
        date =
          position === "first"
            ? nextWeekday(date, targetDayIndex)
            : previousWeekday(date, targetDayIndex);
      }

      return clearTime(date);
    }
  }

  return null;
}

/**
 * Parses time expressions like "Now", "10 minutes ago", "In three hours", "9 pm", "21:30".
 * @param {string} expr - The time expression.
 * @param {Date} referenceDate - The date from which to set time.
 * @returns {Date|null} - The updated Date object with the specified time or null if parsing fails.
 */
function parseTimeExpression(expr, referenceDate) {
  const trimmed = expr.trim().toLowerCase();

  if (trimmed === "now") {
    return new Date();
  }

  // Specific time like "9 pm", "21:30"
  const timeMatch = trimmed.match(/^(\d{1,2})(:(\d{2}))?\s*(am|pm)?$/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const period = timeMatch[4];

    if (period) {
      if (period.toLowerCase() === "pm" && hours < 12) {
        hours += 12;
      }
      if (period.toLowerCase() === "am" && hours === 12) {
        hours = 0;
      }
    }

    let dateWithTime = set(referenceDate, {
      hours: hours,
      minutes: minutes,
      seconds: 0,
      milliseconds: 0,
    });
    return dateWithTime;
  }

  return null;
}

/**
 * Parses date and time expressions like "Today at 8pm", "Tomorrow at 10:45", "Tuesday 22:00", "Mar 12 8am", "First weekday of next month 11am".
 * @param {string} expr - The date and time expression.
 * @param {Date} referenceDate - The reference date.
 * @returns {Date|null} - The combined Date object or null if parsing fails.
 */
function parseDateTimeExpression(expr, referenceDate) {
  // Example pattern: "Today at 8pm", "Tomorrow at 10:45", "Tuesday 22:00", "Mar 12 8am", "First weekday of next month 11am"
  const compoundMatch = expr.match(
    /^(.+?)\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))$/i
  );
  if (compoundMatch) {
    const datePart = compoundMatch[1].trim();
    const timePart = compoundMatch[2].trim();

    const dateEval = parseDateExpression(datePart);
    if (dateEval.success) {
      const timeDate = parseTimeExpression(timePart, dateEval.date);
      if (timeDate) {
        // Ensure milliseconds are set to 0
        return set(timeDate, { milliseconds: 0 });
      }
    }
  }

  return null;
}

/**
 * Parses mathematical expressions safely using esprima.
 * @param {string} expr - The mathematical expression.
 * @returns {Object} - { success: boolean, value: number }
 */
function parseMathExpression(expr) {
  try {
    const ast = esprima.parseScript(expr);
    const result = evaluateAST(ast.body[0].expression);
    if (typeof result === "number") {
      return { success: true, value: result };
    } else {
      return { success: false };
    }
  } catch (error) {
    return { success: false };
  }
}

/**
 * Evaluates Esprima AST nodes for safe mathematical computations.
 * Supports basic arithmetic operations.
 * @param {Object} node - The AST node.
 * @returns {number}
 */
function evaluateAST(node) {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "BinaryExpression":
      const left = evaluateAST(node.left);
      const right = evaluateAST(node.right);
      return applyOperator(node.operator, left, right);
    case "UnaryExpression":
      const arg = evaluateAST(node.argument);
      return applyUnaryOperator(node.operator, arg);
    case "Identifier":
      return getConstant(node.name);
    case "CallExpression":
      return evaluateFunction(node);
    default:
      throw new Error("Unsupported expression");
  }
}

/**
 * Applies binary operators.
 * @param {string} operator - The operator (e.g., +, -, *, /, **).
 * @param {number} left - The left operand.
 * @param {number} right - The right operand.
 * @returns {number}
 */
function applyOperator(operator, left, right) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    case "**":
      return Math.pow(left, right);
    default:
      throw new Error("Unsupported operator");
  }
}

/**
 * Applies unary operators.
 * @param {string} operator - The unary operator (e.g., +, -).
 * @param {number} arg - The operand.
 * @returns {number}
 */
function applyUnaryOperator(operator, arg) {
  switch (operator) {
    case "+":
      return +arg;
    case "-":
      return -arg;
    default:
      throw new Error("Unsupported unary operator");
  }
}

/**
 * Evaluates supported functions like pi, e, etc.
 * @param {Object} node - The CallExpression AST node.
 * @returns {number}
 */
function evaluateFunction(node) {
  if (node.callee.type === "Identifier") {
    const funcName = node.callee.name.toLowerCase();
    if (funcName === "pi") {
      return Math.PI;
    }
    if (funcName === "e") {
      return Math.E;
    }
  }
  throw new Error("Unsupported function");
}

/**
 * Retrieves constant values.
 * @param {string} name - The name of the constant (e.g., pi, e).
 * @returns {number}
 */
function getConstant(name) {
  const constants = {
    pi: Math.PI,
    e: Math.E,
  };
  if (constants[name.toLowerCase()] !== undefined) {
    return constants[name.toLowerCase()];
  }
  throw new Error("Unknown identifier");
}

/**
 * Helper to get month index from name.
 * @param {string} month - The name of the month.
 * @returns {number} - 0-based month index or -1 if invalid.
 */
function getMonthIndex(month) {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const lowerMonth = month.toLowerCase();
  const index = months.indexOf(lowerMonth);
  if (index === -1) return -1;
  return index > 11 ? index - 12 : index;
}

/**
 * Helper to get weekday index from name.
 * @param {string} day - The name of the weekday.
 * @returns {number} - 0 (Sunday) to 6 (Saturday) or -1 if invalid.
 */
function getWeekdayIndex(day) {
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const index = weekdays.indexOf(day.toLowerCase());
  return index;
}

/**
 * Gets the next specified weekday from a reference date.
 * @param {Date} referenceDate - The date from which to find the next weekday.
 * @param {number} weekday - 0 (Sunday) to 6 (Saturday).
 * @returns {Date}
 */
function nextWeekday(referenceDate, weekday) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  let diff = (weekday - day + 7) % 7;
  diff = diff === 0 ? 7 : diff; // Ensure we skip today if it's the same weekday
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Retrieves the date of the specified weekday within the current week.
 * @param {Date} referenceDate - The date from which to calculate.
 * @param {number} targetWeekday - The target weekday (0 for Sunday, ..., 6 for Saturday).
 * @returns {Date} - The date of the target weekday within the current week.
 */
function getCurrentWeekday(referenceDate, targetWeekday) {
  const date = new Date(referenceDate);
  const currentDay = date.getDay();
  let diff = currentDay - targetWeekday;

  // If targetWeekday is after the current day, subtract (currentDay + (7 - targetWeekday))
  if (diff < 0) {
    diff += 7;
  }

  date.setDate(date.getDate() - diff);
  // Set time to start of day
  return clearTime(date);
}

/**
 * Gets the previous specified weekday from a reference date.
 * @param {Date} referenceDate - The date from which to find the previous weekday.
 * @param {number} weekday - 0 (Sunday) to 6 (Saturday).
 * @returns {Date}
 */
function previousWeekday(referenceDate, weekday) {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - ((7 + date.getDay() - weekday) % 7 || 7));
  return date;
}

/**
 * Converts word numbers to numeric values.
 * @param {string} word - The word representation of the number (e.g., "three").
 * @returns {number} - The numeric value or NaN if invalid.
 */
function wordToNumber(word) {
  const numbers = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
    a: 1,
    an: 1,
  };

  if (numbers[word.toLowerCase()] !== undefined) {
    return numbers[word.toLowerCase()];
  }

  // Handle compound numbers like "twenty one"
  const parts = word.toLowerCase().split(" ");
  let total = 0;
  for (let part of parts) {
    if (numbers[part] !== undefined) {
      total += numbers[part];
    } else {
      return NaN;
    }
  }
  return total;
}

function isTimeUnit(unit) {
  return unit === "hour" || unit === "minute" || unit === "second" || unit === "millisecond";
}

/**
 * Removes all time from the date, resetting it to start of day
 * @param {Date} dateTime The original date with time
 */
function clearTime(dateTime) {
  return set(dateTime, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
}

/** Check if there's time too, used by relative date parser */
function hasTime(dateTime) {
  const hours = dateTime.getHours();
  const minutes = dateTime.getMinutes();
  const seconds = dateTime.getSeconds();
  const milliseconds = dateTime.getMilliseconds();
  return hours > 0 || minutes > 0 || seconds > 0 || milliseconds || 0;
}

/**
 * Adds time to a date based on unit.
 * @param {Date} date - The original date.
 * @param {number} value - The value to add.
 * @param {string} unit - The unit of time (e.g., "day", "week").
 * @returns {Date|null} - The updated date or null if unit is invalid.
 */
function addTime(date, value, unit) {
  switch (unit) {
    case "day":
    case "days":
      return addDays(date, value);
    case "week":
    case "weeks":
      return addWeeks(date, value);
    case "month":
    case "months":
      return addMonths(date, value);
    case "year":
    case "years":
      return addYears(date, value);
    case "hour":
    case "hours":
      return addHours(date, value);
    case "minute":
    case "minutes":
      return addMinutes(date, value);
    case "second":
    case "seconds":
      return addSeconds(date, value);
    default:
      return null;
  }
}

/**
 * Subtracts time from a date based on unit.
 * @param {Date} date - The original date.
 * @param {number} value - The value to subtract.
 * @param {string} unit - The unit of time (e.g., "day", "week").
 * @returns {Date|null} - The updated date or null if unit is invalid.
 */
function subtractTime(date, value, unit) {
  switch (unit) {
    case "day":
    case "days":
      return subDays(date, value);
    case "week":
    case "weeks":
      return subWeeks(date, value);
    case "month":
    case "months":
      return subMonths(date, value);
    case "year":
    case "years":
      return subYears(date, value);
    case "hour":
    case "hours":
      return subHours(date, value);
    case "minute":
    case "minutes":
      return subMinutes(date, value);
    case "second":
    case "seconds":
      return subSeconds(date, value);
    default:
      return null;
  }
}
