# Git Sync for Obsidian

> 🔄 Automatic git synchronization with AI-powered commit messages for Obsidian

![Git Sync Demo](https://img.shields.io/badge/Obsidian-Plugin-purple) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🤖 AI-Powered Commit Messages**: Generate meaningful commit messages using Claude or GPT
- **⚡ Auto-Commit & Push**: Periodic automatic commits to temporary branch
- **🔄 Smart Merging**: Automated pull, rebase, and merge operations
- **🛡️ Conflict Resolution**: External editor integration for conflict handling
- **🎯 Branch Management**: Intelligent temporary branch workflow
- **📊 Status Monitoring**: Real-time sync status in status bar
- **🔧 Flexible Configuration**: Customizable intervals, templates, and strategies

## 🚀 Quick Start

### Installation

1. **From Obsidian Community Plugins** (Recommended)

   - Open Settings → Community Plugins
   - Search for "Git Sync"
   - Install and enable

2. **Manual Installation**
   - Download latest release from GitHub
   - Extract to `.obsidian/plugins/git-sync/`
   - Enable in Community Plugins settings

### Basic Setup

1. **Initialize Git Repository**

   ```bash
   git init
   git remote add origin <your-repo-url>
   ```

2. **Configure Plugin**

   - Open Settings → Git Sync
   - Set your preferred commit interval
   - Configure AI provider (optional)
   - Enable auto-commit

3. **Start Syncing**
   - Plugin automatically starts on Obsidian launch
   - Monitor status in the status bar
   - Use command palette for manual operations

## 📖 Core Concepts

### Branch Strategy

- **Main Branch**: Your stable branch (usually `main` or `master`)
- **Temp Branch**: Automatic commits go here (default: `tmp`)
- **Workflow**: `work → auto-commit to tmp → periodic merge to main`

### Auto-Commit Flow

1. **Timer-based commits** to temporary branch
2. **AI-generated commit messages** based on changes
3. **Automatic push** to remote repository
4. **Periodic merge** back to main branch

## ⚙️ Configuration

### Basic Settings

- **Commit Interval**: How often to auto-commit (default: 5 minutes)
- **Main Branch**: Your primary branch name
- **Temp Branch**: Branch for automatic commits
- **Include Untracked**: Whether to include new files

### AI Integration

- **Provider**: Choose between OpenAI or Anthropic
- **API Key**: Your AI service API key
- **Commit Prompt**: Template for generating commit messages
- **Template Engine**: Use advanced templating for messages

### Merge Strategy

- **Auto-merge**: Automatically merge temp branch to main
- **Strategy**: Choose merge, rebase, or squash
- **Conflict Resolution**: Open external editor on conflicts

## 🤖 AI Commit Messages

### Setup

1. Choose your AI provider (OpenAI or Anthropic)
2. Add your API key in settings
3. Customize the commit prompt template

### Default Prompt Template

```
Analyze the following git diff and generate a concise, descriptive commit message:

{{diff}}

Rules:
- Use conventional commits format (feat:, fix:, docs:, etc.)
- Keep message under 72 characters
- Focus on the 'what' and 'why', not the 'how'
- Use present tense
```

### Example Generated Messages

- `feat: add daily note template with weather integration`
- `fix: resolve metadata validation for empty frontmatter`
- `docs: update installation instructions and examples`

## 🔄 Workflow Examples

### Daily Writing Workflow

1. **Morning**: Plugin pulls latest changes
2. **Throughout day**: Auto-commits every 5 minutes to `tmp`
3. **Evening**: Auto-merge `tmp` to `main` and push

### Collaborative Workflow

1. **Pull on startup**: Get latest team changes
2. **Work isolation**: Your commits stay in `tmp`
3. **Conflict detection**: External editor opens if conflicts
4. **Clean merges**: Squash tmp commits when merging

## 🛠️ Commands

Access via Command Palette (`Ctrl/Cmd + P`):

- **Git Sync: Manual Commit** - Commit current changes
- **Git Sync: Push Now** - Push to remote immediately
- **Git Sync: Pull Latest** - Pull and rebase from remote
- **Git Sync: Merge Temp Branch** - Merge tmp to main
- **Git Sync: Open External Editor** - Launch editor for conflicts
- **Git Sync: Toggle Auto-commit** - Enable/disable auto-commit
- **Git Sync: Show Status** - Display current git status

## 📊 Status Bar

The status bar shows:

- **🔄 Syncing**: Currently performing git operations
- **✅ Clean**: Repository is clean and synced
- **⚠️ Conflicts**: Merge conflicts need resolution
- **❌ Error**: Git operation failed
- **🔒 Offline**: No internet connection

## 🔧 Advanced Configuration

### Custom Commit Templates

```javascript
// Template variables available:
// {{diff}} - Full git diff
// {{files}} - List of changed files
// {{timestamp}} - Current timestamp
// {{vault}} - Vault name

'feat({{vault}}): update {{files.length}} files at {{timestamp}}';
```

### Conflict Resolution

1. **External Editor**: Automatically opens VS Code or configured editor
2. **Manual Resolution**: Edit files to resolve conflicts
3. **Continue Merge**: Plugin detects resolution and continues

### Branch Protection

- **Protected branches**: Configure branches that won't be auto-merged
- **Backup strategy**: Create backup branches before risky operations
- **Rollback**: Easy rollback to previous states

## 🚨 Troubleshooting

### Common Issues

**Auto-commit not working?**

- ✅ Check git repository is initialized
- ✅ Verify remote is configured
- ✅ Ensure plugin is enabled
- ✅ Check console for errors

**AI commit messages failing?**

- ✅ Verify API key is valid
- ✅ Check internet connection
- ✅ Verify API quota limits
- ✅ Try different AI provider

**Merge conflicts?**

- ✅ Use external editor integration
- ✅ Check conflict markers in files
- ✅ Manually resolve and save
- ✅ Use "Continue Merge" command

**Push failures?**

- ✅ Check authentication credentials
- ✅ Verify remote repository exists
- ✅ Check network connectivity
- ✅ Review branch permissions

### Debug Mode

Enable detailed logging in settings:

1. Set log level to "debug"
2. Open Developer Console (`Ctrl/Cmd + Shift + I`)
3. Look for `[Git Sync]` messages
4. Share logs when reporting issues

## 🔒 Security Notes

- **API Keys**: Stored securely in Obsidian's local storage
- **No Data Sharing**: AI services only see git diffs, not full content
- **Local Operations**: All git operations happen locally
- **Backup Recommended**: Regular backups of your vault

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Obsidian](https://obsidian.md) for the amazing platform
- [simple-git](https://github.com/steveukx/git-js) for Git operations
- [OpenAI](https://openai.com) and [Anthropic](https://anthropic.com) for AI services
- Community contributors and testers

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sb-obsidian-plugins/obsidian-git-sync/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/sb-obsidian-plugins/obsidian-git-sync/discussions)
- 📧 **Email**: support@sb-obsidian-plugins.com

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)
