# Changelog

All notable changes to Cryyer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.13](https://github.com/atriumn/cryyer/compare/v0.1.12...v0.1.13) (2026-03-04)


### Features

* require manual approval before sending release emails ([f7d2104](https://github.com/atriumn/cryyer/commit/f7d210412da1411618d930f62390b0fb6158ce46))
* wire multi-audience into release pipeline ([0c9ea11](https://github.com/atriumn/cryyer/commit/0c9ea113573f8b977d26452f17d955ffa87442f9))
* wire multi-audience support into release pipeline ([2f56783](https://github.com/atriumn/cryyer/commit/2f567832f16c7c72515714e7f39c9eacaa2a1464))


### Bug Fixes

* remove weekly language from LLM prompt and product config ([d5277ca](https://github.com/atriumn/cryyer/commit/d5277ca23acea3caca4f33eceacc25068f1622df))

## [0.1.12](https://github.com/atriumn/cryyer/compare/v0.1.11...v0.1.12) (2026-03-04)


### Features

* add multi-audience support and rename weekly functions ([961c081](https://github.com/atriumn/cryyer/commit/961c081d83d46a464697f4003920e37c25910696))
* pass target version to LLM prompt in draft-file pipeline ([1b21cd7](https://github.com/atriumn/cryyer/commit/1b21cd71cfbd17cb2fea5bcc1bfe99a9b5e9adf7))


### Bug Fixes

* compute --since from latest tag in draft-email workflow ([036f92e](https://github.com/atriumn/cryyer/commit/036f92e41f957d022a84551a9813fe1dc9bc57a6))
* resolve lint errors in mcp and send test files ([604faff](https://github.com/atriumn/cryyer/commit/604faff9bf1c13965b7a0d02a8d8aaeca0d49fa4))

## [0.1.11](https://github.com/atriumn/cryyer/compare/v0.1.10...v0.1.11) (2026-03-03)


### Features

* add --help flag to preview command ([b056559](https://github.com/atriumn/cryyer/commit/b056559303d2297ec81d12faa773436089ea8754))

## [0.1.10](https://github.com/atriumn/cryyer/compare/v0.1.9...v0.1.10) (2026-03-03)


### Features

* add total count summary to preview output ([a1b32a1](https://github.com/atriumn/cryyer/commit/a1b32a19df9739c28b848a8bbc6e9fd9f4e584b4))


### Bug Fixes

* increase LLM max tokens and switch to Gemini 3 Flash ([6edde8a](https://github.com/atriumn/cryyer/commit/6edde8adbd4faadd028e10528d85bf449b392201))

## [0.1.9](https://github.com/atriumn/cryyer/compare/v0.1.8...v0.1.9) (2026-03-03)


### Features

* add `cryyer preview` command to show gathered activity ([567e2cf](https://github.com/atriumn/cryyer/commit/567e2cfa4b666f62ea3e89fc75087f2c3b1d49dc))


### Bug Fixes

* improve LLM response parsing for Gemini compatibility ([4f59ff6](https://github.com/atriumn/cryyer/commit/4f59ff60204f4dc74deb7fe0990471f8ba23abda))

## [0.1.8](https://github.com/atriumn/cryyer/compare/v0.1.7...v0.1.8) (2026-03-03)


### Features

* add composite actions, draft-file/send-file CLI commands, and release email dogfooding ([038743b](https://github.com/atriumn/cryyer/commit/038743b6447f30ce4bc64c6767b73465333f10c9))

## [0.1.7](https://github.com/atriumn/cryyer/compare/v0.1.6...v0.1.7) (2026-03-03)


### Features

* add pluggable email provider (Gmail support) and token guidance in init ([27d2ed7](https://github.com/atriumn/cryyer/commit/27d2ed708707ce035b8db31ca830b817faa78417))

## [0.1.6](https://github.com/atriumn/cryyer/compare/v0.1.5...v0.1.6) (2026-03-03)


### Features

* redesign `cryyer init` for a great first-run experience ([5963c72](https://github.com/atriumn/cryyer/commit/5963c72cdf8c725febbed71c5d3dd004cd97fed9))

## [0.1.5](https://github.com/atriumn/cryyer/compare/v0.1.4...v0.1.5) (2026-03-03)


### Features

* upgrade default Anthropic model to claude-sonnet-4-5 ([964a441](https://github.com/atriumn/cryyer/commit/964a4415f54d0b34a25261ce2e5ddbe41076bc5c))

## [0.1.4](https://github.com/atriumn/cryyer/compare/v0.1.3...v0.1.4) (2026-03-03)


### Bug Fixes

* use node 24 for publish (npm trusted publishing requires &gt;=11.5.1) ([a570fcf](https://github.com/atriumn/cryyer/commit/a570fcf5436c2ccd496faafb51f65d9d49683a26))

## [0.1.3](https://github.com/atriumn/cryyer/compare/v0.1.2...v0.1.3) (2026-03-03)


### Bug Fixes

* remove registry-url to allow npm trusted publishing via OIDC ([796b186](https://github.com/atriumn/cryyer/commit/796b186009a54b78efc8e9ebdef9912ace796e27))

## [0.1.2](https://github.com/atriumn/cryyer/compare/v0.1.1...v0.1.2) (2026-03-03)


### Bug Fixes

* add packageManager field to fix release workflow ([8e93b18](https://github.com/atriumn/cryyer/commit/8e93b1826e56017dcf0b7136ac357dafacac78dd))
* remove duplicate pnpm version from ci.yml ([38046e4](https://github.com/atriumn/cryyer/commit/38046e4a7b8cfc60f1e88c262fe36aab09c1a781))
* replace jyoung GitHub links with atriumn in docs site ([23473d8](https://github.com/atriumn/cryyer/commit/23473d8c4cd979f08efd0a4c3a5c6229651708da))

## [0.1.1](https://github.com/atriumn/cryyer/compare/v0.1.0...v0.1.1) (2026-03-03)


### Features

* **#30:** complete package.json metadata for npm publishing ([7aee9b6](https://github.com/atriumn/cryyer/commit/7aee9b6c9a86017d1bc7cf0b77e99d0b0dc0a49e))
* **#32:** standardize on pnpm, remove npm package-lock.json ([3c5f63c](https://github.com/atriumn/cryyer/commit/3c5f63c5b820e8be9f02975274953119382b3115))
* **#33:** add CONTRIBUTING.md with development guidelines ([a08c151](https://github.com/atriumn/cryyer/commit/a08c15189f7694181e7141d4f3c3b8309e025d50))
* **#39:** remove deprecated modules db.ts, subscribers.ts ([24d2296](https://github.com/atriumn/cryyer/commit/24d2296c06b3065fa553b6cddad0ce2045e8a44e)), closes [#39](https://github.com/atriumn/cryyer/issues/39)
* **#56,#57,#58,#59:** add dry-run mode, health check, init command, and GitHub templates ([75c3a65](https://github.com/atriumn/cryyer/commit/75c3a65f28298d2c9f03f0a70f0bd1120b161d25))
* **#61,#62,#63:** add SECURITY.md, CHANGELOG.md, and README badges ([7bd2f4f](https://github.com/atriumn/cryyer/commit/7bd2f4f62d18f19d975df63b0661a141f8a1cc2c))
* **#64,#65:** deploy docs site and validate npm publish readiness ([39223af](https://github.com/atriumn/cryyer/commit/39223af3b4cd765ccabd6840eff6ccffbcfb30d2))
* add Celiumn product configuration with voice definition ([b3fed37](https://github.com/atriumn/cryyer/commit/b3fed37a53f19c4f45462911c7d69b9df0be87da))
* add CI workflow, unit tests, and improved CLAUDE.md ([8ef3a26](https://github.com/atriumn/cryyer/commit/8ef3a2643d138407fd40eb4e662683aaeda41266))
* add CLI subcommands for open source users ([1ad9c41](https://github.com/atriumn/cryyer/commit/1ad9c4178966b30d4c6cc30cfdf8f7f75c43c7a7))
* add Idynic product configuration with extended schema ([e254817](https://github.com/atriumn/cryyer/commit/e2548171665dccd61010512b30f2cfcb702c7cc5))
* add landing page and docs site ([160f822](https://github.com/atriumn/cryyer/commit/160f822f09ea429042106a91e538702358d5df22))
* add MCP server for draft review and subscriber management ([9af5853](https://github.com/atriumn/cryyer/commit/9af585354ebbe4532fdf0e7e72a754b48d349734))
* add release-please for automated versioning and changelog ([#73](https://github.com/atriumn/cryyer/issues/73)) ([bb8a363](https://github.com/atriumn/cryyer/commit/bb8a36370dfeb488ad118587f7bd948bb4433dab))
* add release-please for automated versioning and changelog (+1 more) ([d5d7eb9](https://github.com/atriumn/cryyer/commit/d5d7eb9bc800a9da3b6b30152f4d4f3b34ce9312))
* add send-on-close workflow ([#10](https://github.com/atriumn/cryyer/issues/10)) ([18a27df](https://github.com/atriumn/cryyer/commit/18a27dfe7824e09b5ba0cf54674eff9e5f09dba3))
* add weekly draft cron workflow ([#9](https://github.com/atriumn/cryyer/issues/9)) ([34ab5c5](https://github.com/atriumn/cryyer/commit/34ab5c5d07b2947fec6f84186828f1de40396c8b))
* implement GitHub activity gatherer (src/gather.ts) ([6eb447c](https://github.com/atriumn/cryyer/commit/6eb447c99e574225c769163e37f7a33ef731eca3))
* implement LLM draft generator (src/summarize.ts) ([27d32be](https://github.com/atriumn/cryyer/commit/27d32bec42d67ac0605306f3de2f2b2136e8a0da))
* implement Resend email sender (src/send.ts) ([121770b](https://github.com/atriumn/cryyer/commit/121770bb90bbe28ca08fed1027e46c7adb268003))
* implement Supabase subscriber module (src/subscribers.ts) ([6b48a87](https://github.com/atriumn/cryyer/commit/6b48a87afe1d44d4e14e523edf48b973f8ef4763)), closes [#7](https://github.com/atriumn/cryyer/issues/7)
* make LLM provider configurable (Anthropic, OpenAI, Gemini) ([38b3a87](https://github.com/atriumn/cryyer/commit/38b3a87defba0228069e04f359d1b03c6f3fcd6a))
* make subscriber store configurable (Supabase, JSON, Google Sheets) ([c3ccff6](https://github.com/atriumn/cryyer/commit/c3ccff644d56d73bb00e249f86a6243fe4bd2382))
* resolve issues [#31](https://github.com/atriumn/cryyer/issues/31), [#40](https://github.com/atriumn/cryyer/issues/40), [#42](https://github.com/atriumn/cryyer/issues/42), [#43](https://github.com/atriumn/cryyer/issues/43), [#44](https://github.com/atriumn/cryyer/issues/44), [#45](https://github.com/atriumn/cryyer/issues/45), [#46](https://github.com/atriumn/cryyer/issues/46) ([b89f7a6](https://github.com/atriumn/cryyer/commit/b89f7a6a45a5ce4bf0fcf6e1a4cab3d40080db93))
* scaffold initial project structure for beacon ([5d4396b](https://github.com/atriumn/cryyer/commit/5d4396bce031229d296554f6a1b84eb2b712b028))
* seed initial beta testers for Celiumn product ([8c69723](https://github.com/atriumn/cryyer/commit/8c6972357774aefbde8b70228d576b9fc385df7b))
* use SUPABASE_SERVICE_KEY for Supabase authentication ([cd3cfaa](https://github.com/atriumn/cryyer/commit/cd3cfaabd9665fb48d1f17e8b3aada2d5e1a481e))


### Bug Fixes

* **#41:** update example.yaml to use 'repo' instead of deprecated 'githubRepo' ([45aa51a](https://github.com/atriumn/cryyer/commit/45aa51a6d58beb800c9077927f7ebffd6ce6a887))
* **#50,#51,#52,#53,#54,#55:** fix flaky test, add .env.example, remove deprecated refs, unify on pnpm, remove private configs ([13a5ee1](https://github.com/atriumn/cryyer/commit/13a5ee1f62c54afdc32cf36aed86179e202a78d0))
* **#75,#76,#77:** fix beacon refs, add MCP client docs, add .npmignore ([7f45a95](https://github.com/atriumn/cryyer/commit/7f45a95397dede87b634743fc5773a54e666d4ca))
* add tagline to Product, PR body to GatheredPR, update prompt ([ef3dac6](https://github.com/atriumn/cryyer/commit/ef3dac6e9b9abbd104dc6bf26cedcc98718ce789))
* **ci:** install pnpm before setup-node ([dae5dae](https://github.com/atriumn/cryyer/commit/dae5dae05f8cb04163b8d6e0740921a36db2b027))
* remove ts-node dev script dependency ([fc4e2bb](https://github.com/atriumn/cryyer/commit/fc4e2bbf0146e1f54e45c679c606d87c27fc33f3))
* **security:** resolve minimatch ReDoS vulnerabilities ([a288817](https://github.com/atriumn/cryyer/commit/a28881760cb39b0edfe2462949622e8cb52e3c92))
* update email template variables to use correct naming convention ([9c36fdf](https://github.com/atriumn/cryyer/commit/9c36fdfbeb402a30168539f540d7654e000947ee))
* use claude-3-5-haiku-latest as default model in summarize.ts ([fc96f9b](https://github.com/atriumn/cryyer/commit/fc96f9b503a295d470bad9cda01e0a6976d14c73))
* use claude-3-5-sonnet-latest as Anthropic model ID ([9320dab](https://github.com/atriumn/cryyer/commit/9320dabb94907856ee93b68366c52cb0930d19ff))
* use valid Anthropic model ID in llm.ts ([731e2eb](https://github.com/atriumn/cryyer/commit/731e2eb49651ef51c1160aaec85faa79de1fd69a))

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
