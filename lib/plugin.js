import { proofImportIsPossible } from "./arbitrary-plugin-module";
import { format, compareAsc } from "date-fns";

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
        app.settings["Template Tag (default: system/template)"] ||
        "system/template";
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
      format(new Date(2014, 1, 11), "MM/dd/yyyy");
      return selection;
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
        await app.alert(
          "You clicked the Baby's first Note Option command in a COOL note!"
        );
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
