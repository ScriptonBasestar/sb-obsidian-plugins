.PHONY: build watch lint test release install clean

install:
	npm install

build:
	npm run build

watch:
	npm run dev

lint:
	npm run lint

test:
	npm run test

test-coverage:
	npm run test:coverage

clean:
	rm -rf dist/ lib/ node_modules/

release: build
	@echo "Creating release for version $$(node -p \"require('./package.json').version\")"
	gh release create v$$(node -p "require('./package.json').version") dist/*.zip --generate-notes

dev-setup:
	@echo "Setting up development environment..."
	make install
	@echo "Development setup complete!"

help:
	@echo "Available targets:"
	@echo "  install        - Install dependencies"
	@echo "  build          - Build the plugin"
	@echo "  watch          - Build and watch for changes"
	@echo "  lint           - Run linter"
	@echo "  test           - Run tests"
	@echo "  test-coverage  - Run tests with coverage"
	@echo "  clean          - Clean build artifacts"
	@echo "  release        - Create a GitHub release"
	@echo "  dev-setup      - Complete development setup"
	@echo "  help           - Show this help message"