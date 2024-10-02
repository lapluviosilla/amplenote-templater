// plugin.js

import { evaluateExpression } from "./evaluator";
import { format } from "date-fns"; // Importing date-fns for date formatting

/**
 * Helper function to determine if a given index is inside a link ([[...]])
 * @param {number} matchIndex - The index where the match starts
 * @param {number} matchLength - The length of the matched string
 * @param {string} string - The entire string being processed
 * @returns {boolean} - True if inside a link, else False
 */
function isInsideLink(matchIndex, matchLength, string) {
  // Find the last occurrence of [[ before the match
  const start = string.lastIndexOf(`\\[\\[`, matchIndex);
  // Find the next occurrence of ]] after the match
  const end = string.indexOf(`\\]\\]`, matchIndex);
  // If [[ is found before the match and ]] is found at or after the end of the match, it's inside a link
  if (start !== -1 && end !== -1 && start < matchIndex && end >= matchIndex + matchLength) {
    return true;
  }
  return false;
}

/**
 * Helper function to determine if a given index is inside a task (- [ ] ...)
 * @param {number} matchIndex - The index where the match starts
 * @param {string} string - The entire string being processed
 * @returns {boolean} - True if inside a task, else False
 */
function isInsideTask(matchIndex, string) {
  // Find the start of the line
  const lineStart = string.lastIndexOf("\n", matchIndex) + 1;
  // Check if the line starts with a task indicator
  const taskIndicator = "- [ ]";
  if (string.startsWith(taskIndicator, lineStart)) {
    return true;
  }
  return false;
}

// Function to process each link asynchronously
async function processLinks(app, markdown) {
  // Regex to find all [[...]] links
  const linkRegex = /\\\[\\\[([^\]]+)\\\]\\\]/g;
  const matches = [...markdown.matchAll(linkRegex)];
  for (const match of matches) {
    const fullMatch = match[0]; // e.g., [[Note Name]] or [[tag/Note Name]]
    let linkContent = match[1]; // e.g., "Note Name" or "tag/Note Name"

    // Check if linkContent contains expressions and evaluate them
    const innerExpressionRegex = /\{([^}]+)\}/g;
    let evaluatedContent = linkContent.replace(innerExpressionRegex, (m, expr) => {
      const evalResult = evaluateExpression(m);
      if (evalResult.type === "date") {
        return format(evalResult.result, "MMMM do, yyyy");
      } else {
        return expr; // For non-date expressions, return as is or handle accordingly
      }
    });

    // Determine if there's a tag
    let tag = null;
    let noteName = evaluatedContent;
    const tagSeparatorIndex = evaluatedContent.lastIndexOf("/");
    if (tagSeparatorIndex !== -1) {
      tag = evaluatedContent.substring(0, tagSeparatorIndex);
      noteName = evaluatedContent.substring(tagSeparatorIndex + 1).trim();
    }

    // Find if the note exists
    let noteHandle = null;
    if (tag) {
      noteHandle = await app.notes.find({ name: noteName, tags: [tag] });
    } else {
      noteHandle = await app.notes.find({ name: noteName });
    }

    // If note does not exist, create it
    if (!noteHandle) {
      noteHandle = await app.notes.create(noteName, tag ? [tag] : []);
    }

    // Get the note URL
    // const noteURL = await app.getNoteURL(noteHandle);
    const noteURL = await noteHandle.url();

    // Replace [[...]] with markdown link [Note Name](note URL)
    const markdownLink = `[${noteName}](${noteURL})`;
    markdown = markdown.replace(fullMatch, markdownLink);
  }
  return markdown;
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
        inputs: [
          {
            type: "select",
            options: options,
          },
        ],
      });
      if (!selection) {
        // User cancelled the prompt
        return;
      }
      const selectedUUID = selection;
      let templateMarkdown = await app.getNoteContent({ uuid: selectedUUID });

      // Initialize footnote counter and storage
      let footnoteCounter = 1;
      const footnotes = [];

      // Step 2: Replace Expressions with Evaluated Results and Footnotes
      // Updated regex to capture optional prefix (start/hide) and the expression
      const expressionRegex = /\{(?:(start|hide):)?([^}]+)\}/g;

      templateMarkdown = templateMarkdown.replace(
        expressionRegex,
        (match, prefix, expression, offset, string) => {
          // Check if the current match is inside a link or task
          const insideLink = isInsideLink(offset, match.length, string);
          const insideTask = isInsideTask(offset, string);
          const insideContext = insideLink || insideTask;

          // Handle only non-task and non-link expressions for footnotes
          if (prefix && insideTask) {
            // Already handled in taskRegex replacement
            return match; // Keep as is
          }

          // Evaluate the expression
          const evaluation = evaluateExpression(match);

          if (evaluation.type === "math") {
            const result = evaluation.result;

            if (insideContext) {
              // Replace with result without footnote
              return result;
            } else {
              // Create a footnote
              const footnoteIndex = footnoteCounter++;
              // Add footnote content
              footnotes.push(`[^templater${footnoteIndex}]: [${result}]()
${expression}`);
              // Replace expression with result and footnote reference
              return `[${result}][^templater${footnoteIndex}]`;
            }
          } else if (evaluation.type === "date") {
            const date = evaluation.result;
            let formattedDate;

            // Determine if time is significant (not 00:00:00)
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            const milliseconds = date.getMilliseconds();

            if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0) {
              // Date without specific time
              formattedDate = format(date, "MMMM do, yyyy");
            } else {
              // Date with specific time
              formattedDate = format(date, "MMMM do, yyyy 'at' HH:mm:ss");
            }

            if (insideContext) {
              // Replace with formatted date without footnote
              return formattedDate;
            } else {
              // Create a footnote
              const footnoteIndex = footnoteCounter++;
              // Add footnote content
              footnotes.push(`[^templater${footnoteIndex}]: [${formattedDate}]()
${expression}`);
              // Replace expression with formatted date and footnote reference
              return `[${formattedDate}][^templater${footnoteIndex}]`;
            }
          } else {
            // If unhandled, leave the expression as is
            return match;
          }
        }
      );

      // Step 4: Process Note Links ([[...]])
      templateMarkdown = await processLinks(app, templateMarkdown);

      // Step 5: Append Footnotes at the End of the Markdown
      if (footnotes.length > 0) {
        templateMarkdown += "\n\n" + footnotes.join("\n");
      }

      // Step 6: Insert the Processed Markdown into the Note
      const replacedSelection = await app.context.replaceSelection(templateMarkdown);

      // Step 7: Process new tasks
      const currentNoteUUID = app.context.noteUUID;
      const currentNote = await app.notes.find(app.context.noteUUID);
      const tasks = await currentNote.tasks();
      // const tasks = await app.getNoteTasks({ uuid: currentNoteUUID });
      for (const task of tasks) {
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
        await app.updateTask(task.uuid, { content: description, ...commentObj });
      }

      if (replacedSelection) {
        return null;
      } else {
        return templateMarkdown; // Fall back in cases where the markdown content wouldn't be valid at the selection position
      }
    },
  },

  // --------------------------------------------------------------------------
  // https://www.amplenote.com/help/developing_amplenote_plugins#noteOption
  noteOption: {
    "Baby's first Note Option command": {
      check: async function (app, noteUUID) {
        const noteContent = await app.getNoteContent({ uuid: noteUUID });

        // This note option is ONLY shown when the note contains the word "cool"
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
