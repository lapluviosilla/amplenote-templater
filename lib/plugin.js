// plugin.js

import { evaluateExpression } from "./evaluator";
import { generateUUID } from "./uuid";
import { format } from "date-fns"; // Importing date-fns for date formatting

/**
 * Helper function to determine if a given index is inside a link ([[...]])
 * @param {number} matchIndex - The index where the match starts
 * @param {number} matchLength - The length of the matched string
 * @param {string} string - The entire string being processed
 * @returns {boolean} - True if inside a link, else False
 */
function isInsideLink(matchIndex, matchLength, string) {
  const start = string.lastIndexOf(`\\[\\[`, matchIndex);
  const end = string.indexOf(`\\]\\]`, matchIndex);

  return start !== -1 && end !== -1 && start < matchIndex && end >= matchIndex + matchLength;
}

/**
 * Helper function to determine if a given index is inside a task (- [ ] ...)
 * @param {number} matchIndex - The index where the match starts
 * @param {string} string - The entire string being processed
 * @returns {boolean} - True if inside a task, else False
 */
function isInsideTask(matchIndex, string) {
  const lineStart = string.lastIndexOf("\n", matchIndex) + 1;
  const taskIndicator = "- [ ]";

  return string.startsWith(taskIndicator, lineStart);
}

/**
 * Evaluates expressions within the link content.
 * @param {string} linkContent - The content of the link
 * @returns {string} - The evaluated content
 */
function evaluateLinkContent(linkContent) {
  const innerExpressionRegex = /\{([^}]+)\}/g;
  return linkContent.replace(innerExpressionRegex, (m, expr) => {
    const evalResult = evaluateExpression(m);
    return evalResult.type === "date" ? format(evalResult.result, "MMMM do, yyyy") : expr;
  });
}

/**
 * Extracts the tag and note name from the evaluated link content.
 * @param {string} evaluatedContent - The evaluated content of the link
 * @returns {Object} - An object containing tag and noteName
 */
function extractTagAndNoteName(evaluatedContent) {
  let tag = null;
  let noteName = evaluatedContent;
  const tagSeparatorIndex = evaluatedContent.lastIndexOf("/");

  if (tagSeparatorIndex !== -1) {
    tag = evaluatedContent.substring(0, tagSeparatorIndex);
    noteName = evaluatedContent.substring(tagSeparatorIndex + 1).trim();
  }

  return { tag, noteName };
}

/**
 * Finds a note by name and tag or creates it if it doesn't exist.
 * @param {Object} app - The app instance
 * @param {string} noteName - The name of the note
 * @param {string|null} tag - The tag associated with the note
 * @returns {Promise<Object>} - The note handle
 */
async function findOrCreateNote(app, noteName, tag) {
  let noteHandle = tag
    ? await app.notes.find({ name: noteName, tags: [tag] })
    : await app.notes.find({ name: noteName });

  // If note does not exist, create it
  if (!noteHandle) {
    noteHandle = await app.notes.create(noteName, tag ? [tag] : []);
  }

  return noteHandle;
}

/**
 * Evaluates expressions and handles footnote creation if necessary.
 * @param {string} match - The matched expression
 * @param {string} expression - The inner expression
 * @param {boolean} insideContext - If the match is inside a link or task
 * @param {Array} footnotes - The footnotes array to update
 * @param {Object} footnoteData - An object holding the footnote counter
 * @returns {string} - The result after evaluation
 */
function evaluateExpressionAndFootnote(match, expression, insideContext, footnoteData) {
  const evaluation = evaluateExpression(match);

  if (evaluation.type === "math") {
    const result = evaluation.result;

    if (insideContext) {
      return result; // Replace with result without footnote
    } else {
      return createFootnote(result, expression, footnoteData);
    }
  } else if (evaluation.type === "date") {
    const formattedDate = formatDate(evaluation.result);
    return insideContext ? formattedDate : createFootnote(formattedDate, expression, footnoteData);
  } else {
    return match; // If unhandled, leave the expression as is
  }
}

/**
 * Formats a date object to a string in the amplenote way.
 * @param {Date} date - The date to format
 * @returns {string} - The formatted date string
 */
function formatDate(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  return hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0
    ? format(date, "MMMM do, yyyy")
    : format(date, "MMMM do, yyyy 'at' HH:mm:ss");
}

/**
 * Creates a footnote from the result and expression, updating the footnotes array.
 * @param {string} result - The result to reference in the footnote
 * @param {string} expression - The original expression
 * @param {Array} footnotes - The footnotes array to update
 * @param {Object} footnoteData - An object holding the footnote counter
 * @returns {string} - The footnote reference string
 */
function createFootnote(result, expression, footnoteData) {
  const footnoteIndex = footnoteData.counter++;
  footnoteData.content.push(`[^templater${footnoteIndex}]: [${result}]()\n${expression}`);
  return `[${result}][^templater${footnoteIndex}]`;
}

/**
 * Processes each link in the markdown text and returns the modified markdown.
 * @param {Object} app - The app instance
 * @param {string} markdown - The markdown content
 * @returns {Promise<string>} - The processed markdown
 */
async function processLinks(app, markdown) {
  const linkRegex = /\\\[\\\[([^\]]+)\\\]\\\]/g;
  const matches = [...markdown.matchAll(linkRegex)];

  for (const match of matches) {
    const fullMatch = match[0]; // e.g., [[Note Name]] or [[tag/Note Name]]
    let linkContent = match[1]; // e.g., "Note Name" or "tag/Note Name"

    // Evaluate expressions within the link content
    linkContent = evaluateLinkContent(linkContent);

    // Extract tag and note name
    const { tag, noteName } = extractTagAndNoteName(linkContent);

    // Find or create the note
    const noteHandle = await findOrCreateNote(app, noteName, tag);

    // Get the note URL and replace the link in the markdown
    const noteURL = await noteHandle.url();
    const markdownLink = `[${noteName}](${noteURL})`;
    markdown = markdown.replace(fullMatch, markdownLink);
  }

  return markdown;
}

/**
 * Parses the template markdown to extract tasks, replace their UUIDs with new ones,
 * and returns the modified markdown and the list of new UUIDs.
 * @param {string} markdown - The markdown content of the template
 * @returns {{ modifiedMarkdown: string, newUUIDs: Array<string> }} - An object containing the modified markdown and the new UUIDs
 */
function replaceTaskUUIDs(markdown) {
  const taskRegex = /- \[ \] [^\n]*<!--\s*({[^}]+})\s*-->/g; // Regex to match the task format with JSON object
  let modifiedMarkdown = markdown; // Start with the original markdown
  const newTaskUUIDs = []; // Array to store new UUIDs
  let match;

  while ((match = taskRegex.exec(markdown)) !== null) {
    const jsonString = match[1]; // Extracted JSON string from the regex match
    const newUUID = generateUUID(); // Generate a new UUID

    // Replace the old UUID with the new one in the JSON string
    const newJsonString = jsonString.replace(/"uuid":"[^"]+"/, `"uuid":"${newUUID}"`);

    // Replace the original JSON string in the markdown with the new one
    modifiedMarkdown = modifiedMarkdown.replace(jsonString, newJsonString);

    // Add the new UUID to the array
    newTaskUUIDs.push(newUUID);
  }

  return { modifiedMarkdown, newTaskUUIDs }; // Return the modified markdown and new UUIDs
}

/**
 * Waits for a task to become available based on its UUID, checking at specified intervals.
 * @param {Object} app - The app instance
 * @param {string} taskUUID - The UUID of the task to check
 * @param {number} maxWaitTime - The maximum time to wait in milliseconds
 * @param {number} checkInterval - The time between checks in milliseconds
 * @returns {Promise<Object|null>} - A promise that resolves with the task object or null if not found
 */
async function waitForTask(app, taskUUID, maxWaitTime, checkInterval) {
  const startTime = Date.now();

  while (true) {
    const task = await app.getTask(taskUUID); // Fetch the task by UUID
    if (task) {
      return task; // Return the task if found
    }

    // Break if the max wait time has been exceeded
    if (Date.now() - startTime > maxWaitTime) {
      return null; // Return null if the task is not found within the max wait time
    }

    // Wait for the specified interval before checking again
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
}

/**
 * Processes tasks in the current note and updates their metadata.
 * @param {Object} app - The app instance
 * @param {Array<string>} newTaskUUIDs - The new task UUIDs we're updating
 * @returns {Promise<void>} - A promise that resolves when processing is complete
 */
async function processTasks(app, newTaskUUIDs) {
  const updatePromises = newTaskUUIDs.map(async (taskUUID) => {
    const task = await waitForTask(app, taskUUID, 5000, 100); // Wait for the task to become available

    if (!task) {
      console.error(`Task with UUID ${taskUUID} could not be found.`);
      return; // Skip this task if it doesn't exist after polling
    }

    let description = task.content;
    let commentObj = {}; // Placeholder for the task's metadata

    // Check for {start:} or {hide:} expressions in the task description
    const taskExpressionRegex = /\{(start|hide):([^}]+)\}/g;
    let match;

    while ((match = taskExpressionRegex.exec(description)) !== null) {
      const [fullMatch, prefix, expression] = match;
      const evaluation = evaluateExpression(`{${expression}}`);
      if (evaluation.type !== "date") continue;

      const date = evaluation.result;
      const timestamp = Math.floor(date.getTime() / 1000); // Convert to Unix timestamp (seconds)

      // Update task metadata based on the prefix
      if (prefix === "start") {
        commentObj.startAt = timestamp;
      } else if (prefix === "hide") {
        commentObj.hideUntil = timestamp;
      }

      // Remove the {prefix:expression} from the description
      description = description.replace(fullMatch, expression.trim()).trim();
    }

    // Update the task with the new description and metadata
    await app.updateTask(task.uuid, { content: description, ...commentObj });
  });

  // Wait for all updates to complete
  await Promise.all(updatePromises);
}

// --------------------------------------------------------------------------------------
// API Reference: https://www.amplenote.com/help/developing_amplenote_plugins
// Tips on developing plugins: https://www.amplenote.com/help/guide_to_developing_amplenote_plugins
const plugin = {
  // --------------------------------------------------------------------------------------
  constants: {},

  // --------------------------------------------------------------------------
  // https://www.amplenote.com/help/developing_amplenote_plugins#insertText
  insertText: {
    check(app) {
      return "Templater";
    },

    async run(app) {
      // Step 1: Select Template
      const templateTag =
        app.settings["Template Tag (default: system/template)"] || "system/template";
      const templateNotes = await app.filterNotes({ tag: templateTag });

      if (templateNotes.length === 0) {
        await app.alert("No templates found with the specified tag.");
        return;
      }

      const options = templateNotes.map((note) => ({
        label: note.name,
        value: note.uuid,
      }));

      const selection = await app.prompt("Pick a template", {
        inputs: [{ type: "select", options }],
      });

      if (!selection) {
        // User cancelled the prompt
        return;
      }

      const selectedUUID = selection;
      let templateMarkdown = await app.getNoteContent({ uuid: selectedUUID });

      // Initialize footnote counter and storage
      const footnoteData = { counter: 1, content: [] }; // Wrap counter in an object

      // Step 2: Replace Expressions with Evaluated Results and Footnotes
      const expressionRegex = /\{(?:(start|hide):)?([^}]+)\}/g;

      templateMarkdown = templateMarkdown.replace(
        expressionRegex,
        (match, prefix, expression, offset, string) => {
          const insideLink = isInsideLink(offset, match.length, string);
          const insideTask = isInsideTask(offset, string);
          const insideContext = insideLink || insideTask;

          // Handle only non-task and non-link expressions for footnotes
          if (prefix && insideTask) {
            return match; // Keep as is
          }

          return evaluateExpressionAndFootnote(match, expression, insideContext, footnoteData);
        }
      );

      // Step 4: Process Note Links ([[...]])
      templateMarkdown = await processLinks(app, templateMarkdown);

      // Step 5: Append Footnotes at the End of the Markdown
      if (footnoteData.content.length > 0) {
        templateMarkdown += "\n\n" + footnoteData.content.join("\n");
      }

      // Replace task UUIDs with new ones in the template markdown
      const { modifiedMarkdown, newTaskUUIDs } = replaceTaskUUIDs(templateMarkdown);
      templateMarkdown = modifiedMarkdown;

      // Step 6: Insert the Processed Markdown into the Note
      const replacedSelection = await app.context.replaceSelection(templateMarkdown);

      console.log("Task UUIDs:" + newTaskUUIDs);

      // Step 7: Process new tasks
      // Schedule task processing after a short delay
      await processTasks(app, newTaskUUIDs);

      return replacedSelection ? null : templateMarkdown; // Fall back if not valid at selection position
    },
  },

  // --------------------------------------------------------------------------
  // https://www.amplenote.com/help/developing_amplenote_plugins#noteOption
  noteOption: {
    "Baby's first Note Option command": {
      check: async function (app, noteUUID) {
        const noteContent = await app.getNoteContent({ uuid: noteUUID });
        return /cool/i.test(noteContent.toLowerCase());
      },
      run: async function (app, noteUUID) {
        await app.alert("You clicked the Baby's first Note Option command in a COOL note!");
        console.debug("Special message to the DevTools console");
      },
    },
  },

  // --------------------------------------------------------------------------
  // https://www.amplenote.com/help/developing_amplenote_plugins#replaceText
  replaceText: {},

  // There are several other entry points available, check them out here: https://www.amplenote.com/help/developing_amplenote_plugins#Actions
  // You can delete any of the insertText/noteOptions/replaceText keys if you don't need them
};

export default plugin;
