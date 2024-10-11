// Templater plugin.js
import { evaluateExpression } from "./evaluator";
import { generateUUID, generateShortUUID } from "./uuid";
import { format, startOfTomorrow } from "date-fns"; // Importing date-fns for date formatting
import embedHtml from "../templates/embed.html";
import expiryStorage from "./expiryStorage";

// =============================
// Helper Functions
// =============================

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
  return line.replace(/^\s*(\s*-\s\[ \]\s*|[-*]\s+|\d+\.\s+)/, "").trim();
}

/**
 * Extracts and decodes the 'tag' parameter from a given URL.
 *
 * @param {string} url - The URL string to extract the tag from.
 * @returns {string|null} - The decoded tag value or null if not found.
 */
export function extractTagFromUrl(url) {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // Get the 'tag' parameter from the query string
    const tagParam = parsedUrl.searchParams.get("tag");

    // If 'tag' exists, decode and return it; otherwise, return null
    return tagParam ? decodeURIComponent(tagParam) : null;
  } catch (error) {
    console.error("Invalid URL provided:", error);
    return null;
  }
}

// =============================
// Expression Evaluation
// =============================

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
 * Evaluates expressions and handles footnote creation if necessary.
 * @param {string} match - The matched expression
 * @param {string} expression - The inner expression
 * @param {boolean} insideContext - If the match is inside a link or task
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
  } else if (
    evaluation.type === "date" ||
    evaluation.type === "dateTime" ||
    evaluation.type === "time"
  ) {
    const formattedDate = formatDateEvaluation(evaluation);
    return insideContext ? formattedDate : createFootnote(formattedDate, expression, footnoteData);
  } else if (evaluation.type === "formattedDate") {
    return insideContext
      ? evaluation.result
      : createFootnote(evaluation.result, expression, footnoteData);
  } else {
    return match; // If unhandled, leave the expression as is
  }
}

/**
 * Formats a date evaluation to a string according to the type
 * @param {Object} dateResult - The date evaluation
 * @returns {string} - The formatted date string
 */
function formatDateEvaluation(dateEvaluation) {
  const date = dateEvaluation.result;
  const seconds = date.getSeconds();

  if (dateEvaluation.type === "dateTime") {
    return seconds > 0
      ? format(date, "MMMM do, yyyy 'at' HH:mm:ss")
      : format(date, "MMMM do, yyyy 'at' HH:mm");
  } else if (dateEvaluation.type === "date") {
    return format(date, "MMMM do, yyyy");
  } else if (dateEvaluation.type === "time") {
    return seconds > 0 ? format(date, "HH:mm:ss") : format(date, "HH:mm");
  } else {
    return null;
  }
}

/**
 * Creates a footnote from the result and expression, updating the footnotes array.
 * @param {string} result - The result to reference in the footnote
 * @param {string} expression - The original expression
 * @param {Object} footnoteData - An object holding the footnote counter
 * @returns {string} - The footnote reference string
 */
function createFootnote(result, expression, footnoteData) {
  const footnoteIndex = footnoteData.counter++;
  footnoteData.content.push(`[^templater${footnoteIndex}]: [${result}]()\n${expression}`);
  return `[${result}][^templater${footnoteIndex}]`;
}

// =============================
// Link Processing
// =============================

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
 * Processes each link in the markdown text and returns the modified markdown.
 * @param {Object} app - The app instance
 * @param {string} markdown - The markdown content
 * @returns {Promise<string>} - The processed markdown
 */
async function processLinks(app, markdown) {
  // const linkRegex = /\\\[\\\[([^\]]+)\\\]\\\]/g;
  const linkRegex = /\\\[\\\[([^\]]+?)(?:#([^\]]+))?\\\]\\\]/g;
  const matches = [...markdown.matchAll(linkRegex)];

  for (const match of matches) {
    const fullMatch = match[0]; // e.g., [[Note Name]] or [[tag/Note Name]]
    let linkContent = match[1]; // e.g., "Note Name" or "tag/Note Name"
    let section = match[2]; // e.g., "#Section" (optional)

    // Evaluate expressions within the link content and section
    linkContent = evaluateLinkContent(linkContent);
    if (section) section = evaluateLinkContent(section);

    // Extract tag and note name
    const { tag, noteName } = extractTagAndNoteName(linkContent);

    // Find or create the note
    const noteHandle = await findOrCreateNote(app, noteName, tag);

    // Construct the note URL, including the section if specified
    let noteURL = await noteHandle.url();
    if (section) {
      noteURL += `#${encodeURIComponent(section.replace(/\s/g, "_"))}`;
    }

    // Replace the link in the markdown
    const markdownLink = `[${noteName}${section ? "#" + section : ""}](${noteURL})`;
    markdown = markdown.replace(fullMatch, markdownLink);
  }

  return markdown;
}

// =============================
// Task Processing
// =============================

/**
 * Parses the template markdown to extract tasks, replace their UUIDs with new ones,
 * and returns the modified markdown and the list of new UUIDs.
 * @param {string} markdown - The markdown content of the template
 * @returns {{ modifiedMarkdown: string, newUUIDs: Array<string> }} - An object containing the modified markdown and new UUIDs
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
    let matches = [];
    let match;

    // Collect all matches
    while ((match = taskExpressionRegex.exec(description)) !== null) {
      matches.push(match);
    }

    // Process each match and update metadata and description
    for (const match of matches) {
      const [fullMatch, prefix, expression] = match;
      const evaluation = evaluateExpression(`{${expression}}`);
      if (!["date", "dateTime", "time"].includes(evaluation.type)) continue;

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

// =============================
// Template Handling
// =============================

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
 * Retrieves the default template from the app settings.
 * @param {Object} app - The app instance
 * @returns {Object} - The default template note
 */
function findDefaultTemplate(app) {
  return app.settings[Settings.DEFAULT_TEMPLATE];
}

/**
 * Finds the default tag template based on the provided tag.
 * @param {Object} app - The app instance
 * @param {string} tag - The tag to find the template for
 * @returns {Promise<Object>} - The matching template note
 */
async function findDefaultTagTemplate(app, tag) {
  const tagDefaults = app.settings[Settings.TAG_DEFAULTS]
    ? JSON.parse(app.settings[Settings.TAG_DEFAULTS])
    : {};
  if (tagDefaults[tag]) {
    const assignedTemplate = await app.findNote(tagDefaults[tag]);
    return assignedTemplate;
  } else {
    const templateTag = app.settings[Settings.TEMPLATE_TAG] || Settings.defaults.TEMPLATE_TAG;
    const templateNotes = await app.filterNotes({ tag: templateTag });
    const matchingTemplate = templateNotes.find((template) => template.tags.includes(tag));
    return matchingTemplate;
  }
}

/**
 * Loads the tag template mappings
 * @param {Object} app - The app instance
 * @returns {Object} - The tag to template mappings object
 */
function getTagTemplateMappings(app) {
  let mappings = {};
  if (app.settings[Settings.TAG_DEFAULTS]) {
    try {
      mappings = JSON.parse(app.settings[Settings.TAG_DEFAULTS]);
    } catch (e) {
      mappings = {};
    }
  }
  return mappings;
}

/**
 * Sets the default template UUID for a specific tag.
 * @param {Object} app - The app instance
 * @param {string} tag - The tag to set the default template for
 * @param {string} templateUUID - The UUID of the template to assign
 */
function setTemplateTagDefault(app, tag, templateUUID) {
  const tagDefaults = app.settings[Settings.TAG_DEFAULTS]
    ? JSON.parse(app.settings[Settings.TAG_DEFAULTS])
    : {};

  tagDefaults[tag] = templateUUID;
  app.setSetting(Settings.TAG_DEFAULTS, JSON.stringify(tagDefaults));
}

/**
 * Processes the insertion of a template into a note.
 * @param {Object} app - The app instance
 * @param {Object} thisNote - The note handle into which the template is being inserted
 * @param {string} templateUUID - The UUID of the template to insert
 * @param {Object} options - Additional options for insertion
 * @returns {Promise<null>} - Returns null after processing
 */
export async function processInsertTemplate(
  app,
  thisNote,
  templateUUID,
  { smartIndentation = true } = {}
) {
  // const thisNote = await app.notes.find(thisNoteUUID);
  let templateMarkdown = await app.getNoteContent({ uuid: templateUUID });

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

  // Step 5: Append Footnotes
  if (footnoteData.content.length > 0) {
    templateMarkdown += "\n\n" + footnoteData.content.join("\n");
  }

  if (smartIndentation) {
    // Step 6: Determine indentation at insertion
    // Because the Plugin API doesn't offer a direct way to read the line at current selection cursor
    // we need to use a workaround of inserting a unique tag and then reading the note body to discover the line context
    const selectionTaggedUUID = "<Templater-" + generateShortUUID() + ">";
    const replacedWithTag = await app.context.replaceSelection(selectionTaggedUUID);
    // If tag replacement failed, then fallback and return the template content as text
    if (!replacedWithTag) {
      return templateMarkdown;
    }

    const thisNoteCurrentContent = await thisNote.content();

    // Find the position of the selection in the current content
    const insertPosition = thisNoteCurrentContent.indexOf(selectionTaggedUUID);
    if (insertPosition === -1) {
      console.error("Template Insert tag not found.");
      return; // Handle error case
    }

    // Get the current line based on the insertion point
    const currentLine = getCurrentLine(thisNoteCurrentContent, insertPosition);

    // Step 7: Modify template to match insertion indentation if possible
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

    // Step 8: Insert Template into Note Body
    const finalContent = thisNoteCurrentContent.replace(selectionTaggedUUID, templateMarkdown);
    // Step 7: Insert the Processed Markdown into the Note and replace the Note Content
    // Since we have no more processing to do, go ahead and execute without awaiting
    thisNote.replaceContent(finalContent);
  } else {
    // If not smart inserting it then just insert it
    if (app.context && app.context.replaceSelection) {
      const tryToReplace = await app.context.replaceSelection(templateMarkdown);
    } else {
      app.insertNoteContent(thisNote, templateMarkdown);
    }
  }

  // Step 8: Process new tasks
  // Schedule task processing
  // - Since Amplenote has a delay before tasks are available we have to asynchronously wait for them to be available.
  processTasks(app, newTaskUUIDs);

  // No need to insert text
  return null;
}

const Settings = Object.freeze({
  TEMPLATE_TAG: "Dynamic Template Tag (default: system/template)",
  DEFAULT_TEMPLATE: "Global Default Template",
  TAG_DEFAULTS: "Tag Default Templates",
  defaults: {
    TEMPLATE_TAG: "system/template",
  },
});

// --------------------------------------------------------------------------------------
// API Reference: https://www.amplenote.com/help/developing_amplenote_plugins
// Tips on developing plugins: https://www.amplenote.com/help/guide_to_developing_amplenote_plugins
const plugin = {
  // --------------------------------------------------------------------------------------
  constants: {},

  appOption: {
    "Manage Defaults": {
      async run(app) {
        await app.openSidebarEmbed(0.75); // Adjust aspect ratio as needed
      },
    },
  },

  // renderEmbed action to return the HTML content of the embed
  renderEmbed(app, ...args) {
    return embedHtml;
  },

  // onEmbedCall action to handle calls from the embed
  async onEmbedCall(app, action, ...args) {
    if (action === "getGlobalTemplate") {
      const setting = app.settings[Settings.DEFAULT_TEMPLATE];
      let template = null;
      if (setting) {
        const noteUUID = setting;
        const noteHandle = await app.findNote({ uuid: noteUUID });
        const noteName = noteHandle ? noteHandle.name : "(Note not found)";
        template = { uuid: noteUUID, name: noteName };
      }
      return template;
    } else if (action === "setGlobalTemplate") {
      const result = await app.prompt("Select Global Default Template Note", {
        inputs: [{ label: "Template Note", type: "note" }],
      });
      if (result) {
        const noteHandle = result;
        if (noteHandle && noteHandle.uuid) {
          await app.setSetting(Settings.DEFAULT_TEMPLATE, noteHandle.uuid);
          return true;
        }
      }
      return false;
    } else if (action === "clearGlobalTemplate") {
      await app.setSetting(Settings.DEFAULT_TEMPLATE, null);
      return true;
    } else if (action === "getMappings") {
      const mappings = getTagTemplateMappings(app);
      // For each mapping, get the note name
      const detailedMappings = {};
      for (const tag in mappings) {
        const noteUUID = mappings[tag];
        const noteHandle = await app.findNote({ uuid: noteUUID });
        const noteName = noteHandle ? noteHandle.name : "(Note not found)";
        detailedMappings[tag] = { uuid: noteUUID, name: noteName };
      }
      return detailedMappings;
    } else if (action === "addMapping") {
      const result = await app.prompt("Select Tag and Template Note", {
        inputs: [
          { label: "Tag", type: "tags" },
          { label: "Template Note", type: "note" },
        ],
      });
      if (result) {
        const [tag, noteHandle] = result;
        if (tag && noteHandle && noteHandle.uuid) {
          // Get current mappings
          const mappings = getTagTemplateMappings(app);
          mappings[tag] = noteHandle.uuid;
          await app.setSetting(Settings.TAG_DEFAULTS, JSON.stringify(mappings));
          return true;
        }
      }
      return false;
    } else if (action === "editMapping") {
      const tag = args[0];
      // Get current mappings
      const mappings = getTagTemplateMappings(app);
      if (mappings[tag]) {
        debugger;
        const currentNote = await app.findNote({ uuid: mappings[tag] });
        const result = await app.prompt("Edit Template Note for Tag: " + tag, {
          inputs: [
            {
              label: "Template Note",
              type: "note",
              value: currentNote,
            },
          ],
        });
        if (result) {
          const noteHandle = result;
          if (noteHandle && noteHandle.uuid) {
            mappings[tag] = noteHandle.uuid;
            await app.setSetting(Settings.TAG_DEFAULTS, JSON.stringify(mappings));
            return true;
          }
        }
      }
      return false;
    } else if (action === "confirmDelete") {
      const tag = args[0];
      const result = await app.alert(
        `Are you sure you want to delete the default template for tag "${tag}"?`,
        {
          actions: [{ label: "Cancel", value: 1 }],
          primaryAction: {
            label: "Delete",
          },
        }
      );
      return result;
    } else if (action === "deleteMapping") {
      const tag = args[0];
      // Get current mappings
      const mappings = getTagTemplateMappings(app);
      if (mappings[tag]) {
        delete mappings[tag];
        await app.setSetting(Settings.TAG_DEFAULTS, JSON.stringify(mappings));
        return true;
      }
      return false;
    }
  },

  dailyJotOption: {
    "There's a default dynamic template for this tag": {
      async check(app, noteHandle) {
        const dailyJotTag = extractTagFromUrl(app.context.url);

        // We do this so that in theory it will suggest the global default when on daily jots without a tag selectede
        // But amplenote never calls the function
        const tagTemplate = dailyJotTag
          ? await findDefaultTagTemplate(app, dailyJotTag)
          : findDefaultTemplate(app);

        const suggestionGiven = expiryStorage.getItem("jotSuggestionGiven-" + dailyJotTag);

        if (tagTemplate && suggestionGiven != tagTemplate.uuid) {
          return "Insert " + tagTemplate.name;
        } else {
          return false;
        }
      },
      async run(app, noteHandle) {
        const dailyJotTag = extractTagFromUrl(app.context.url);
        const tagTemplate = dailyJotTag
          ? await findDefaultTagTemplate(app, dailyJotTag)
          : findDefaultTemplate(app);

        if (!tagTemplate) {
          console.warn("Daily Jot Insert: Template not found");
          return;
        }

        // Flag that the suggestion has been inserted for today, to avoid displaying it again
        // Expires at end of day since there's a new jot each day.
        expiryStorage.setItem(
          "jotSuggestionGiven-" + dailyJotTag,
          tagTemplate.uuid,
          startOfTomorrow()
        );

        return processInsertTemplate(app, noteHandle, tagTemplate.uuid, {
          smartIndentation: false,
        });
      },
    },
  },

  noteOption: {
    "Set as Default Template": {
      async check(app, noteUUID) {
        const currentNote = await app.notes.find(noteUUID);
        return currentNote.tags.includes(
          app.settings[Settings.TEMPLATE_TAG] || Settings.defaults.TEMPLATE_TAG
        );
      },
      run(app, noteUUID) {
        app.setSetting(Settings.DEFAULT_TEMPLATE, noteUUID);
      },
    },
    "Set as Tag Template": {
      async check(app, noteUUID) {
        const currentNote = await app.notes.find(noteUUID);
        return currentNote.tags.includes(
          app.settings[Settings.TEMPLATE_TAG] || Settings.defaults.TEMPLATE_TAG
        );
      },
      async run(app, noteUUID) {
        const selection = await app.prompt("Pick a template", {
          inputs: [{ type: "tags" }],
        });
        if (selection) setTemplateTagDefault(app, selection, noteUUID);
      },
    },
  },
  // --------------------------------------------------------------------------
  // https://www.amplenote.com/help/developing_amplenote_plugins#insertText
  insertText: {
    "Tag Default Template": {
      async check(app) {
        const thisNote = await app.notes.find(app.context.noteUUID);

        const tagDefaultTemplate = await findDefaultTagTemplate(app, thisNote.tags[0]);
        if (tagDefaultTemplate) {
          return "=" + tagDefaultTemplate.name;
        } else {
          return false;
        }
      },
      async run(app) {
        const thisNote = await app.notes.find(app.context.noteUUID);
        const tagDefaultTemplate = await findDefaultTagTemplate(app, thisNote.tags[0]);
        return processInsertTemplate(app, thisNote, tagDefaultTemplate.uuid);
      },
    },
    "Global Default Template": {
      async check(app) {
        const defaultId = findDefaultTemplate(app);
        if (defaultId) {
          const defaultTempl = await app.notes.find(defaultId);
          return "=" + defaultTempl.name;
        } else {
          return false;
        }
      },
      async run(app) {
        const thisNote = await app.notes.find(app.context.noteUUID);
        return processInsertTemplate(app, thisNote, findDefaultTemplate(app));
      },
    },

    "Pick Template": {
      async check(app) {
        return "=Pick Template";
      },

      async run(app) {
        const selection = await app.prompt("Pick a template", {
          inputs: [{ type: "note" }],
        });

        if (!selection || !selection.uuid) {
          // User cancelled the prompt
          return;
        }
        const thisNote = await app.notes.find(app.context.noteUUID);
        return processInsertTemplate(app, thisNote, selection.uuid, {
          smartIndentation: true,
        });
      },
    },
  },
};

export default plugin;
