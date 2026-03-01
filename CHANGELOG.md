# Changelog

All notable changes to Cryyer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- SECURITY.md with vulnerability reporting guidelines and security best practices
- README badges for CI status, npm version, license, and Node.js version
- Logo branding in README
- Link to docs site (cryyer.dev) in README

## [0.1.0] — 2025-03-01

### Added

- **Dry-run mode** (`--dry-run` flag): Preview email drafts without sending
- **Health check endpoint** (`/health`): Monitor system status
- **Init command** (`cryyer init`): Guided setup for new projects
- **GitHub issue templates**: Standard templates for bug reports and feature requests
- **MCP server for Claude Desktop**: Review, edit, and send drafts conversationally
  - Tools: list/get/update/send/regenerate drafts, list products, manage subscribers
  - Prompt: `review_weekly_drafts` for Monday morning workflow
- **Configurable LLM providers**: Anthropic (default), OpenAI, Google Gemini
- **Configurable subscriber stores**: Supabase (default), JSON file, Google Sheets
- **Product configuration** (`products/*.yaml`): Per-product voice, templates, and routing
- **Weekly draft workflow** (`weekly-draft.yml`): Monday cron job to gather activity and create draft issues
- **Send-on-close workflow** (`send-update.yml`): Triggered on issue close to send approved emails
- **Comprehensive README**: Quickstart, subscriber store setup, LLM provider guide, product config
- **Landing page and docs site**: https://cryyer.dev
- **Contributing guidelines** (`CONTRIBUTING.md`): Development setup and contribution process
- **CI workflow** (`ci.yml`): Automated linting, type-checking, and tests
- **Unit tests** with Vitest: Comprehensive test coverage for core modules
- **ESLint configuration**: TypeScript code quality checks
- **MIT License**: Open source licensing

### Changed

- Renamed project from Beacon/Cryer to Cryyer (standardized naming)
- Unified on `pnpm` as canonical package manager
- Updated `package.json` with proper metadata for npm publishing
- Deprecated `githubRepo` field in product config; now use `repo`

### Fixed

- Fixed flaky `getWeekOf` test in index.test.ts
- Fixed CI workflow to install pnpm before setup-node
- Removed deprecated modules: `db.ts`, `subscribers.ts`, `llm.ts`, `email.ts`, `github.ts`
- Updated example.yaml to use `repo` instead of deprecated `githubRepo`

### Removed

- Removed internal Ralph files and debugging scripts
- Removed npm package-lock.json (standardized on pnpm)
- Removed deprecated modules in favor of configurable abstractions

## Versioning Strategy

Cryyer follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version when making incompatible API changes
- **MINOR** version when adding functionality in a backwards-compatible manner
- **PATCH** version when making backwards-compatible bug fixes

### When to Bump Versions

- **PATCH**: Bug fixes, documentation updates, minor improvements
- **MINOR**: New features, new LLM/subscriber store providers, new CLI commands
- **MAJOR**: Breaking changes (e.g., renamed required config fields, removed features, changed output formats)

### Release Process

1. Update `CHANGELOG.md` with changes in the `[Unreleased]` section
2. Move changes to a new version section (e.g., `[0.2.0]`)
3. Update `package.json` version field
4. Create a git commit: `chore: bump version to X.Y.Z`
5. Create a git tag: `vX.Y.Z`
6. Push commits and tags: `git push && git push --tags`
7. GitHub Actions will automatically publish to npm and create a Release

### GitHub Releases

Each tag automatically triggers the creation of a GitHub Release with:

- Release notes automatically generated from git commits
- Links to associated issues and PRs
- Downloadable pre-built dist files

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contribution workflow.
