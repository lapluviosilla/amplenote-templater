/** The config file for your plugin
 * The version and sourceRepo parameters are optional, they will be output in your plugin if included
 * setting is an array of all your Settings, but you can leave it as an empty array if you don't have any settings.
 */
export default {
  name: "Dynamic Templater",
  devName: "Dynamic Templater Dev",
  description: "A plugin to make templates more powerful and dynamic",
  icon: "auto_awesome_mosaic",
  version: "1.0.0",
  sourceRepo: "https://github.com/lapluviosilla/amplenote-templater", // This is optional and can be removed
  instructions: `![](https://raw.githubusercontent.com/lapluviosilla/amplenote-templater/cbe0368cb4bfb2ee026ae371ad411a543f4b9f6d/media/plugin_overview.gif)
<br/>**Watch the** [**Overview Video**](https://youtu.be/WSwXS2kQAmA)<br/>
View the [README on Github](https://github.com/lapluviosilla/amplenote-templater/blob/main/README.md)
**Features**

- **Dynamic Template Insertion**: Build and insert templates dynamically at your current cursor position using the {= syntax, which mimics the native template support (@= or \[\[=).

- **Default Template Assignment**: Assign default templates to specific tags or for new notes. These templates will be suggested when inserting a template with {=

- **Dynamic New Note Link/Button**: Use a link/button to auto-create a new note with a dynamic template. This also supports expressions in the note name and specifying a template section to use.

- **Date and Math Expression Expansion**: Automatically expand complex recognized date and math expressions within curly brackets, such as {tomorrow} or {1+8}

  - Supports Amplenote expressions listed [here](https://www.amplenote.com/help/calculations)

  - **Supports advanced expressions and compound expressions like**:

    - {2 days before the Last Weekday of Four Months from Now at 5pm}

    - {2 Weeks after Friday}

    - {Thursday of Last Week}

  - Full list of supported expressions listed here: [Evaluator Supported Date and Math Expressions](https://github.com/lapluviosilla/amplenote-templater/blob/main/EVALUATOR_SUPPORT.md)

- **Task Start/Hide Dates**: Apply dynamic start or hide dates to tasks using expressions like {start:expression} or {hide:expression}. Like {start:next Monday}.

- **Custom Date Formatting**: Customize the format of dates using specifiers. For example, {"MM-dd-yyyy":tomorrow} expands to “09-27-2024”.

- **Dynamic Note Linking**: Convert eligible text enclosed in double square brackets like \`[[daily-notes/{Next Monday}]]\` into links.

  - **Auto-Creating Notes**: Notes are created if they don't already exist. This can be suppressed with an optional prefix flag (\`?\`).
  - **Display Name with Pipe Character** (\*\***\|**\*\*\*): Use the pipe character to set an alias or display name for the link.

- **Nested Templates**: You can link to and nest templates within each other with [[= ]] or {= }. You can also insert a subsection of a template.

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
