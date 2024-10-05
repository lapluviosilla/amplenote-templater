## **Amplenote Dynamic Templates Plugin Overview**

The Amplenote Dynamic Templates Plugin allows users to build and insert dynamic templates seamlessly within Amplenote. With this plugin, you can expand date expressions, customize date formats, create note links, and automate template insertion based on your current context. This tool enhances productivity and streamlines your note-taking process.

## **Features**

- **Dynamic Template Insertion**: Build and insert templates dynamically at your current cursor position using the {= syntax, which mimics the native template support (@= or \[\[=).

- **Date and Math Expression Expansion**: Automatically expand recognized date and math expressions within curly brackets, such as {tomorrow} or {1+8}

  - Supports Amplenote expressions listed [here](https://www.amplenote.com/help/calculations)

- **Task Start/Hide Dates**: Apply dynamic start or hide dates to tasks using expressions like {start:expression} or {hide:expression}. Like {start:next Monday}.

- **Custom Date Formatting**: Customize the format of dates using specifiers. For example, {"mm-dd-YYYY":tomorrow} expands to “09-27-2024”.

- **Dynamic Note Linking**: Convert eligible text enclosed in double square brackets into links.

  - Example: \[\[daily-notes/Next Monday\]\] creates or links to the daily note for next monday

  - Supports auto-creating notes: \[\[daily-jots/January 2nd, 2025\]\] creates a note with the specified tag if it doesn’t already exist.

- **Smart Indentation**: Insert templates while maintaining the current indentation level within bullet, numbered, or task lists.

  - Note: This works as long as the template itself contains a list. Since headings and other content isn't indent-able those won't maintain current indentation.

- **Default Template Assignment**: Assign default templates to specific tags or for new notes.

- **Jot Suggestions:** This functionality enhances the user experience in Jots mode.

### Known Issues

- Jots seem to be more flaky in Amplenote than notes. The plugin suggestion does not appear consistently unless you type in the jot. And Task expressions don't work for jots yet, because the Task UUIDs get changed without warning in Jot mode

## **Usage**

### **_Important Usage Note_**

- The plugin requires dynamic templates to be tagged with a particular pre-set tag. By default, this tag is `system/template`, but it is a user-configurable setting under the plugin settings labeled **Dynamic Template Tag**.

### **Inserting a Template**

1\. Type {= to insert default templates or {=Pick a template} to pull up a menu to select an available template

2\. The plugin will automatically insert the template’s contents at the current cursor position.

### **Task Start/Hide Dates**

- To set a start date for a task, include {start:expression} in the task description.

- To hide a task until a specific date, use {hide:expression}

### **Custom Date Formatting**

- Add a date format specifier to expressions for customized date formats.

- Example: {"mm-dd-YYYY":tomorrow} expands to “09-27-2024”.

### **Linking Notes**

- Use double square brackets to create or link to notes

- Notes will be created if they do not exist.

- Example: \[\[daily-jots/Next Sunday\]\] links to (and creates) a note tagged with “daily-jots” for next week.

### **Assigning Default Templates**

- For the default configuration:

  - A global default can be set by going to the note and using the **Templater: Set Default Template** menu.

  - At the tag level, you can make a template the default for a tag by tagging it with that tag. For example, a template could have both system/template and project tags to make it the default dynamic template for project notes. A configuration menu to set specific defaults will also be added.

- Assign templates to tags to receive a Jot Suggestion when visiting that tag in Jots mode.

### **Author**

**Published by**: lapluviosilla

**Date**: October 3rd, 2024

**Last Updated**: October 3rd, 2024

### **Feedback**

If you have any questions, issues, or feedback, please feel free to reach out!

## Testing

Run `NODE_OPTIONS=--experimental-vm-modules npm test` to run the tests.

If it complains about jsdom being absent, run `npm install -D jest-environment-jsdom` and try again.

### Run tests continuously as modifying the plugin

```bash
NODE_OPTIONS=--experimental-vm-modules npm run test -- --watch
```
