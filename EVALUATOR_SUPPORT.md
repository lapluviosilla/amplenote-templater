# Evaluator Supported Date and Math Expressions

The Dynamic Templater expression evaluator supports a variety of date and math expressions that can be used to perform arithmetic calculations or manipulate dates and times. This document describes the available expressions and how to use them.

## Math Expressions

Math expressions can be included using curly braces `{}` and can contain operations such as addition, subtraction, multiplication, division, and power. Here are the supported math operations:

- **Simple Addition and Subtraction**

  - Example: `{1+1}`, `{12-3-1}`
  - Result: `2`, `8`

- **Multiplication, Division, and Exponentiation**

  - Example: `{pi * 10 ** 2}`, `{(1+1) * (12/36)}`
  - Result: `314.159...`, `0.666...`

- **Whitespace Handling**
  - Whitespace is ignored.
  - Example: `{   1 - 3 -1 * (12/36) * pi + 4 }`
  - Result: Calculated value considering the whitespace is ignored.

## Date Expressions

Date expressions can be included using specific keywords or phrases in curly braces `{}`. Supported date expressions include:

- **Relative Date Keywords**

  - `{Today}`: Evaluates to the current date with the time set to midnight.
  - `{Tomorrow}`: Evaluates to one day after today.
  - `{Yesterday}`: Evaluates to one day before today.

- **Specific Dates**

  - `{Mar 5}` or `{October 31st}`: Evaluates to the specified date in the current year.
  - `{Oct 31}`: Abbreviated months are also supported.

- **Start or End of Month**

  - `{End of March}`: Evaluates to the last day of March.
  - `{Beginning of April}`: Evaluates to the first day of April.

- **Days of the Week**

  - `{Monday}`, `{Sunday}`, `{Thursday}`: Evaluates to the corresponding day in the current week.
  - `{First Monday of September}` or `{Last Friday of December}`: Evaluates to the specified weekday in the given month.

- **Months of the Year**
  - `{September}`, `{October}`, `{January}`: Evaluates to the first day of the specified month in the current year.

## Relative Date Expressions

Relative date expressions can use keywords like "Next", "Last", or specific time durations:

- **Weekdays and Weekends**

  - `{Next Monday}`, `{Last week}`, `{Next year}`: Evaluates to the next or last occurrence.
  - `{Friday of Last Week}`: Finds the specified day relative to last week.

- **Duration-Based Expressions**
  - `{In 14 days}`, `{A month ago}`, `{In -3 days}`, `{In Twenty Four Hours}`: Evaluates to the given duration relative to today.
  - `{End of next month}`, `{Last Weekday of Last Month}`: Evaluates based on the relative month or week.

## Time Expressions

Time expressions allow for specifying times of the day:

- **Specific Times**

  - `{Now}`: Evaluates to the current date and time.
  - `{9 pm}`, `{21:30}`, `{09:05}`: Evaluates to the specified time on the current day.

- **Relative Time**
  - `{10 minutes ago}`, `{In three hours}`: Evaluates to the specified time relative to now.

## Date and Time Combined Expressions

Date and time can be combined to form more specific expressions:

- `{Today at 8pm}`, `{Tomorrow at 10:45}`, `{Mar 12 8am}`: Combines date and time for more precision.

## Compound Expressions

- **Multiple Relative References**
  - `{Two weeks after Friday}`, `{2 days after Tuesday of Last Week}`: Evaluates to a date calculated from multiple references.
  - `{First weekday of next month at 11am}`: Combines weekday, month, and time for precise evaluation.
  - **Complex Compound Expressions**: Compound expressions can be even more complex, such as `{2 days before the Last Weekday of Four Months from Now at 5pm}`. This evaluates to a precise date and time calculated based on multiple relative references and specific times.

## Format Specifier

You can format dates by specifying a format inside double quotes followed by a colon: Supported date formats are available here: [https://date-fns.org/docs/format](https://date-fns.org/docs/format)

- Example: `{"MM-dd-yyyy":Tomorrow}`
  - Result: Formats the date for tomorrow as `04-28-2024`.

## Unhandled Expressions

Certain expressions are unsupported and will return an "unhandled" type:

- **Invalid Month or Math Functions**

  - `{Febtember 10th}`, `{sin(pi/2)}`: Typo or unsupported function.

- **Division by Zero**

  - `{10 / 0}`: Returns `Infinity`.

- **Empty or Nested Braces**

  - `{}`, `{{1+1}}`: Not allowed.

- **Multiple Expressions in One Brace**

  - `{1+1 and Today}`: Multiple different expressions in one set of braces are unsupported.

- **Malformed Expressions**
  - Missing braces or invalid format specifiers are also unsupported.
