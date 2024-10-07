import dotenv from "dotenv";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";

dotenv.config();

// Custom plugin to modify the output
const customPlugin = {
  name: "custom-output-plugin",
  setup(build) {
    build.onEnd(async () => {
      const outfilePath = path.resolve("build/compiled.js");

      // Read the content of the outfile
      let modifiedOutput = fs.readFileSync(outfilePath, "utf-8");

      // Modify the output content as needed
      modifiedOutput = modifiedOutput.replace(
        /var plugin_default = plugin;\s*\}\)\(\);/,
        "var plugin_default = plugin;\nreturn plugin;\n})()"
      );

      // Write the modified output back to the file system
      fs.writeFileSync(outfilePath, modifiedOutput);
    });
  },
};

const result = await esbuild.build({
  entryPoints: [`lib/plugin.js`],
  bundle: true,
  format: "iife",
  outfile: "build/compiled.js",
  platform: "node",
  plugins: [customPlugin],
  loader: {
    ".html": "text", // Configure .html files to be loaded as text
  },
  write: true,
});
console.log("Result was", result);
