import { jest } from "@jest/globals";
import { mockAppWithContent, mockPlugin, mockNote } from "./test-helpers.js";
import { format } from "date-fns"; // Importing format for consistency in tests
import MockDate from "mockdate";

// ----------------------------------------------npm ----------------------------------------
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
    // Step 2: Define the template content with expressions
    const templateContent = `
Today's date is {Today}.
Now is {Now}.
2 + 2 equals {2+2}.
2 * pi equals {2*pi}.
Meeting on {Monday}.
Invalid expression: {Febtember 10th}.
- [ ] Follow up {start:Tomorrow} at the latest<!-- {"uuid":"task-1"} -->
- [ ] Hide {2+5} til {hide:Thursday} please and start by {start:Friday}<!-- {"uuid":"task-2"} -->
Check out your daily note for tomorrow: \\[\\[daily-notes/{Tomorrow}\\]\\]
Check out your special project note: \\[\\[journal/projects/{5+2}\\]\\]
`;
    const { app, note } = mockAppWithContent(templateContent);
    it("should replace expressions with evaluated results and add footnotes", async () => {
      // Step 1: Set a fixed date for deterministic testing
      const fixedDate = new Date(2024, 3, 27, 10, 0, 0, 0); // April 27, 2024, 10:00:00 AM
      MockDate.set(fixedDate);

      // Step 3: Mock template notes
      const templateNote = mockNote(
        templateContent,
        "Sample Template",
        "template-uuid-1",
        "system/template"
      );

      const mockedTasks = [
        { uuid: "task-1", content: "Follow up {start:Tomorrow} at the latest" },
        {
          uuid: "task-2",
          content: "Hide 7 til {hide:Thursday} please and start by {start:Friday}",
        },
      ];

      let uuidsGenerated = [];

      Object.assign(app, {
        settings: {
          "Template Tag (default: system/template)": "system/template",
        },
        filterNotes: jest.fn().mockResolvedValue([note]),
        prompt: jest.fn().mockResolvedValue(templateNote.uuid),
        getNoteContent: jest.fn().mockResolvedValue(templateContent),
        updateTask: jest.fn().mockResolvedValue(true),
        getTask: jest.fn().mockImplementation(async (uuid) => {
          uuidsGenerated.push(uuid);
          return { ...mockedTasks.pop(), uuid: uuid };
        }),
      });

      note.tasks = jest.fn().mockResolvedValue(mockedTasks);

      // Step 5: Run the insertText.run method
      const resultMarkdown = await plugin.insertText.run(app);

      // Step 6: Define expected results
      const expectedToday = format(fixedDate, "MMMM do, yyyy"); // "April 27th, 2024"
      const expectedNow = format(fixedDate, "MMMM do, yyyy 'at' HH:mm:ss"); // "April 27th, 2024 at 10:00:00"
      const expectedMath = "4";
      const expectedMathPi = 2 * Math.PI;
      const expectedMonday = format(new Date(2024, 3, 22, 0, 0, 0, 0), "MMMM do, yyyy"); // "April 22nd, 2024"
      const expectedTomorrow = format(new Date(2024, 3, 28, 0, 0, 0), "MMMM do, yyyy"); // "April 28th, 2024"
      const expectedTomorrowTime = new Date(2024, 3, 28, 0, 0, 0).getTime() / 1000;
      const expectedThursdayTime = new Date(2024, 3, 25, 0, 0, 0).getTime() / 1000;
      const expectedFridayTime = new Date(2024, 3, 26, 0, 0, 0).getTime() / 1000;

      // Step 7: Define expected footnotes
      const expectedFootnotes = `
[^templater1]: [${expectedToday}]()
Today
[^templater2]: [${expectedNow}]()
Now
[^templater3]: [${expectedMath}]()
2+2
[^templater4]: [${expectedMathPi}]()
2*pi
[^templater5]: [${expectedMonday}]()
Monday
`.trim();

      // Step 8: Define expected markdown after processing
      const expectedMarkdown = `
Today's date is [${expectedToday}][^templater1].
Now is [${expectedNow}][^templater2].
2 + 2 equals [${expectedMath}][^templater3].
2 * pi equals [${expectedMathPi}][^templater4].
Meeting on [${expectedMonday}][^templater5].
Invalid expression: {Febtember 10th}.
- [ ] Follow up {start:Tomorrow} at the latest<!-- {"uuid":"${uuidsGenerated[0]}"} -->
- [ ] Hide 7 til {hide:Thursday} please and start by {start:Friday}<!-- {"uuid":"${uuidsGenerated[1]}"} -->
Check out your daily note for tomorrow: [${expectedTomorrow}](https://www.amplenote.com/notes/uuid-2)
Check out your special project note: [7](https://www.amplenote.com/notes/uuid-3)


${expectedFootnotes}
`.trim();

      // Step 9: Assert that replaceSelection was called with expectedMarkdown
      // expect(app.context.replaceSelection).toHaveBeenCalledWith(expectedMarkdown);

      // Optional: Verify that replaceSelection was called exactly once
      expect(app.context.replaceSelection).toHaveBeenCalledTimes(1);
      const actualMarkdown = app.context.replaceSelection.mock.calls[0][0];

      expect(app.updateTask).toHaveBeenCalledTimes(2);
      expect(new Set(app.updateTask.mock.calls)).toEqual(
        new Set([
          [
            uuidsGenerated[1],
            {
              content: "Follow up Tomorrow at the latest",
              startAt: expectedTomorrowTime,
            },
          ], // First call
          [
            uuidsGenerated[0],
            {
              content: "Hide 7 til Thursday please and start by Friday",
              hideUntil: expectedThursdayTime,
              startAt: expectedFridayTime,
            },
          ], // Second call
        ])
      );

      // Step 9: Assert the result matches expected markdown
      // expect(actualMarkdown.trim()).toBe(expectedMarkdown);
      expect(note.body.trim()).toBe(expectedMarkdown);

      // Step 10: Reset MockDate after the test
      MockDate.reset();
    });
  });
});
