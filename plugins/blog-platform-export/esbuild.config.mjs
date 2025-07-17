import esbuild from 'esbuild';
import builtins from 'builtin-modules';

const isDev = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: isDev ? 'inline' : false,
  treeShaking: true,
  outfile: 'main.js',
  minify: !isDev,
  plugins: []
};

if (isDev) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('👀 Watching for changes...');
} else {
  await esbuild.build(config);
  console.log('✅ Build complete');
}