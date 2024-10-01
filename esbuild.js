import dotenv from "dotenv";
import esbuild from "esbuild";

dotenv.config();

const result = await esbuild.build({
  entryPoints: [`lib/plugin.js`],
  bundle: true,
  format: "iife",
  outfile: "build/compiled.js",
  platform: "node",
  write: true,
});
console.log("Result was", result);
