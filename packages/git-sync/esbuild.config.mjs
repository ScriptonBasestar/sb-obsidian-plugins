import { buildPlugin } from "@sb-obsidian-plugins/shared/build";

// Git Sync specific external dependencies
const gitSyncExternals = [
  "simple-git",
  "child_process",
];

await buildPlugin({
  external: gitSyncExternals,
  define: {
    // Add any Git Sync specific constants here
  }
});