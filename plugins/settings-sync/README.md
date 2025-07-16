# Obsidian Settings Sync

A powerful plugin for Obsidian that enables synchronization and sharing of settings across devices and teams using Git.

## Features

### 🔄 Settings Synchronization
- Sync all Obsidian settings through Git repositories
- Automatic conflict resolution
- Selective sync with file exclusion
- Sensitive data filtering (API keys, tokens, etc.)

### 👥 Profile Management
- Create multiple settings profiles
- Switch between different configurations
- Profile inheritance for shared base settings
- Import/export profiles

### 🚀 Quick Setup
- Step-by-step initialization wizard
- Automatic plugin installation
- Theme and CSS snippet deployment
- Hotkey configuration merging

### 🛡️ Backup & Restore
- Automatic backup before changes
- Manual backup creation
- Restore from any backup point
- Backup cleanup and management

### 📊 Advanced Features
- Settings comparison viewer
- Git history browser
- Real-time sync status
- Auto-sync with configurable intervals

## Installation

1. Install the plugin from Obsidian Community Plugins
2. Enable the plugin in Settings → Community Plugins
3. Configure your Git repository in the plugin settings

## Quick Start

### Initial Setup

1. Open Settings → Settings Sync
2. Enter your Git repository URL
3. Click "Initialize" to run the setup wizard
4. Select which settings to sync
5. Start syncing!

### Creating a Profile

1. Click "Create Profile" in settings
2. Name your profile (e.g., "Work", "Personal")
3. The current settings will be saved to this profile
4. Switch between profiles anytime

### Manual Sync

- Click the sync icon in the ribbon, or
- Use the command palette: "Settings Sync: Sync settings"
- Enable auto-sync for automatic synchronization

## Configuration

### Excluded Files
By default, these files are excluded from sync:
- `workspace.json` - Window layout
- `workspace-mobile.json` - Mobile layout
- `graph.json` - Graph view settings
- `canvas.json` - Canvas settings

### Sensitive Keys
The plugin automatically filters out values containing:
- `apiKey`
- `token`
- `password`
- `secret`

Add custom patterns in the settings.

## Commands

- **Sync settings** - Synchronize with remote repository
- **Initialize vault** - Set up a new vault with shared settings
- **Create profile** - Save current settings as a profile
- **Switch profile** - Change to a different settings profile
- **View history** - Browse settings change history
- **Compare settings** - Compare profiles or current settings

## Troubleshooting

### Sync Conflicts
The plugin automatically resolves conflicts by keeping local changes. For manual resolution:
1. Check the sync status in settings
2. Review conflicted files in the history viewer
3. Choose which version to keep

### Plugin Installation Issues
If plugins don't install automatically:
1. Check that Safe Mode is disabled
2. Manually install required plugins
3. Reload Obsidian after installation

### Permission Errors
Ensure the `.obsidian` directory has write permissions for the plugin to modify settings.

## Development

This plugin uses:
- TypeScript for type safety
- isomorphic-git for Git operations
- Obsidian Plugin API

### Building from Source
```bash
npm install
npm run build
```

### Contributing
Pull requests are welcome! Please ensure:
- Code follows the existing style
- Tests pass (when implemented)
- Documentation is updated

## License

MIT License - see LICENSE file for details

## Support

- Report issues on [GitHub](https://github.com/archmagece/scripton/issues)
- Join the discussion in the Obsidian Discord