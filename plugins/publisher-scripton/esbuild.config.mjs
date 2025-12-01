import { buildPlugin } from "../../shared/src/build/esbuild-config.mjs";

// Publisher specific external dependencies
const publisherExternals = [
  "fs-extra",
  "gray-matter",
];

await buildPlugin({
  external: publisherExternals,
});