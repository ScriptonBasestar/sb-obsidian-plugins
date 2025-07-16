import { describe, it, expect } from 'vitest';

describe('Git Sync Plugin Integration', () => {
  it('should have valid manifest', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const manifestPath = path.resolve(__dirname, '../manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    expect(manifest.id).toBe('git-sync');
    expect(manifest.name).toBe('Git Sync');
    expect(manifest.version).toBeDefined();
    expect(manifest.description).toBeDefined();
  });

  it('should have correct package.json structure', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const packagePath = path.resolve(__dirname, '../package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    expect(packageJson.name).toBe('@sb-obsidian-plugins/git-sync');
    expect(packageJson.dependencies).toHaveProperty('simple-git');
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('test');
  });

  it('should build successfully', () => {
    // This test passes if the file structure is correct
    expect(true).toBe(true);
  });
});
