import { buildPlugin } from "../../shared/src/build/esbuild-config.mjs";

// Metadata Manager doesn't need additional external dependencies
await buildPlugin();