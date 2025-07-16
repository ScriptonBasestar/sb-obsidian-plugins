# Obsidian Plugins Monorepo

A collection of Obsidian plugins managed as a monorepo using pnpm workspaces. This repository contains multiple plugins that enhance your Obsidian experience with template generation, metadata management, git synchronization, and publishing capabilities.

## 🚀 TASK_RUNNER.todo

This project includes an automated TODO task processor for managing development tasks:

```bash
# Show next incomplete task
pnpm task-runner

# Process next task interactively
pnpm task-runner --process

# Convert alert files to TODOs
pnpm task-runner --alerts
```

See [Task Runner Documentation](#task-runner) for detailed usage.

## 📦 Plugins

### scripton-sync

Advanced sync plugin combining settings sync, Git integration, and Scripton Cloud connectivity

- **Settings Profiles**: Create and switch between multiple settings configurations
- **Git Integration**: Auto-commit/push with AI-powered commit messages (OpenAI/Anthropic)
- **Branch Strategies**: develop/hostname auto-branching with squash merge support
- **Cloud Sync**: Download/upload settings from Scripton Cloud
- **Conflict Resolution**: Manual or automatic merge conflict handling

### template-generator

Template insertion plugin with dynamic content generation

- Handlebars/eta template engine support
- Dynamic variables (date, weather, fortune)
- External API integration
- Template preview and selection UI

### metadata-manager

Frontmatter metadata management and linting

- Auto-insert frontmatter on new documents
- Template-based metadata rules
- Metadata validation and linting
- Auto-formatting capabilities

### publisher-scripton

Publish notes to scripton.cloud platform

- API key management
- Selective note/folder publishing
- Markdown to HTML/JSON conversion
- Publishing status tracking

### wikijs-sync

Bidirectional synchronization with WikiJS

- Real-time file watching and sync
- GraphQL API integration
- Conflict detection and resolution
- Selective sync with exclude patterns

### blog-platform-export

Export notes to various blog platforms

- Multi-platform support (Hugo, Jekyll, WikiJS)
- Profile-based export configurations
- Asset management and image handling
- Markdown conversion with platform-specific formatting

## 🚀 Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Awesome Plugin"
4. Install and enable

### Manual Installation

1. Download the latest release from GitHub
2. Extract to your `.obsidian/plugins/` folder
3. Enable the plugin in settings

### Development Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sb-obsidian-plugins.git
cd sb-obsidian-plugins

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install

# Build all plugins
pnpm build

# Build specific plugin
pnpm --filter @sb-obsidian-plugins/template-generator build

# Link plugins to your Obsidian vault
ln -s "$(pwd)/plugins/scripton-sync" "/path/to/your/vault/.obsidian/plugins/scripton-sync"
ln -s "$(pwd)/plugins/template-generator" "/path/to/your/vault/.obsidian/plugins/template-generator"
ln -s "$(pwd)/plugins/metadata-manager" "/path/to/your/vault/.obsidian/plugins/metadata-manager"
ln -s "$(pwd)/plugins/publisher-scripton" "/path/to/your/vault/.obsidian/plugins/publisher-scripton"
ln -s "$(pwd)/plugins/wikijs-sync" "/path/to/your/vault/.obsidian/plugins/wikijs-sync"
ln -s "$(pwd)/plugins/blog-platform-export" "/path/to/your/vault/.obsidian/plugins/blog-platform-export"
```

## 🔄 Development Workflow

### Setup

```bash
make dev-setup
```

### Development Commands

- `make watch` - Build and watch for changes
- `make build` - Build the plugin
- `make lint` - Run linter
- `make test` - Run tests
- `make test-coverage` - Run tests with coverage

### Release Process

1. Update version in `package.json` and `manifest.json`
2. Run `make build` to create distribution files
3. Run `make release` to create GitHub release

## ⚙️ Configuration

The plugin provides several configuration options:

- **Template Folder**: Specify the folder containing your templates
- **Auto Metadata**: Enable/disable automatic metadata generation
- **Scripton Sync**: Advanced sync settings (Git, Cloud, Profiles)
- **Publishing**: Enable/disable publishing capabilities

## 🧪 Testing

The plugin uses Vitest for testing:

```bash
# Run tests
make test

# Run tests with coverage
make test-coverage
```

## 📝 Commands

- **Insert Template**: Insert a template at cursor position
- **Auto-generate Metadata**: Add frontmatter metadata to current note
- **Sync All**: Complete sync cycle (pull, commit, push)
- **Commit Changes**: Create a commit with current changes
- **Publish Note**: Publish current note to configured destination

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run `make lint` and `make test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Task Runner

### Directory Structure

```
tasks/
├── todo/          # Active TODO files ([ ] items)
├── done/          # Completed files (__DONE_YYYYMMDD.md)
└── alert/         # Alert files to be converted to TODOs
```

### Task Processing Flow

1. **Find Next Task**: Scans files alphabetically, finds first `[ ]` item
2. **Analysis**: Reviews dependencies, related code/docs
3. **Implementation**: Code changes, tests, documentation
4. **Format & Commit**: Runs formatter, commits with proper message
5. **File Movement**: Moves completed files to `/tasks/done/`

### Task Markers

- `[ ]` - Incomplete task
- `[x]` - Completed task
- `[>]` - Blocked/impossible task (document reason)

## 🙏 Acknowledgments

- Inspired by [Templater](https://github.com/SilentVoid13/Templater)
- Metadata features inspired by [MetaEdit](https://github.com/chhoumann/MetaEdit)
- Git integration combines features from settings-sync and git-sync plugins
- Publishing features inspired by [obsidian-publish](https://github.com/obsidianmd/obsidian-releases)
