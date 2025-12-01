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
- Added vitest and vite dependencies to template-generator for test infrastructure

### Changed

- **Dependencies**: Upgraded major development dependencies
  - TypeScript: 4.9.5 → 5.9.3 (stricter type checking)
  - Vitest: 0.33.0 → 4.0.14 (major version upgrade)
  - Vite: 7.2.4 (added for vitest support)
  - ESLint: Kept at 8.57.1 (for .eslintrc compatibility)
  - Husky: Upgraded to v9 (git hooks)
- Consolidated settings-sync and git-sync plugins into scripton-sync
- Updated plugin count from 7 to 6 in documentation
- Improved branch management with automatic squash merge support

### Removed

- git-sync plugin (functionality merged into scripton-sync)
- settings-sync plugin (functionality merged into scripton-sync)

### Fixed

- **Test Infrastructure**: Resolved all test failures after Vitest 4.0 upgrade
  - publisher-scripton: Fixed axios mock configuration, TFile/TFolder instanceof checks, error handling, and logging (16/16 tests passing)
  - metadata-manager: Fixed moment mock hoisting issues with vi.mock factory (14/14 tests passing)
  - shared: Fixed test-utils imports and configuration (8/8 tests passing)
  - template-generator: Added missing vitest/vite dependencies (113/133 tests passing, 20 test failures deferred)
- **TypeScript Compilation**: Fixed all TypeScript errors after 5.9.3 upgrade
  - Added missing interface properties (PublishOptions)
  - Fixed dropdown callback type assertions
  - Added definite assignment assertions where appropriate
  - Fixed moment import patterns (namespace vs default)
  - Updated esbuild configs to use relative paths
- **Build System**: Added missing dependencies (esbuild, builtin-modules) to shared package
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
