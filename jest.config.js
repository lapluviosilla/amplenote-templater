import dotenv from "dotenv";

dotenv.config();

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.html$": "jest-html-loader", // Use the custom HTML transformer
  },
  moduleFileExtensions: ["js", "json", "node", "html"], // Include 'html' as a module extension
  // Optionally, ignore certain directories
  modulePathIgnorePatterns: ["<rootDir>/build/"],
  coveragePathIgnorePatterns: ["node_modules", "lib/test-helpers.js"],
};
