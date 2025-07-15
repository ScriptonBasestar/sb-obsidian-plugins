# Shared Build Configuration

This project uses a unified esbuild configuration for all Obsidian plugins, ensuring consistent build output and reducing maintenance overhead.

## Overview

The shared build configuration is located in `shared/src/build/` and provides:

- **Consistent build settings** across all plugins
- **Automatic external dependency management**
- **Production optimizations** (minification, tree-shaking)
- **Development watch mode** with source maps
- **Build utilities** for common tasks

## Basic Usage

Each plugin's `esbuild.config.mjs`:

```javascript
import { buildPlugin } from '@sb-obsidian-plugins/shared/build';

// Basic usage - no additional configuration needed
await buildPlugin();
```

## Advanced Configuration

### Adding External Dependencies

```javascript
import { buildPlugin } from '@sb-obsidian-plugins/shared/build';

await buildPlugin({
  external: ['simple-git', 'child_process'],
  define: {
    MY_CONSTANT: '"value"',
  },
});
```

### Custom Entry Points

```javascript
await buildPlugin({
  entryPoint: 'src/index.ts',
  outfile: 'dist/plugin.js',
});
```

### Adding Custom Plugins

```javascript
import { buildPlugin } from '@sb-obsidian-plugins/shared/build';

const myPlugin = {
  name: 'my-plugin',
  setup(build) {
    build.onEnd(() => {
      console.log('Build completed!');
    });
  },
};

await buildPlugin({
  plugins: [myPlugin],
});
```

## Build Commands

### Development

```bash
# Watch mode with source maps
pnpm run dev
```

### Production

```bash
# Minified production build
pnpm run build
```

## Built-in Features

### 1. External Dependencies

The following are automatically externalized:

- Obsidian API (`obsidian`)
- Electron (`electron`)
- CodeMirror modules (`@codemirror/*`)
- Lezer parser (`@lezer/*`)
- Node.js built-in modules

### 2. Build Optimizations

Production builds include:

- Minification (code, whitespace, syntax)
- Tree shaking
- No source maps
- Build size reporting

### 3. Development Features

- Inline source maps
- File watching
- Fast rebuilds
- Console logging

### 4. Build Utilities

#### Copy Manifest and Styles

Automatically copies `manifest.json` and `styles.css` to the output directory.

#### Clean Plugin

Removes the output file before each build to ensure clean builds.

#### Build Info Plugin

Reports the final bundle size after production builds.

## Configuration Options

| Option       | Type     | Default         | Description                 |
| ------------ | -------- | --------------- | --------------------------- |
| `entryPoint` | string   | `"src/main.ts"` | Entry file for the build    |
| `outfile`    | string   | `"main.js"`     | Output file name            |
| `external`   | string[] | `[]`            | Additional external modules |
| `define`     | object   | `{}`            | Define global constants     |
| `prod`       | boolean  | Auto-detected   | Force production mode       |
| `plugins`    | object[] | `[]`            | Additional esbuild plugins  |

## Environment Variables

- `NODE_ENV`: Set to `"production"` or `"development"`
- Build mode: Pass `production` as argument for production builds

## Troubleshooting

### Module Resolution Issues

If you get module resolution errors:

1. Ensure the shared package is built: `pnpm run build:shared`
2. Check that dependencies are properly installed
3. Verify external dependencies are listed in the config

### Build Size Too Large

1. Check if dependencies should be external
2. Enable tree shaking (enabled by default)
3. Verify imports are using ES6 syntax

### Source Maps Not Working

- Source maps are only generated in development mode
- Use `pnpm run dev` for development with source maps

## Migration Guide

To migrate from individual esbuild configs:

1. Install shared package dependency (already done in monorepo)
2. Replace `esbuild.config.mjs` content with:
   ```javascript
   import { buildPlugin } from '@sb-obsidian-plugins/shared/build';
   await buildPlugin();
   ```
3. Add any plugin-specific externals or configuration
4. Test both dev and production builds

## Future Enhancements

Planned improvements:

- Hot module replacement (HMR) support
- Bundle analysis tools
- Automatic dependency detection
- CSS modules support
- Multiple entry points support
