// transformers/htmlTransformer.js
import htmlLoader from "html-loader";

/**
 * ESM Transformer for HTML files.
 * Reads the HTML file content and exports it as a string.
 */
export default {
  /**
   * Transforms HTML content into a JavaScript module.
   *
   * @param {string} src - The source code of the HTML file.
   * @param {string} filename - The path to the HTML file.
   * @returns {{ code: string }} - An object containing the transformed code.
   */
  process(src, filename, config, options) {
    const content = fs.readFileSync(filename, "utf-8");
    return {
      code: `module.exports = ${htmlLoader(content)};`,
    };
  },
};
