import { buildPlugin, createEsbuildConfig } from "@sb-obsidian-plugins/shared/build";
import esbuild from "esbuild";

// Example of advanced configuration with custom handling

// Git Sync specific configuration
const gitSyncConfig = {
  external: [
    "simple-git",
    "child_process",
    "fs",
    "path",
  ],
  define: {
    GIT_SYNC_VERSION: JSON.stringify(process.env.npm_package_version || "0.0.0"),
    BUILD_TIME: JSON.stringify(new Date().toISOString()),
  },
};

// Custom plugin for Git Sync specific needs
const gitSyncPlugin = {
  name: "git-sync-custom",
  setup(build) {
    // Handle .gitignore file imports
    build.onResolve({ filter: /\.gitignore$/ }, args => {
      return { path: args.path, namespace: "gitignore" };
    });
    
    build.onLoad({ filter: /.*/, namespace: "gitignore" }, async (args) => {
      const text = await fs.promises.readFile(args.path, "utf8");
      return {
        contents: `export default ${JSON.stringify(text)}`,
        loader: "js",
      };
    });
  },
};

// Advanced usage with custom build logic
if (process.argv.includes("--analyze")) {
  // Bundle analysis mode
  const config = createEsbuildConfig({
    ...gitSyncConfig,
    metafile: true,
    plugins: [gitSyncPlugin],
  });
  
  const result = await esbuild.build(config);
  
  // Generate bundle analysis
  const analysis = await esbuild.analyzeMetafile(result.metafile);
  console.log(analysis);
} else {
  // Normal build
  await buildPlugin({
    ...gitSyncConfig,
    plugins: [gitSyncPlugin],
    onRebuild: async (result) => {
      // Custom post-build actions
      console.log("Git Sync rebuilt successfully");
      
      // You could trigger Obsidian reload here if needed
      // or update version info, etc.
    },
  });
}