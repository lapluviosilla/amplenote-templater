import { jest } from "@jest/globals";
import { mockAppWithContent, mockPlugin } from "./test-helpers.js";
import { format } from "date-fns"; // Importing format for consistency in tests
import MockDate from "mockdate";

// --------------------------------------------------------------------------------------
describe("This here plugin", () => {
  const plugin = mockPlugin();
  plugin.constants.isTestEnvironment = true;

  afterAll(() => {
    MockDate.reset(); // Reset the global Date to its original state
  });

  it("should run some tests", async () => {
    const { app, note } = mockAppWithContent(`To be, or not to be, that is the cool question`);
    expect(
      await plugin.noteOption["Baby's first Note Option command"].check(app, note.uuid)
    ).toBeTruthy();
  });

  // New InsertText test
  describe("InsertText", () => {
    it("should replace expressions with evaluated results and add footnotes", async () => {
      // Step 1: Set a fixed date for deterministic testing
      const fixedDate = new Date(2024, 3, 27, 10, 0, 0, 0); // April 27, 2024, 10:00:00 AM
      MockDate.set(fixedDate);

      // Step 2: Define the template content with expressions
      const templateContent = `
Today's date is {Today}.
Now is {Now}.
2 + 2 equals {2+2}.
2 * pi equals {2*pi}.
Meeting on {Monday}.
Invalid expression: {Febtember 10th}.
Check out your daily note for tomorrow: [[daily-notes/{Tomorrow}]]
`;

      // Step 3: Mock template notes
      const templateNote = {
        uuid: "template-uuid-1",
        name: "Sample Template",
        tag: "system/template",
        content: templateContent,
      };

      // Step 4: Mock the app's methods
      const app = {
        settings: {
          "Template Tag (default: system/template)": "system/template",
        },
        filterNotes: jest.fn().mockResolvedValue([templateNote]),
        prompt: jest.fn().mockResolvedValue(templateNote.uuid),
        getNoteContent: jest.fn().mockResolvedValue(templateContent),
        context: {
          replaceSelection: jest.fn().mockResolvedValue(true),
        },
      };

      // Step 5: Run the insertText.run method
      const resultMarkdown = await plugin.insertText.run(app);

      // Step 6: Define expected results
      const expectedToday = format(fixedDate, "MMMM do, yyyy"); // "April 27th, 2024"
      const expectedNow = format(fixedDate, "MMMM do, yyyy 'at' HH:mm:ss"); // "April 27th, 2024 at 10:00:00"
      const expectedMath = "4";
      const expectedMathPi = 2 * Math.PI;
      const expectedMonday = format(new Date(2024, 3, 22, 0, 0, 0, 0), "MMMM do, yyyy"); // "April 22nd, 2024"
      const expectedTomorrow = format(new Date(2024, 3, 28, 0, 0, 0), "MMMM do, yyyy"); // "April 28th, 2024"

      // Step 7: Define expected footnotes
      const expectedFootnotes = `
[^1]: [${expectedToday}]()
Today
[^2]: [${expectedNow}]()
Now
[^3]: [${expectedMath}]()
2+2
[^4]: [${expectedMathPi}]()
2*pi
[^5]: [${expectedMonday}]()
Monday
`.trim();

      // Step 8: Define expected markdown after processing
      const expectedMarkdown = `
Today's date is [${expectedToday}][^1].
Now is [${expectedNow}][^2].
2 + 2 equals [${expectedMath}][^3].
2 * pi equals [${expectedMathPi}][^4].
Meeting on [${expectedMonday}][^5].
Invalid expression: {Febtember 10th}.
Check out your daily note for tomorrow: [[daily-notes/${expectedTomorrow}]]


${expectedFootnotes}
`.trim();

      // Step 9: Assert that replaceSelection was called with expectedMarkdown
      // expect(app.context.replaceSelection).toHaveBeenCalledWith(expectedMarkdown);

      // Optional: Verify that replaceSelection was called exactly once
      expect(app.context.replaceSelection).toHaveBeenCalledTimes(1);
      const actualMarkdown = app.context.replaceSelection.mock.calls[0][0];

      // Step 9: Assert the result matches expected markdown
      expect(actualMarkdown.trim()).toBe(expectedMarkdown);

      // Step 10: Reset MockDate after the test
      MockDate.reset();
    });
  });
});
