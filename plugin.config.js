/** The config file for your plugin
 * The version and sourceRepo parameters are optional, they will be output in your plugin
 * setting is an array of all your Settings, but you can remove the key if your plugin doesn't have any settings.
 */
export default {
  name: "Your Plugin Name",
  description: "A plugin to ... (add description here)",
  icon: "extension",
  version: "1.0.0",
  sourceRepo: "https://github.com/acct/repo", // This is optional and can be removed
  instructions: `![](https://linktoimage)
Put any instructions **here**`,
  setting: ["Setting #1 (default: false)", "Setting #2", "Setting #3"],
};
