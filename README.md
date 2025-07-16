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

### template-generator

Template insertion plugin with dynamic content generation

- Handlebars/eta template engine support
- Dynamic variables (date, weather, fortune)
- External API integration
- Template preview and selection UI

### git-sync

Automatic git synchronization with AI-powered commit messages

- Periodic auto-commit to `tmp` branch
- LLM-powered commit message generation
- Auto-pull on startup
- Conflict resolution support

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
ln -s "$(pwd)/plugins/template-generator" "/path/to/your/vault/.obsidian/plugins/template-generator"
ln -s "$(pwd)/plugins/git-sync" "/path/to/your/vault/.obsidian/plugins/git-sync"
# ... repeat for other plugins
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
- **Git Sync**: Enable/disable git synchronization features
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
- **Git Sync**: Synchronize with git repository
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
- Git integration inspired by [obsidian-git](https://github.com/denolehov/obsidian-git)
- Publishing features inspired by [obsidian-publish](https://github.com/obsidianmd/obsidian-releases)
