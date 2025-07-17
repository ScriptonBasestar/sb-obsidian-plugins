.PHONY: build watch lint test release install clean dev bootstrap format

# Check if pnpm is installed
check-pnpm:
	@which pnpm > /dev/null || (echo "Error: pnpm is not installed. Please install pnpm first." && exit 1)

install: check-pnpm
	pnpm install

bootstrap: install
	pnpm -r run build

build: check-pnpm
	pnpm run build

watch: check-pnpm
	pnpm run dev

test: check-pnpm
	pnpm run test

test-coverage: check-pnpm
	pnpm run test --coverage

clean:
	rm -rf dist/ lib/ node_modules/ packages/*/dist packages/*/lib packages/*/node_modules shared/dist


# Code Quality
lint: check-pnpm
	pnpm run lint

format: check-pnpm
	pnpm run format

# Git hooks integration (husky + lint-staged)
pre-commit-install: check-pnpm
	@echo "Installing git hooks with husky..."
	pnpm run prepare

pre-commit-run: check-pnpm
	@echo "Running lint-staged on all files..."
	pnpm exec lint-staged

pre-commit-test: check-pnpm
	@echo "Running all pre-commit checks..."
	pnpm run lint
	pnpm run format:check
	pnpm run test
	pnpm run typecheck

# Individual plugin commands
build-template-generator:
	pnpm --filter @sb-obsidian-plugins/template-generator run build

build-git-sync:
	pnpm --filter @sb-obsidian-plugins/git-sync run build

build-metadata-manager:
	pnpm --filter @sb-obsidian-plugins/metadata-manager run build

build-publisher-scripton:
	pnpm --filter @sb-obsidian-plugins/publisher-scripton run build

# Development commands
dev-template-generator:
	pnpm --filter @sb-obsidian-plugins/template-generator run dev

dev-git-sync:
	pnpm --filter @sb-obsidian-plugins/git-sync run dev

dev-metadata-manager:
	pnpm --filter @sb-obsidian-plugins/metadata-manager run dev

dev-publisher-scripton:
	pnpm --filter @sb-obsidian-plugins/publisher-scripton run dev

release: build
	@echo "Creating release for all plugins..."
	@for plugin in template-generator git-sync metadata-manager publisher-scripton; do \
		echo "Building release for $$plugin..."; \
		pnpm --filter @sb-obsidian-plugins/$$plugin run release; \
	done

dev-setup: check-pnpm
	@echo "Setting up development environment..."
	make install
	make bootstrap
	@echo "Development setup complete!"
	@echo "Available plugins:"
	@echo "  - template-generator: make dev-template-generator"
	@echo "  - git-sync: make dev-git-sync"
	@echo "  - metadata-manager: make dev-metadata-manager"
	@echo "  - publisher-scripton: make dev-publisher-scripton"

help:
	@echo "Available targets:"
	@echo "  install                  - Install dependencies with pnpm"
	@echo "  bootstrap               - Install deps and build all packages"
	@echo "  build                   - Build all plugins"
	@echo "  watch                   - Build and watch all plugins"
	@echo "  lint                    - Run linter on all packages"
	@echo "  test                    - Run tests on all packages"
	@echo "  test-coverage          - Run tests with coverage"
	@echo "  format                 - Format code with prettier"
	@echo "  clean                  - Clean all build artifacts"
	@echo "  release                - Create releases for all plugins"
	@echo "  dev-setup              - Complete development setup"
	@echo ""
	@echo "Individual plugin commands:"
	@echo "  build-{plugin}         - Build specific plugin"
	@echo "  dev-{plugin}           - Watch specific plugin"
	@echo ""
	@echo "Available plugins: template-generator, git-sync, metadata-manager, publisher-scripton"