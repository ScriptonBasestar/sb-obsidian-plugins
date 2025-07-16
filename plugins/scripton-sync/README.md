# Scripton Sync

Advanced sync plugin for Obsidian - combining settings sync, Git integration, and Scripton Cloud connectivity with intelligent branch strategies.

## Overview

Scripton Sync is a comprehensive synchronization solution that merges the best features of settings management and version control into a single, powerful plugin. It provides seamless integration with Git repositories and Scripton Cloud services while maintaining local settings profiles.

## Features

### 🔄 Settings Synchronization

- **Profile Management**: Create and switch between multiple settings profiles
- **Selective Sync**: Choose which settings to sync
- **Backup & Restore**: Automatic backup before applying changes
- **Sensitive Data Filtering**: Exclude API keys and passwords from sync

### 🌿 Git Integration

- **Automatic Commits**: Auto-commit changes at configurable intervals
- **AI Commit Messages**: Generate meaningful commit messages using OpenAI or Anthropic
- **Branch Strategies**:
  - Simple: Use default branch only
  - Develop/Host: Auto-create `develop/hostname` branches (recommended)
  - Feature Branch: Create feature-specific branches
  - Custom: Define your own strategy
- **Auto Push/Pull**: Automatic synchronization with remote repository
- **Conflict Resolution**: Manual or automatic merge conflict handling

### ☁️ Scripton Cloud Integration

- **Cloud Profiles**: Download and apply settings from Scripton Cloud
- **Plugin Recommendations**: Discover and install recommended plugins
- **Team Settings**: Share configurations across teams and organizations
- **Secure API**: Token-based authentication for cloud services

### 🎯 Advanced Features

- **Startup Actions**: Auto-pull on Obsidian startup
- **Merge Strategies**: Choose between merge, rebase, or squash
- **External Editor**: Open conflicts in VS Code or preferred editor
- **Branch Cleanup**: Automatically remove old branches
- **Status Bar**: Real-time sync status indicator

## Installation

1. Download the latest release from the [Releases](https://github.com/archmagece/scripton-sync/releases) page
2. Extract the files into your `.obsidian/plugins/scripton-sync` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## Quick Start

### Initial Setup

1. Open plugin settings (Settings → Scripton Sync)
2. Configure Git settings:
   - Set Git remote URL
   - Configure author name and email
   - Choose branch strategy
3. (Optional) Configure Scripton Cloud:
   - Enter Cloud URL and API key
   - Test connection

### Basic Usage

#### Git Sync

- Click the branch icon in the ribbon or use command palette
- Commands available:
  - `Sync all`: Pull → Commit → Push
  - `Commit changes`: Create a commit with current changes
  - `Push to remote`: Push commits to remote repository
  - `Pull from remote`: Pull changes from remote repository

#### Settings Profiles

- Create profiles: `Create settings profile from current settings`
- Switch profiles: `Switch settings profile`
- Export/Import profiles for sharing

#### Cloud Sync

- Download settings: `Download settings from Scripton Cloud`
- Upload settings: `Upload settings to Scripton Cloud`

## Configuration

### Git Settings

#### Branch Strategy

- **Simple**: All changes on main/master branch
- **Develop/Host** (Recommended): Creates `develop/your-hostname` branch
  - Auto-merges to default branch when configured
  - Prevents conflicts between different machines
- **Feature Branch**: For feature-based development
- **Custom**: Define your own branching rules

#### Auto Sync Options

- **Auto Commit**: Enable/disable automatic commits
- **Commit Interval**: Time between auto-commits (1-60 minutes)
- **Include Untracked**: Include new files in auto-commits
- **Auto Push**: Push after X commits
- **Auto Pull**: Pull on startup

#### AI Commit Messages

- **Provider**: Choose OpenAI or Anthropic
- **API Key**: Your LLM provider API key
- **Prompt Template**: Customize commit message generation

### Scripton Cloud Settings

- **Cloud URL**: Scripton Cloud server URL
- **API Key**: Your authentication token
- **Organization/Team**: Optional team settings

### Advanced Settings

- **Merge Strategy**: merge, rebase, or squash
- **Conflict Resolution**: manual, merge, or overwrite
- **Editor Command**: External editor for conflicts (default: `code`)
- **Excluded Files**: Files to ignore during sync
- **Sensitive Keys**: Settings keys to filter out

## Commands

| Command                     | Description                              |
| --------------------------- | ---------------------------------------- |
| `Sync all`                  | Complete sync cycle (pull, commit, push) |
| `Commit changes`            | Commit current changes                   |
| `Push to remote`            | Push commits to remote                   |
| `Pull from remote`          | Pull changes from remote                 |
| `Create settings profile`   | Create new profile from current settings |
| `Switch settings profile`   | Change active profile                    |
| `Download cloud settings`   | Get settings from Scripton Cloud         |
| `Upload cloud settings`     | Upload current settings to cloud         |
| `Initialize Git repository` | Set up Git in current vault              |

## Use Cases

### Personal Use

- Sync settings across multiple devices
- Maintain version history of your configuration
- Experiment with different setups using profiles

### Team Collaboration

- Share standardized settings across team members
- Use Scripton Cloud for centralized configuration
- Maintain team-specific and personal settings separately

### Development Workflow

1. Each developer works on their own `develop/hostname` branch
2. Changes auto-commit and push to remote
3. Periodically merge to main branch (manual or automatic)
4. Other developers pull latest changes

## Troubleshooting

### Common Issues

#### Git Authentication Failed

- Ensure Git credentials are configured
- For GitHub, use personal access token instead of password
- Check remote URL format

#### Merge Conflicts

- Plugin will notify about conflicts
- Use external editor if configured
- Or resolve manually and commit

#### Cloud Connection Failed

- Verify API key is correct
- Check network connectivity
- Ensure Cloud URL is accessible

### Debug Mode

Enable debug logging in Obsidian's Developer Console to see detailed information about sync operations.

## Security Considerations

- API keys and sensitive data are filtered by default
- Add custom patterns to `sensitiveKeys` setting
- Use `.gitignore` for additional file exclusions
- Cloud communication uses HTTPS

## Development

### Building from Source

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Architecture

```
src/
├── core/           # Core services
├── features/       # Feature modules
├── ui/            # UI components
└── types.ts       # Type definitions
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/archmagece/scripton-sync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/archmagece/scripton-sync/discussions)
- **Documentation**: [Wiki](https://github.com/archmagece/scripton-sync/wiki)

## Acknowledgments

This plugin combines and enhances features from:

- Settings Sync plugin
- Git Sync plugin
- Community feedback and contributions

---

Made with ❤️ for the Obsidian community
