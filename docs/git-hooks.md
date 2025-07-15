# Git Hooks Configuration

This project uses Husky and lint-staged to maintain code quality through automated git hooks.

## Pre-commit Hook

Before each commit, the following checks are automatically performed on staged files:

1. **ESLint** - Fixes and validates JavaScript/TypeScript code

   - Runs with `--fix` to automatically fix issues
   - Fails if there are any warnings (`--max-warnings 0`)

2. **Prettier** - Formats all code files

   - Automatically formats `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.yaml`, `.yml` files

3. **TypeScript** - Type checks affected packages
   - Runs type checking only on the package containing modified files
   - Ensures type safety before committing

## Commit-msg Hook

Validates commit messages using commitlint with conventional commit format:

### Format

```
type(scope): subject

body

footer
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Scopes

- `git-sync`
- `metadata-manager`
- `publisher-scripton`
- `shared`
- `monorepo`
- `deps`

### Examples

```bash
# Good
git commit -m "feat(git-sync): Add support for custom merge strategies"
git commit -m "fix(metadata-manager): Resolve issue with tag parsing"
git commit -m "docs(shared): Update API documentation"

# Bad - will be rejected
git commit -m "Updated files"  # No type
git commit -m "feat"  # No subject
```

## Pre-push Hook

Before pushing to remote, the following checks are performed:

1. **All tests** - Runs `pnpm test` to ensure all tests pass
2. **Type checking** - Runs `pnpm typecheck` for all packages

## Manual Setup

If hooks are not working, run:

```bash
pnpm install  # This will run prepare script
# OR manually:
pnpm exec husky install
```

## Bypassing Hooks

In emergency situations, you can bypass hooks:

```bash
# Skip pre-commit and commit-msg hooks
git commit --no-verify -m "emergency: Fix critical issue"

# Skip pre-push hook
git push --no-verify
```

**Note**: Use bypass sparingly and ensure code quality manually when doing so.

## Troubleshooting

1. **Hooks not running**: Ensure `.husky` directory exists and hooks are executable

   ```bash
   chmod +x .husky/*
   ```

2. **lint-staged not working**: Check if files match patterns in `.lintstagedrc.json`

3. **Type checking fails**: Ensure you've built shared package first
   ```bash
   pnpm run build:shared
   ```
