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
  const start = string.lastIndexOf("[[", matchIndex);
  // Find the next occurrence of ]] after the match
  const end = string.indexOf("]]", matchIndex);
  // If [[ is found before the match and ]] is found at or after the end of the match, it's inside a link
  if (start !== -1 && end !== -1 && start < matchIndex && end >= matchIndex + matchLength) {
    return true;
  }
  return false;
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
      var templateTag =
        app.settings["Template Tag (default: system/template)"] || "system/template";
      var templateNotes = await app.filterNotes({ tag: templateTag });
      var options = templateNotes.map((note) => ({
        label: note.name,
        value: note.uuid,
      }));
      var selection = await app.prompt("Pick a template", {
        inputs: [
          {
            type: "select",
            options: options,
          },
        ],
      });
      let templateMarkdown = await app.getNoteContent({ uuid: selection });

      // Initialize footnote counter and storage
      let footnoteCounter = 1;
      const footnotes = [];

      // Regular expression to find all instances of {expression}
      const regex = /\{([^}]+)\}/g;

      // Replace function to process each expression
      templateMarkdown = templateMarkdown.replace(regex, (match, expression, offset, string) => {
        // Check if the current match is inside a link
        const insideLink = isInsideLink(offset, match.length, string);
        const evaluation = evaluateExpression(match);

        if (evaluation.type === "math") {
          const result = evaluation.result;

          if (insideLink) {
            // Replace with result without footnote
            return result;
          } else {
            // Create a footnote
            const footnoteIndex = footnoteCounter++;
            // Add footnote content
            footnotes.push(`[^${footnoteIndex}]: [${result}]()
${expression}`);
            // Replace expression with result and footnote reference
            return `[${result}][^${footnoteIndex}]`;
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

          if (insideLink) {
            // Replace with formatted date without footnote
            return formattedDate;
          } else {
            // Create a footnote
            const footnoteIndex = footnoteCounter++;
            // Add footnote content
            footnotes.push(`[^${footnoteIndex}]: [${formattedDate}]()
${expression}`);
            // Replace expression with formatted date and footnote reference
            return `[${formattedDate}][^${footnoteIndex}]`;
          }
        } else {
          // If unhandled, leave the expression as is
          return match;
        }
      });

      // Append all footnotes at the end of the markdown
      if (footnotes.length > 0) {
        templateMarkdown += "\n\n" + footnotes.join("\n");
      }

      // Markdown has to be inserted through the replaceSelection call.
      const replacedSelection = await app.context.replaceSelection(templateMarkdown);
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
