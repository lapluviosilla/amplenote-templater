// Templater plugin.js
import { evaluateExpression } from "./evaluator";
import { generateUUID, generateShortUUID } from "./uuid";
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

/**
 * Adjusts the template markdown to have indentable lines match the given indentation.
 * Normal text lines are transformed to match the type of indentable line if the flag is true.
 * This function assumes that we are inserting into a indented context.
 * If the insert point isn't indented, then this function shouldn't be called in the first place.
 * @param {string} templateMarkdown - The original markdown template
 * @param {string} indentation - The indentation to apply
 * @param {boolean} adjustNormalTextLines - Whether to treat normal text lines as indentable
 * @returns {string} - The modified template with adjusted indentation
 */
function adjustTemplateIndentation(templateMarkdown, indentation, indentationType) {
  const lines = templateMarkdown.split(/\r?\n/); // Split efficiently into lines
  let modifiedLines = [];
  let lastIndentableType = indentationType; // Track the last indentable type (bullet, number, etc.)
  let lineCount = 0;

  // First line is special case since we are inserting in the middle of an existing indentable type
  const firstLine = lines.shift();
  if (getLineIndentableType(firstLine) === indentationType) {
    // If indentable type matches go ahead and insert into existing indentation
    // (stripping the indentation of the template so we don't have a double indentation mark)
    modifiedLines.push(stripIndentation(firstLine));
  } else if (isLineIndentable(firstLine)) {
    // If both are indentable but of mismatched types then go ahead and insert into the next line at current indentation level.
    modifiedLines.push("");
    modifiedLines.push(`${indentation}${firstLine}`);
  } else {
    // Template is not indentable, return AS IS with a new line in front
    return "\n" + templateMarkdown;
  }

  // Flag if the prior line had a continuation at the end.
  let prevLineContinuation = firstLine.trim().endsWith("\\");

  // First line was indentable, so lets continue with the rest of the block, as long as we can.
  for (const line of lines) {
    // Check if the line is indentable (bullet, numbered, task list)
    const isIndentable = isLineIndentable(line);
    // Check if the line is a continuation line
    const isContinuationLine = line.trim().endsWith("\\");

    if (line === "" || prevLineContinuation) {
      // Ignore empty lines and lines after continuation lines, pass on AS IS
      modifiedLines.push(line);
    } else if (isIndentable) {
      // If it's an indentable line, apply the context indentation
      modifiedLines.push(`${indentation}${line}`);
      lastIndentableType = getLineIndentableType(line); // Track the type of the last indentable line
    } else {
      // We encountered a non-indentable line, stop adjusting indentation
      modifiedLines.push(...lines.slice(lineCount));
      break;
    }
    prevLineContinuation = isContinuationLine;
    lineCount++;
  }

  return modifiedLines.join("\n"); // Join lines back to a string
}

/**
 * Checks if a line is indentable (bullet, numbered, task list).
 * @param {string} line - The line of text
 * @returns {boolean} - True if the line is indentable, false otherwise
 */
function isLineIndentable(line) {
  return getLineIndentableType(line) != null;
}

/**
 * Gets the type of line (bullet, numbered, task).
 * @param {string} line - The line of text
 * @returns {string|null} - The type of the line ('bullet', 'number', 'task', or null)
 */
function getLineIndentableType(line) {
  if (/^\s*-\s/.test(line)) return "bullet";
  if (/^\s*\d+\.\s/.test(line)) return "number";
  if (/^\s*-\s\[ \]/.test(line)) return "task";
  return null;
}

/// Abandoned feature to optionally indent normal text
/**
 * Transforms a normal text line into an indentable line based on the last indentable type.
 * @param {string} line - The normal text line
 * @param {string|null} lastIndentableType - The type of the last indentable line
 * @returns {string} - The transformed line
 */
// function transformNormalText(line, lastIndentableType) {
//   if (lastIndentableType === "bullet") {
//     return `- ${line.trim()}`; // Transform to bullet
//   } else if (lastIndentableType === "number") {
//     return `1. ${line.trim()}`; // Transform to numbered list; may need logic for numbering
//   } else if (lastIndentableType === "task") {
//     return `- [ ] ${line.trim()}`; // Transform to task
//   }
//   return line; // Return unchanged if there's no last indentable type
// }

/**
 * Retrieves the current line from the content based on the insert position.
 * @param {string} content - The full content of the note
 * @param {number} position - The index of the insertion point
 * @returns {string} - The current line of text
 */
function getCurrentLine(content, position) {
  const start = content.lastIndexOf("\n", position);
  const end = content.indexOf("\n", position);
  const lineEnd = end === -1 ? content.length : end; // Handle end of file case
  return content.substring(start + 1, lineEnd); // Extract the line
}

/**
 * Gets the indentation of the current line.
 * @param {string} line - The line of text
 * @returns {string} - The leading whitespace of the line
 */
function getIndentation(line) {
  const match = line.match(/^(\s*)/); // Match leading whitespace
  return match ? match[0] : ""; // Return the indentation
}

/**
 * Strips indentation (including indentation type) from a line.
 * @param {string} line - The line of text from which to strip indentation
 * @returns {string} - The line with indentation removed
 */
function stripIndentation(line) {
  // Match and remove leading whitespace and any bullet, number, or task indicators
  return line.replace(/^\s*([-*]\s+|\d+\.\s+|\s*-\s\[ \]\s*)/, "").trim();
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

      // Step 3: Process Note Links ([[...]])
      templateMarkdown = await processLinks(app, templateMarkdown);

      // Step 4: Pre-process Tasks
      // Replace task UUIDs with new ones in the template markdown
      const { modifiedMarkdown, newTaskUUIDs } = replaceTaskUUIDs(templateMarkdown);
      templateMarkdown = modifiedMarkdown;

      // Step 5: Determine indentation at insertion
      // Because the Plugin API doesn't offer a direct way to read the line at current selection cursor
      // e need to use a workround of inserting a unique tag and then reading the note body to discover the line context
      const selectionTaggedUUID = "<Templater-" + generateShortUUID() + ">";
      const replacedWithTag = await app.context.replaceSelection(selectionTaggedUUID);
      // If tag replacement failed, then fallback and return the template content as text
      if (!replacedWithTag) {
        return templateMarkdown;
      }

      const thisNote = await app.notes.find(app.context.noteUUID);
      const thisNoteCurrentContent = await thisNote.content();

      // Find the position of the selection in the current content
      const insertPosition = thisNoteCurrentContent.indexOf(selectionTaggedUUID);
      if (insertPosition === -1) {
        console.error("Template Insert tag not found.");
        return; // Handle error case
      }

      // Get the current line based on the insertion point
      const currentLine = getCurrentLine(thisNoteCurrentContent, insertPosition);

      // Step 6: Modify template to match insertion indentation if possible
      // Check if the current line is indentable, if so then adjust the template indentation
      if (isLineIndentable(currentLine)) {
        const indentation = getIndentation(currentLine);

        // Modify the template markdown with indentation
        templateMarkdown = adjustTemplateIndentation(
          templateMarkdown,
          indentation,
          getLineIndentableType(currentLine)
        );
      }

      // Step 7: Append Footnotes
      if (footnoteData.content.length > 0) {
        templateMarkdown += "\n\n" + footnoteData.content.join("\n");
      }

      // Step 8: Insert Template into Note BOdy
      const finalContent = thisNoteCurrentContent.replace(selectionTaggedUUID, templateMarkdown);

      // Step 7: Insert the Processed Markdown into the Note and replace the Note Content
      // Since we have no more processing to do, go ahead and execute without awaiting
      thisNote.replaceContent(finalContent);

      // Step 8: Process new tasks
      // Schedule task processing
      // - Since Amplenote has a delay before tasks are available we have to asynchronously wait for them to be available.
      processTasks(app, newTaskUUIDs);

      // No need to insert text
      return null;
    },
  },
};

export default plugin;
