# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **scripton-sync**: New comprehensive sync plugin combining settings-sync and git-sync features
  - Settings profile management with multiple configuration support
  - Git integration with simple-git library
  - Branch strategies including develop/hostname auto-branching
  - AI-powered commit messages (OpenAI/Anthropic)
  - Scripton Cloud integration for settings download/upload
  - Conflict resolution options (manual/automatic)
  - Tab-based settings UI for better organization

### Changed

- Consolidated settings-sync and git-sync plugins into scripton-sync
- Updated plugin count from 7 to 6 in documentation
- Improved branch management with automatic squash merge support

### Removed

- git-sync plugin (functionality merged into scripton-sync)
- settings-sync plugin (functionality merged into scripton-sync)

### Fixed

- Various TypeScript type definitions for better type safety
- Git authentication and conflict handling improvements

## [1.0.0] - Previous Release

### Added

- Initial release with 7 plugins:
  - template-generator
  - git-sync
  - metadata-manager
  - publisher-scripton
  - settings-sync
  - wikijs-sync
  - blog-platform-export

### Features

- Monorepo structure using pnpm workspaces
- Shared configuration and utilities
- Comprehensive test coverage
- ESBuild for fast compilation

---

For detailed plugin-specific changes, see individual plugin CHANGELOG files.
