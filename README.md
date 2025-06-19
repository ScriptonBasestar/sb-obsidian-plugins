# Obsidian Awesome Plugin

An all-in-one Obsidian plugin that combines template insertion, metadata automation, git synchronization, and publishing features.

## ✅ Features

### 📄 Template Insertion
- Quick template insertion with customizable templates
- Built-in templates for daily notes and meeting notes
- Template folder configuration
- Modal interface for template selection

### 🪄 Metadata Automation
- Auto-generate frontmatter metadata
- Automatic creation and modification timestamps
- Title and tag extraction
- Configurable metadata fields

### 🔧 Git Synchronization
- Git-based version control integration
- Automatic commit and sync capabilities
- Branch management support
- Conflict resolution assistance

### 🌐 Publishing
- Export notes to static site generators
- Multiple output format support
- Automated publishing workflows
- Custom publishing configurations

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
git clone https://github.com/yourusername/obsidian-awesome-plugin.git
cd obsidian-awesome-plugin

# Install dependencies
make install

# Build the plugin
make build

# Link to your Obsidian vault
ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/obsidian-awesome-plugin"
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

## 🙏 Acknowledgments

- Inspired by [Templater](https://github.com/SilentVoid13/Templater)
- Metadata features inspired by [MetaEdit](https://github.com/chhoumann/MetaEdit)
- Git integration inspired by [obsidian-git](https://github.com/denolehov/obsidian-git)
- Publishing features inspired by [obsidian-publish](https://github.com/obsidianmd/obsidian-releases)
