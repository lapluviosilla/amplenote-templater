# **Amplenote Dynamic Templater Plugin Overview**

The Amplenote Dynamic Templater Plugin allows users to build and insert dynamic templates seamlessly within Amplenote. With this plugin, you can expand date expressions, customize date formats, create note links, and automate template insertion based on your current context. This tool enhances productivity and streamlines your note-taking process.
<br/>**Watch the** [**Overview Video**](https://youtu.be/WSwXS2kQAmA)<br/>
![](https://raw.githubusercontent.com/lapluviosilla/amplenote-templater/cbe0368cb4bfb2ee026ae371ad411a543f4b9f6d/media/plugin_overview.gif)

<br/>☕ If the plugin is helpful to you, you can [buy me a coffee](https://ko-fi.com/lapluviosilla)!

## **Features**

- **Dynamic Template Insertion**: Build and insert templates dynamically at your current cursor position using the {= syntax, which mimics the native template support (@= or \[\[=).

- **Default Template Assignment**: Assign default templates to specific tags or for new notes. These templates will be suggested when inserting a template with {=

- **Dynamic New Note Link/Button**: Use a link/button to auto-create a new note with a dynamic template. This also supports expressions in the note name and specifying a template section to use.

![newdynamicnotebutton_screen.png|500](https://raw.githubusercontent.com/lapluviosilla/amplenote-templater/72b91e0af5d410c7a3e5d1d6ac53e04b4f330f8b/media/newdynamicnotebutton_screen.png)

- **Date and Math Expression Expansion**: Automatically expand complex recognized date and math expressions within curly brackets, such as {tomorrow} or {1+8}

  - Supports Amplenote expressions listed [here](https://www.amplenote.com/help/calculations)

  - **Supports advanced expressions and compound expressions like**:

    - {2 days before the Last Weekday of Four Months from Now at 5pm}

    - {2 Weeks after Friday}

    - {Thursday of Last Week}

  - Full list of supported expressions listed here: [Evaluator Supported Date and Math Expressions](https://github.com/lapluviosilla/amplenote-templater/blob/main/EVALUATOR_SUPPORT.md)

- **Task Start/Hide Dates**: Apply dynamic start or hide dates to tasks using expressions like {start:expression} or {hide:expression}. Like {start:next Monday}.

- **Custom Date Formatting**: Customize the format of dates using specifiers. For example, {"MM-dd-yyyy":tomorrow} expands to “09-27-2024”.

- **Dynamic Note Linking**: Convert eligible text enclosed in double square brackets like `[[daily-notes/{Next Monday}]]` into links.

  - **Auto-Creating Notes**: Notes are created if they don't already exist. This can be suppressed with an optional prefix flag (`?`) or silent flag (`_`).
  - **Display Name with Pipe Character** (\*\***`|`**\*\*\*): Use the pipe character to set an alias or display name for the link.

- **Nested Templates**: You can link to and nest templates within each other with `[[= ]]` or `{= }`. You can also insert a subsection of a template.

- **Smart Indentation**: Insert templates while maintaining the current indentation level within bullet, numbered, or task lists.

  - Note: This works as long as the template itself contains a list. Since headings and other content aren't indent-able those won't maintain current indentation.

- **Jot Suggestions:** This functionality enhances the user experience in Jots mode.

### Known Issues

- Jots seem to be more flaky in Amplenote than notes. The plugin suggestion does not appear consistently unless you type in the jot. And we have to use a workaround to insert the content until they fix the Plugin API, but it does work.

- The plugin has more bloat than I want. It currently rebundles the date and js parsing libraries because Amplenote doesn't expose them. I'm working to see if we can change this and significantly reduce the plugin size.

## **Usage**

### **_Important Usage Note_**

- Certain convenience features of the plugin require dynamic templates to be tagged with a particular pre-set tag. By default, this tag is `system/template`, but it is a user-configurable setting under the plugin settings labeled _Dynamic Template Tag_. This is optional, most of the plugin functionality works without it.

### **Inserting a Template**

1. Type {= to insert default templates or {=Pick a template} to pull up a menu to select an available template

2. The plugin will automatically insert the template’s contents at the current cursor position.

### **Creating a Dynamic New Note Link**

Two ways to create a dynamic new note link:

1. Use the {Templater: New Note Link} expression to bring up a form to generate the link.

2. Now when you have ["new note" links](https://www.amplenote.com/help/using_note_templates#Creating_a_gallery_of_templates_using_the__new_note__link) as described in the Amplenote docs, there will be a "Dynamic Templater: Create" button that lets you create it while parsing the source note as a dynamic template.

### **Task Start/Hide Dates**

- To set a start date for a task, include {start:expression} in the task description.

- To hide a task until a specific date, use {hide:expression}

### **Custom Date Formatting**

- Add a date format specifier to expressions for customized date formats. Here are all the date formats supported: [date-fns Formats](https://date-fns.org/docs/format)

- Example: {"MM-dd-yyyy":tomorrow} expands to “09-27-2024”.

### **Linking Notes**

- Use double square brackets (`[[ ]]`) to create or link to notes. You can have date/math expressions in the link. You can also link to specific sections within a note by adding `#` followed by the section name.
- By default, notes will be created if they do not exist, unless you add an optional flag (`?`) at the beginning of the note. The optional flag allows you to link to the note only if it exists, avoiding the creation of empty notes.
- You can also use a silent flag (`_`) to surpress the link output completely if the note doesn't exist. It's a optional flag that doesn't output anything.
- You can also use an alias to display a different name for the link by using the pipe character (`|`) at the end.

**Examples**:

- `[[daily-jots/{Next Sunday}]]` links to (and creates, if necessary) a note tagged with "daily-jots" for next sunday.

- `[[?daily-jots/{Monday of last week}]]` links to a note tagged with "daily-jots" for "Monday of last week" if it exists; otherwise, it will remain as plain text (e.g., `[[daily-jots/September 9th, 2024]]`). This allows you to create/link the note at a later time or remove it entirely using Amplenote's native interface.

- `[[Dynamic Note Name|Custom Display]]` links to "Dynamic Note Name" but displays "Custom Display" as the clickable text.

- `[[{Tomorrow}#Section|Custom Display]]` links to the "Section" of "Tomorrow" while showing "Custom Display" as the clickable text.

### **Nested Templates**

- Use template links (`[[= ]]` or `{= }`, they are interchangeable) within your dynamic templates to nest other templates.

- You can specify a subsection of a template to use for insertion with `#` or `#>`. The `#` includes the section header, and the `#>` only uses the section inner content.

**Examples**:

- `{=project/Projects}` inserts the Projects note as a template

- `[[=project/Project Dashboard#Active Projects]]` inserts the Active Projects section of the Projects note

- `[[=daily-templates/{"EEEE":Today}#>Tasks]]` inserts the content under the tasks section of the template for the day of the week

### **Assigning Default Templates**

- For the default configuration:

  - Use the Tag Default Manager with the "Templater: Manage Defaults" menu under Cmd/Ctrl-O. _Note: This opens a sidebar menu, which only works on desktop not mobile._

  - A global or tag default can also be set by going to the note and using the **Templater: Set Default Template** menu. (Menu won't appear if template isn't tagged with dynamic template tag)

  - At the tag level, you can make a template the default for a tag by tagging it with that tag and the _Dynamic Template Tag_. For example, a template could have both `system/template` and `project` tags to make it the default dynamic template for project notes.

- Assign templates to tags to receive a Jot Suggestion when visiting that tag in Jots mode.

## **Author**

**Published by**: lapluviosilla

**Date**: October 3rd, 2024

**Last Updated**: October 22nd, 2024

### **Feedback**

If you have any questions, issues, or feedback, please feel free to reach out!

## Changelog

- October 22nd, 2024 -- Added nested templates and template section extraction features

- October 19th, 2024 -- Fixed a couple bugs

- October 14th, 2024 -- Added optional flag and display name feature for dynamic note linking

- October 11th, 2024 -- Added note create link dynamic template support

- October 10th, 2024 -- Added compound date expressions
