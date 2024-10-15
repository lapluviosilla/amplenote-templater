import { jest } from "@jest/globals";
import { mockAppWithContent, mockPlugin, mockNote } from "./test-helpers.js";
import { format } from "date-fns"; // Importing format for consistency in tests
import MockDate from "mockdate";
import waitForExpect from "wait-for-expect";
import { extractTagFromUrl, processInsertTemplate } from "./plugin.js";

// ----------------------------------------------npm ----------------------------------------
describe("This here plugin", () => {
  const plugin = mockPlugin();
  plugin.constants.isTestEnvironment = true;

  afterAll(() => {
    MockDate.reset(); // Reset the global Date to its original state
  });

  describe("Helper Functions", () => {
    test("should parse tags from daily jot urls", () => {
      const tag = extractTagFromUrl(
        "https://www.amplenote.com/jots?tag=journal%2Fprojects&otherkey=nothing"
      );
      expect(tag).toBe("journal/projects");
    });
  });

  describe("Plugin Note Create Link", () => {
    test("It should not show on invalid or non-create links", () => {
      const { app, note } = mockAppWithContent("");
      expect(plugin.linkOption.Create.check(app, "notes/new")).toBe(false);
      expect(plugin.linkOption.Create.check(app, "https://www.amplenote.com/notes/new")).toBe(
        false
      );
      expect(plugin.linkOption.Create.check(app, "https://www.amplenote.com/notes/new")).toBe(
        false
      );
    });
    test("It should insert a valid link with a template", async () => {
      const { app, note } = mockAppWithContent("A template {3+9}");
      await plugin.linkOption.Create.run(app, {
        href: "https://www.amplenote.com/notes/new?source=" + note.uuid,
      });
      expect(app.notes.create).toHaveBeenCalledTimes(1);
      expect(app.notes.create).toHaveBeenCalledWith("", null);
      const storedNotes = app._storedNotes;
      expect(storedNotes[storedNotes.length - 1].body).toEqual(`A template [12][^templater1]

[^templater1]: [12]()
3+9`);
    });
    test("It should insert a valid link with expression name and tags", async () => {
      const { app, note } = mockAppWithContent("A template");
      MockDate.set(new Date(2024, 3, 27, 10, 0, 0, 0)); // Apr 27, 2024 10:00am
      await plugin.linkOption.Create.run(app, {
        href:
          "https://www.amplenote.com/notes/new?source=" +
          note.uuid +
          "&name=" +
          encodeURIComponent("{14/2} bottles of beer {Today}") +
          "&tags=" +
          encodeURIComponent("journal/weekly,project"),
      });
      expect(app.notes.create).toHaveBeenCalledTimes(1);
      expect(app.notes.create).toHaveBeenCalledWith("7 bottles of beer April 27th, 2024", [
        "journal/weekly",
        "project",
      ]);
      const storedNotes = app._storedNotes;
      expect(storedNotes[storedNotes.length - 1].body).toEqual(`A template`);
      MockDate.reset();
    });
  });

  describe("Plugin New Note Link", () => {
    const { app, note } = mockAppWithContent("Dashboard\n");
    const templateNote = mockNote("# Weekly Review", "Template: Weekly Review", "template-1");
    app._storedNotes.push(templateNote);
    test("It should insert a new note link", async () => {
      const newNoteName = "{Monday}-{Friday}";
      app.prompt.mockImplementation(async (name, options) => {
        return [
          "Start a Weekly Review",
          newNoteName,
          "journal/weekly,review",
          { uuid: templateNote.uuid },
        ];
      });
      await plugin.insertText["New Note Link"].run(app);
      expect(app.context.replaceSelection).toHaveBeenCalledTimes(1);
      expect(app.context.replaceSelection).toHaveBeenCalledWith(
        "[Start a Weekly Review](plugin://plugin-test-uuid?action=create&name=" +
          encodeURIComponent(newNoteName) +
          "&tags=" +
          encodeURIComponent("journal/weekly,review") +
          "&source=template-1)"
      );
    });
    test("It should allow editing the note link", async () => {
      // User changes the name slightly
      app.prompt.mockImplementation(async (name, options) => {
        return ["{Monday} - {Friday}", "journal/weekly,review", { uuid: templateNote.uuid }];
      });
      app.context.updateLink = jest.fn();

      await plugin.linkOption["Edit Link"].run(app, {
        href: "plugin://plugin-test-uuid?action=create&name=%7BMonday%7D-%7BFriday%7D&tags=journal%2Fweekly%2Creview&source=template-1",
      });

      expect(app.prompt).toHaveBeenCalledTimes(2);
      const inputs = app.prompt.mock.calls[1][1].inputs;
      expect(inputs[0].value).toBe("{Monday}-{Friday}");
      expect(inputs[1].value).toBe("journal/weekly,review");
      expect(inputs[2].value).toEqual({ uuid: templateNote.uuid });

      expect(app.context.updateLink).toHaveBeenCalledTimes(1);
      expect(app.context.updateLink).toHaveBeenCalledWith({
        href: "plugin://plugin-test-uuid?action=create&name=%7BMonday%7D+-+%7BFriday%7D&tags=journal%2Fweekly%2Creview&source=template-1",
      });
    });
    test("It should create the note when new note link is pressed", async () => {
      MockDate.set(new Date(2024, 3, 27, 10, 0, 0, 0)); // Apr 27, 2024 10:00am
      // same query as before with {Monday} - {Friday} as the name
      await plugin.linkTarget(
        app,
        "&action=create&name=%7BMonday%7D%20-%20%7BFriday%7D&tags=journal%2Fweekly%2Creview&source=template-1"
      );
      const newNote = app._storedNotes[app._storedNotes.length - 1];
      expect(app.notes.create).toHaveBeenCalledTimes(1);
      expect(app.notes.create).toHaveBeenCalledWith("April 22nd, 2024 - April 26th, 2024", [
        "journal/weekly",
        "review",
      ]);
      expect(newNote.tags).toEqual(["journal/weekly", "review"]);
      expect(newNote.name).toBe("April 22nd, 2024 - April 26th, 2024");
      expect(newNote.body).toBe("# Weekly Review");

      expect(app.navigate).toHaveBeenCalledTimes(1);
      expect(app.navigate).toHaveBeenCalledWith("https://www.amplenote.com/notes/" + newNote.uuid);

      MockDate.reset();
    });
  });

  describe("dailyJotOption", () => {
    const { app, note } = mockAppWithContent("Hello");
    test("Should insert when daily jot option suggestion is clicked", async () => {
      const templateNote = mockNote("- Test Daily Jot Template {20*20}", "Template", "template-1");
      app._storedNotes.push(templateNote);
      app.context.url = "https://www.amplenote.com/notes/jots?tag=daily-jots";
      // Make the template note the default template for daily jots
      app.settings["Tag Default Templates"] = '{"daily-jots":"template-1"}';

      await plugin.dailyJotOption["There's a default dynamic template for this tag"].run(app, note);

      expect(note.body).toEqual(`- Test Daily Jot Template [400][^templater1]

[^templater1]: [400]()
20*20
Hello`);
    });
  });

  describe("Process Insert Template", () => {
    test("Should process template smart indentation bullets", async () => {
      const templateContent = `- First Bullet

    - More Info

    - Second Insertion

- Second Bullet
`;
      const templateNote = mockNote(templateContent, "Template", "template-uuid-1");

      const targetContent = `
- Projects

    - Project #1

        - Insert here {Templater}
    - Project #2
`;
      const { app, note } = mockAppWithContent(targetContent);
      app._storedNotes.push(templateNote);

      // We are expecting that the insertion
      app.context.replaceSelection = jest.fn().mockImplementation((newContent, _) => {
        note.body = note.body.replace(/{Templater}/, newContent);
        return true;
      });

      const result = await processInsertTemplate(app, note, templateNote, {
        smartIndentation: true,
      });

      const expectedMarkdown = `
- Projects

    - Project #1

        - Insert here First Bullet

            - More Info

            - Second Insertion

        - Second Bullet

    - Project #2
`;

      expect(note.body).toBe(expectedMarkdown);
    });
    test("Should process template smart indentation numbered", async () => {
      const templateContent = `1. First Bullet

    1. More Info

    1. Second Insertion

1. Second Bullet
`;
      const templateNote = mockNote(templateContent, "Template", "template-uuid-1");

      const targetContent = `
1. Projects

    1. Project #1

        1. Insert here {Templater}
    1. Project #2
`;
      const { app, note } = mockAppWithContent(targetContent);
      app._storedNotes.push(templateNote);

      // We are expecting that the insertion
      app.context.replaceSelection = jest.fn().mockImplementation((newContent, _) => {
        note.body = note.body.replace(/{Templater}/, newContent);
        return true;
      });

      const result = await processInsertTemplate(app, note, templateNote, {
        smartIndentation: true,
      });

      const expectedMarkdown = `
1. Projects

    1. Project #1

        1. Insert here First Bullet

            1. More Info

            1. Second Insertion

        1. Second Bullet

    1. Project #2
`;

      expect(note.body).toBe(expectedMarkdown);
    });

    test("Should process template smart indentation tasks", async () => {
      const templateContent = `- [ ] First Task

    - [ ] Sub Task`;
      const templateNote = mockNote(templateContent, "Template", "template-uuid-1");

      const targetContent = `
- [ ] Task #1 {Templater}

- [ ] Task #2
`;
      const { app, note } = mockAppWithContent(targetContent);
      app._storedNotes.push(templateNote);

      // We are expecting that the insertion
      app.context.replaceSelection = jest.fn().mockImplementation((newContent, _) => {
        note.body = note.body.replace(/{Templater}/, newContent);
        return true;
      });

      const result = await processInsertTemplate(app, note, templateNote, {
        smartIndentation: true,
      });

      const expectedMarkdown = `
- [ ] Task #1 First Task

    - [ ] Sub Task

- [ ] Task #2
`;

      expect(note.body).toBe(expectedMarkdown);
    });

    test("Should process template smart indentation with mixed indentable type", async () => {
      const templateContent = `- First Bullet

    - More Info

# Non-Indentable Header
`;
      const templateNote = mockNote(templateContent, "Template", "template-uuid-1");

      const targetContent = `
1. Projects

    1. Project #1

        1. Insert here {Templater}
    1. Project #2
`;
      const { app, note } = mockAppWithContent(targetContent);
      app._storedNotes.push(templateNote);

      // We are expecting that the insertion
      app.context.replaceSelection = jest.fn().mockImplementation((newContent, _) => {
        note.body = note.body.replace(/{Templater}/, newContent);
        return true;
      });

      const result = await processInsertTemplate(app, note, templateNote, {
        smartIndentation: true,
      });

      const expectedMarkdown = `
1. Projects

    1. Project #1

        1. Insert here 
        - First Bullet

            - More Info

# Non-Indentable Header

    1. Project #2
`;

      expect(note.body).toBe(expectedMarkdown);
    });
  });

  // Integration test of template insertion
  // This is the meat of the plugin
  describe("InsertText", () => {
    it("should insert tag default template", async () => {
      const { app, note } = mockAppWithContent("", "Host Note", "uuid-1", [
        "journal/weekly",
        "projects",
      ]);

      const templateNote = mockNote("\\[\\[Template\\]\\]", "Template", "template-1");
      app._storedNotes.push(templateNote);
      // Make the template note the default template for daily jots
      app.settings["Tag Default Templates"] = '{"journal/weekly":"template-1"}';

      await plugin.insertText["Tag Default Template"].run(app);

      expect(note.body).toEqual("[Template](https://www.amplenote.com/notes/template-1)");
    });
    it("should insert tag default template by matching tags", async () => {
      const { app, note } = mockAppWithContent("", "Host Note", "uuid-1", [
        "journal/weekly",
        "projects",
      ]);

      const templateNote = mockNote("\\[\\[Template\\]\\]", "Template", "template-1", [
        "journal/weekly",
        "system/template",
      ]);
      app._storedNotes.push(templateNote);
      // Make sure to mock list of system template notes
      app.notes.filter.mockImplementation(() => [templateNote]);

      await plugin.insertText["Tag Default Template"].run(app);

      expect(note.body).toEqual("[Template](https://www.amplenote.com/notes/template-1)");
    });
    it("should insert global default template", async () => {
      const { app, note } = mockAppWithContent("", "Host Note", "uuid-1", [
        "journal/weekly",
        "projects",
      ]);

      const templateNote = mockNote("\\[\\[Template\\]\\]", "Template", "template-2");
      app._storedNotes.push(templateNote);
      // Make the template note the default template for daily jots
      app.settings["Global Default Template"] = "template-2";

      await plugin.insertText["Global Default Template"].run(app);

      expect(note.body).toEqual("[Template](https://www.amplenote.com/notes/template-2)");
    });
    it("should replace expressions with evaluated results and add footnotes", async () => {
      const { app, note } = mockAppWithContent("", "Host Note", "uuid-1");
      // Step 2: Define the template content with expressions
      const templateContent = `
Today's date is {Today}.
Now is {Now}.
2 + 2 equals {2+2}.
2 * pi equals {2*pi}.
Meeting on {Monday at 3pm}.
Another Meeting on {"MM-dd-yyyy":In two days}.
Invalid expression: {Febtember 10th}.
- [ ] Follow up {start:Tomorrow at 11am} at the latest<!-- {"uuid":"task-1"} -->
- [ ] Hide {2+5} til {hide:Thursday} please and start by {start:Friday}<!-- {"uuid":"task-2"} -->
- [ ] Simple Task {start:Wednesday of Next Week} {hide:Monday of Next Week}<!-- {"uuid":"task-3"} -->
Check out your daily note for tomorrow: \\[\\[daily-notes/{Tomorrow}#My Tasks\\]\\]
Check out your special project note: \\[\\[journal/projects/Project {5+2}\\]\\]
Here is the project note again: \\[\\[journal/projects/Project {14/2}\\]\\]
Here it is in a different tag (new note): \\[\\[projects/Project {14/2}\\]\\]
Here is a link with a different display name: \\[\\[projects/Project {14/2}#Hello\\|The Special Project\\]\\]
Here is a optional dynamic link to a non-existent note: \\[\\[?projects/NotARealProject\\]\\]
`;
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
      app._storedNotes.push(templateNote);

      const mockedTasks = [
        { uuid: "task-1", content: "Follow up {start:Tomorrow at 11am} at the latest" },
        {
          uuid: "task-2",
          content: "Hide 7 til {hide:Thursday} please and start by {start:Friday}",
        },
        {
          uuid: "task-3",
          content: "Simple Task {start:Wednesday of Next Week} {hide:Monday of Next Week}",
        },
      ];

      let uuidsGenerated = [];

      Object.assign(app, {
        settings: {
          "Template Tag (default: system/template)": "system/template",
        },
        filterNotes: jest.fn().mockResolvedValue([note]),
        prompt: jest.fn().mockResolvedValue({ uuid: templateNote.uuid }),
        // getNoteContent: jest.fn().mockResolvedValue(templateContent),
        updateTask: jest.fn().mockResolvedValue(true),
        getTask: jest.fn().mockImplementation(async (uuid) => {
          uuidsGenerated.push(uuid);
          return { ...mockedTasks.pop(), uuid: uuid };
        }),
      });

      note.tasks = jest.fn().mockResolvedValue(mockedTasks);

      // Step 5: Run the insertText.run method
      const resultMarkdown = await plugin.insertText["Pick Template"].run(app);

      // Step 6: Define expected results
      const expectedToday = format(fixedDate, "MMMM do, yyyy"); // "April 27th, 2024"
      const expectedNow = format(fixedDate, "HH:mm"); // "10:00"
      const expectedMath = "4";
      const expectedMathPi = 2 * Math.PI;
      const expectedMonday = format(new Date(2024, 3, 22, 15, 0, 0, 0), "MMMM do, yyyy 'at' HH:mm"); // "April 22nd, 2024"
      const expectedTomorrow = format(new Date(2024, 3, 28, 0, 0, 0), "MMMM do, yyyy"); // "April 28th, 2024"
      const expectedTomorrowTime = new Date(2024, 3, 28, 11, 0, 0).getTime() / 1000;
      const expectedThursdayTime = new Date(2024, 3, 25, 0, 0, 0).getTime() / 1000;
      const expectedFridayTime = new Date(2024, 3, 26, 0, 0, 0).getTime() / 1000;
      const expectedWedNextWeekTime = new Date(2024, 4, 1, 0, 0, 0, 0).getTime() / 1000;
      const expectedMonNextWeekTime = new Date(2024, 3, 29, 0, 0, 0, 0).getTime() / 1000;

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
Monday at 3pm
[^templater6]: [04-29-2024]()
"MM-dd-yyyy":In two days
`.trim();

      // Step 8: Define expected markdown after processing
      // Math and date expressions have been evaluated and turned into rich footnotes
      //
      const expectedMarkdown = `
Today's date is [${expectedToday}][^templater1].
Now is [${expectedNow}][^templater2].
2 + 2 equals [${expectedMath}][^templater3].
2 * pi equals [${expectedMathPi}][^templater4].
Meeting on [${expectedMonday}][^templater5].
Another Meeting on [04-29-2024][^templater6].
Invalid expression: {Febtember 10th}.
- [ ] Follow up {start:Tomorrow at 11am} at the latest<!-- {"uuid":"${uuidsGenerated[0]}"} -->
- [ ] Hide 7 til {hide:Thursday} please and start by {start:Friday}<!-- {"uuid":"${uuidsGenerated[1]}"} -->
- [ ] Simple Task {start:Wednesday of Next Week} {hide:Monday of Next Week}<!-- {"uuid":"${uuidsGenerated[2]}"} -->
Check out your daily note for tomorrow: [${expectedTomorrow}#My Tasks](https://www.amplenote.com/notes/uuid-3#My_Tasks)
Check out your special project note: [Project 7](https://www.amplenote.com/notes/uuid-4)
Here is the project note again: [Project 7](https://www.amplenote.com/notes/uuid-4)
Here it is in a different tag (new note): [Project 7](https://www.amplenote.com/notes/uuid-5)
Here is a link with a different display name: [The Special Project](https://www.amplenote.com/notes/uuid-5#Hello)
Here is a optional dynamic link to a non-existent note: [[projects/NotARealProject]]


${expectedFootnotes}
`.trim();

      // Step 9: Assert that replaceSelection was called with expectedMarkdown
      // expect(app.context.replaceSelection).toHaveBeenCalledWith(expectedMarkdown);

      expect(app.context.replaceSelection).toHaveBeenCalledTimes(1);
      const actualMarkdown = app.context.replaceSelection.mock.calls[0][0];

      await waitForExpect(() => {
        expect(app.updateTask).toHaveBeenCalledTimes(3);
      });
      expect(new Set(app.updateTask.mock.calls)).toStrictEqual(
        new Set([
          [
            uuidsGenerated[2],
            {
              content: "Follow up Tomorrow at 11am at the latest",
              startAt: expectedTomorrowTime,
            },
          ],
          [
            uuidsGenerated[1],
            {
              content: "Hide 7 til Thursday please and start by Friday",
              hideUntil: expectedThursdayTime,
              startAt: expectedFridayTime,
            },
          ],
          [
            uuidsGenerated[0],
            {
              content: "Simple Task Wednesday of Next Week Monday of Next Week",
              hideUntil: expectedMonNextWeekTime,
              startAt: expectedWedNextWeekTime,
            },
          ], // Second call
        ])
      );

      // Step 9: Assert the result matches expected markdown
      // expect(actualMarkdown.trim()).toBe(expectedMarkdown);
      expect(note.body.trim()).toBe(expectedMarkdown);

      // There should be 5 notes (the seed note, template note, and the three notes created)
      expect(app.notes.create).toHaveBeenCalledTimes(3);
      expect(app._storedNotes.length).toBe(5);

      // Step 10: Reset MockDate after the test
      MockDate.reset();
    });
  });
});
