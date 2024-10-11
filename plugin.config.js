/** The config file for your plugin
 * The version and sourceRepo parameters are optional, they will be output in your plugin if included
 * setting is an array of all your Settings, but you can leave it as an empty array if you don't have any settings.
 */
export default {
  name: "Dynamic Templater",
  description: "A plugin to make templates more powerful and dynamic",
  icon: "auto_awesome_mosaic",
  version: "1.0.0",
  sourceRepo: "https://github.com/lapluviosilla/amplenote-templater", // This is optional and can be removed
  instructions: `![](https://raw.githubusercontent.com/lapluviosilla/amplenote-templater/cbe0368cb4bfb2ee026ae371ad411a543f4b9f6d/media/plugin_overview.gif)
View the [README on Github](https://github.com/lapluviosilla/amplenote-templater/blob/main/README.md)
**Features**

- **Dynamic Template Insertion**: Build and insert templates dynamically at your current cursor position using the {= syntax, which mimics the native template support (@= or \[\[=).

- **Default Template Assignment**: Assign default templates to specific tags or for new notes. These templates will be suggested when inserting a template with {=

- **Create by Dynamic Template**: Use a link to create a new note with a dynamic template. \
Now when you have ["new note" links](https://www.amplenote.com/help/using_note_templates#Creating_a_gallery_of_templates_using_the__new_note__link) as described in the Amplenote docs, \
there will be a "Dynamic Templater" button that lets you create it while parsing the template as a dynamic template.

- **Date and Math Expression Expansion**: Automatically expand complex recognized date and math expressions within curly brackets, such as {tomorrow} or {1+8}

  - Supports Amplenote expressions listed [here](https://www.amplenote.com/help/calculations)

  - **Supports advanced expressions and compound expressions like**:

    - {2 days before the Last Weekday of Four Months from Now at 5pm}

    - {2 Weeks after Friday}

    - {Thursday of Last Week}

- **Task Start/Hide Dates**: Apply dynamic start or hide dates to tasks using expressions like {start:expression} or {hide:expression}. Like {start:next Monday}.

- **Custom Date Formatting**: Customize the format of dates using specifiers. For example, {"MM-dd-yyyy":tomorrow} expands to “09-27-2024”.

- **Dynamic Note Linking**: Convert eligible text enclosed in double square brackets into links.

  - Example: \[\[daily-notes/{Next Monday}\]\] creates or links to the daily note for next monday

  - Supports auto-creating notes: \[\[daily-jots/January 2nd, 2025\]\] creates a note with the specified tag if it doesn’t already exist.

- **Smart Indentation**: Insert templates while maintaining the current indentation level within bullet, numbered, or task lists.

  - Note: This works as long as the template itself contains a list. Since headings and other content aren't indent-able those won't maintain current indentation.

- **Jot Suggestions:** This functionality enhances the user experience in Jots mode.
`,
  setting: [
    "Dynamic Template Tag (default: system/template)",
    "Global Default Template",
    "Tag Default Templates",
  ],
};
