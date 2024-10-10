/** The config file for your plugin
 * The version and sourceRepo parameters are optional, they will be output in your plugin
 * setting is an array of all your Settings, but you can remove the key if your plugin doesn't have any settings.
 */
export default {
  name: "Dynamic Templater",
  description: "A plugin to make templates more powerful and dynamic",
  icon: "newspaper",
  version: "1.0.0",
  sourceRepo: "https://github.com/lapluviosilla/amplenote-templater", // This is optional and can be removed
  instructions: `![](https://linktoimage)
Put any instructions **here**`,
  setting: [
    "Dynamic Template Tag (default: system/template)",
    "Global Default Template",
    "Tag Default Templates",
  ],
};
