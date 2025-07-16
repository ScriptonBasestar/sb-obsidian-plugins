import { buildPlugin } from "@sb-obsidian-plugins/shared/build";

// Publisher specific external dependencies
const publisherExternals = [
  "fs-extra",
  "gray-matter",
];

await buildPlugin({
  external: publisherExternals,
});