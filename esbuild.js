import dotenv from "dotenv";
import esbuild from "esbuild";
import fs from "fs";
// import { promises as fsp } from "fs";
import path from "path";
import { minify } from "html-minifier-terser";

dotenv.config();

// Paths to relevant files
const ROOT_DIR = path.resolve("/");
const BUILD_DIR = path.resolve("build");
const LIB_DIR = path.resolve("lib");
const TEMPLATES_DIR = path.resolve("templates");
const README_FILE = path.resolve("README.md");
const PLUGIN_FILE = path.resolve("PLUGIN.md");
const PACKAGE_FILE = path.resolve("package.json");

// Custom plugin to modify the output
const modifyBeforeMinifyPlugin = {
  name: "modify-before-minify",
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

// Custom plugin to minify HTML files using html-minifier-terser
const htmlLoaderPlugin = {
  name: "html-loader",
  setup(build) {
    build.onLoad({ filter: /\.html$/ }, async (args) => {
      let source = await fs.promises.readFile(args.path, "utf8");

      const isMinify = build.initialOptions.minify;

      // Comment minification to debug
      //if (isMinify) {
      // Minify the HTML content using html-minifier-terser
      source = await minify(source, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        minifyCSS: true,
        minifyJS: true,
        // Add other minification options as needed
      });
      //}

      return {
        contents: `export default ${JSON.stringify(source)};`,
        loader: "js",
      };
    });
  },
};

async function generateMarkdownFile(compiledCode, markdownFile) {
  try {
    // Read version from package.json
    const packageJson = fs.readFileSync(PACKAGE_FILE, "utf-8");
    const { version } = JSON.parse(packageJson);

    // Read the contents of README.md and PLUGIN.md
    const readmeContent = fs.readFileSync(README_FILE, "utf-8");
    const pluginContent = fs.readFileSync(PLUGIN_FILE, "utf-8");

    // Prepare the compiled code block
    const compiledCodeBlock = "```js\n" + compiledCode + "\n```";

    // Concatenate all parts
    const outputContent = `${readmeContent}\n\n${pluginContent}\n\n
# Templater (${version})

### Code Base:
${compiledCodeBlock}`;

    // Write to the markdown file
    fs.writeFileSync(markdownFile, outputContent);

    console.log(`Successfully generated ${markdownFile}`);
  } catch (err) {
    console.error(`Error generating ${markdownFile}:`, err);
    process.exit(1);
  }
}

async function buildAndGenerateMarkdown() {
  const outfile = "build/compiled.js";
  const markdownFile = "build/plugin.md";
  const minifiedMarkdownFile = "build/plugin.min.md";

  // Build the code without minification
  await esbuild.build({
    entryPoints: ["lib/plugin.js"],
    bundle: true,
    format: "iife",
    outfile: outfile,
    platform: "node",
    plugins: [htmlLoaderPlugin, modifyBeforeMinifyPlugin],
    loader: {
      ".html": "js",
    },
    minify: false,
    write: true,
  });

  console.log(`Build completed for ${outfile}`);

  // Read the unminified code
  const compiledCode = fs.readFileSync(outfile, "utf-8");

  // Generate the unminified markdown file
  await generateMarkdownFile(compiledCode, markdownFile);

  // Minify the code using esbuild.transform
  const minifiedResult = await esbuild.transform(compiledCode, {
    minify: true,
    loader: "js",
  });

  const finalCode = minifiedResult.code.replace(/;[\s]*$/, "");

  // Write the minified code to a file
  fs.writeFileSync("build/compiled.min.js", finalCode);

  console.log("Minified code generated at build/compiled.min.js");

  // Generate the minified markdown file
  await generateMarkdownFile(finalCode, minifiedMarkdownFile);
}

async function main() {
  await buildAndGenerateMarkdown();
}

main();
