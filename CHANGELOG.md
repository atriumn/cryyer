# Changelog

All notable changes to Cryyer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.4](https://github.com/atriumn/cryyer/compare/cryyer-v0.6.3...cryyer-v0.6.4) (2026-03-11)


### Documentation

* gist store requires classic PAT, not fine-grained ([#126](https://github.com/atriumn/cryyer/issues/126)) ([2c314f9](https://github.com/atriumn/cryyer/commit/2c314f9a0c3373c6b01a5d691328db811cbdecb1))

## [0.6.3](https://github.com/atriumn/cryyer/compare/cryyer-v0.6.2...cryyer-v0.6.3) (2026-03-08)


### Documentation

* clarify PAT requirements for gist subscriber store ([9e41235](https://github.com/atriumn/cryyer/commit/9e4123584165aa73c9bba990ebdc76462bae6631))
* clarify PAT requirements for gist subscriber store ([a979932](https://github.com/atriumn/cryyer/commit/a979932c2f249f48a9153add7719f2cd56c3cdc1))

## [0.6.2](https://github.com/atriumn/cryyer/compare/cryyer-v0.6.1...cryyer-v0.6.2) (2026-03-07)


### Documentation

* add gist subscriber store to README ([ea174f8](https://github.com/atriumn/cryyer/commit/ea174f8f2ebd92321deded331bb0a132dffb31ac))
* add gist subscriber store to README ([567636d](https://github.com/atriumn/cryyer/commit/567636dd02c62b5407b32ecb09ba968b7b926911))
* add git workflow rules to CLAUDE.md ([dca2eb8](https://github.com/atriumn/cryyer/commit/dca2eb82fe2972a4915f459251e9063931c6810b))

## [0.6.1](https://github.com/atriumn/cryyer/compare/cryyer-v0.6.0...cryyer-v0.6.1) (2026-03-07)


### Bug Fixes

* gist store requires PAT, not default GITHUB_TOKEN ([35d6818](https://github.com/atriumn/cryyer/commit/35d6818f973cf434e5c380e64dac905a5c94b3fd))
* gist store requires PAT, not default GITHUB_TOKEN ([563c47e](https://github.com/atriumn/cryyer/commit/563c47ef83cde1d4e24f1e0c228a1cfabc404747))
* retry LLM call once on unparseable response ([4d72866](https://github.com/atriumn/cryyer/commit/4d72866e00bf9d40a934d82ed4e4766f650e0b42))
* retry LLM call once on unparseable response ([024ac2d](https://github.com/atriumn/cryyer/commit/024ac2d381ca2d4d20024938a029156bddef5805))

## [0.6.0](https://github.com/atriumn/cryyer/compare/cryyer-v0.5.0...cryyer-v0.6.0) (2026-03-06)


### Features

* add GitHub Gist subscriber store ([8bfd4cc](https://github.com/atriumn/cryyer/commit/8bfd4cc284db1f80ee99108ac0df1b6c4194088c))
* add GitHub Gist subscriber store for public repos ([62aba5b](https://github.com/atriumn/cryyer/commit/62aba5b7f4fc77e3b4df5a38bed48c642f2bb653))


### Bug Fixes

* only run draft-email on PR opened ([94fc391](https://github.com/atriumn/cryyer/commit/94fc3910d4b82726343c7f8dd60f98d9c30dd779))
* only run draft-email on PR opened, not synchronize ([8f27c46](https://github.com/atriumn/cryyer/commit/8f27c462c1c69ff3d58307b3f2209ebde888c391))
* skip draft-email when drafts already exist ([4823121](https://github.com/atriumn/cryyer/commit/4823121224ea16d287847bd093f24e0e9085ad59))
* skip draft-email when drafts already exist ([265ddc4](https://github.com/atriumn/cryyer/commit/265ddc451dbfb051bf4db1e03e454da949df7894))
* use PAT for draft-email push so CI retriggers ([f54b434](https://github.com/atriumn/cryyer/commit/f54b4349499bf18ebe2ae5c6b344cb7a6f0ea55b))
* use PAT for draft-email push so CI retriggers ([652bc91](https://github.com/atriumn/cryyer/commit/652bc9128a7dc5ccb9f7faa8b2c347ec09031f52))

## [0.5.0](https://github.com/atriumn/cryyer/compare/cryyer-v0.4.1...cryyer-v0.5.0) (2026-03-06)


### Features

* add "emails by cryyer" badge for consumer repos ([af6b8d9](https://github.com/atriumn/cryyer/commit/af6b8d9fd980c3c61587cd875098235ee1d0e846))


### Bug Fixes

* use light badge colors so logo is visible ([4c3d1a6](https://github.com/atriumn/cryyer/commit/4c3d1a6a4ccbc8dba1b9858b09cfa4f902fe5d00))
* use shields.io for badge so logo renders on GitHub ([8c85926](https://github.com/atriumn/cryyer/commit/8c85926ccba8a266da40656a816c563dffd2662b))
* use shields.io for badge so logo renders on GitHub ([4ad31ea](https://github.com/atriumn/cryyer/commit/4ad31ea4bc47852b4f44a032da5367f5302bfcef))
* use white logo silhouette on dark badge background ([824f9b4](https://github.com/atriumn/cryyer/commit/824f9b4ead4a6696bff511168240cfe76934f8fc))

## [0.4.1](https://github.com/atriumn/cryyer/compare/cryyer-v0.4.0...cryyer-v0.4.1) (2026-03-06)


### Bug Fixes

* add npm auth to release workflow ([ff04d8a](https://github.com/atriumn/cryyer/commit/ff04d8a493062cced62d134984709526ef07ec6a))
* use OIDC trusted publishing instead of npm token ([3dac767](https://github.com/atriumn/cryyer/commit/3dac767875c250798f13f208c309e178188fc900))

## [0.4.0](https://github.com/atriumn/cryyer/compare/cryyer-v0.3.0...cryyer-v0.4.0) (2026-03-06)


### Features

* add --pipeline flag for weekly/release/both workflow choice ([d5e049e](https://github.com/atriumn/cryyer/commit/d5e049e393d1568d0ed3269edbccf8490e6de4b6))
* add --pipeline flag to choose weekly, release, or both workflows ([5f3e9fe](https://github.com/atriumn/cryyer/commit/5f3e9fe3f24337e545d68b74b53dd47b7a03e9b0))

## [0.3.0](https://github.com/atriumn/cryyer/compare/cryyer-v0.2.2...cryyer-v0.3.0) (2026-03-06)


### Features

* non-interactive cryyer init ([d6d503e](https://github.com/atriumn/cryyer/commit/d6d503e012c796b3753a78aaa89927cee0d73079))
* support non-interactive `cryyer init` for CI and automation ([51758dd](https://github.com/atriumn/cryyer/commit/51758dd910c4c1cea1f54abc107901f640440f8b)), closes [#105](https://github.com/atriumn/cryyer/issues/105)


### Bug Fixes

* clear CI env var in interactive init tests ([f720ad0](https://github.com/atriumn/cryyer/commit/f720ad04d388286e87489651351c5d872796ccf4))

## [0.2.2](https://github.com/atriumn/cryyer/compare/cryyer-v0.2.1...cryyer-v0.2.2) (2026-03-05)


### Bug Fixes

* release workflow tag filter for scoped package ([24ce24f](https://github.com/atriumn/cryyer/commit/24ce24f7cfb5b8eabbdbdad3eb17c9ee081ff262))
* release workflow tag filter for scoped package ([df0b3d8](https://github.com/atriumn/cryyer/commit/df0b3d8cdd9014ef1437b3d57cc0542ccddd70fb))

## [0.2.1](https://github.com/atriumn/cryyer/compare/cryyer-v0.2.0...cryyer-v0.2.1) (2026-03-05)


### Bug Fixes

* build from source and fix version extraction in send-email workflow ([ef61329](https://github.com/atriumn/cryyer/commit/ef61329353fad663dde3c4c2cf8a5b183e411c43))
* send-email workflow — build from source, fix version parsing ([8eae5dd](https://github.com/atriumn/cryyer/commit/8eae5dd1c47339c3986ea914b34dd411ed980d9d))

## [0.2.0](https://github.com/atriumn/cryyer/compare/cryyer-v0.1.14...cryyer-v0.2.0) (2026-03-05)


### Features

* **#30:** complete package.json metadata for npm publishing ([7aee9b6](https://github.com/atriumn/cryyer/commit/7aee9b6c9a86017d1bc7cf0b77e99d0b0dc0a49e))
* **#32:** standardize on pnpm, remove npm package-lock.json ([3c5f63c](https://github.com/atriumn/cryyer/commit/3c5f63c5b820e8be9f02975274953119382b3115))
* **#33:** add CONTRIBUTING.md with development guidelines ([a08c151](https://github.com/atriumn/cryyer/commit/a08c15189f7694181e7141d4f3c3b8309e025d50))
* **#39:** remove deprecated modules db.ts, subscribers.ts ([24d2296](https://github.com/atriumn/cryyer/commit/24d2296c06b3065fa553b6cddad0ce2045e8a44e)), closes [#39](https://github.com/atriumn/cryyer/issues/39)
* **#56,#57,#58,#59:** add dry-run mode, health check, init command, and GitHub templates ([75c3a65](https://github.com/atriumn/cryyer/commit/75c3a65f28298d2c9f03f0a70f0bd1120b161d25))
* **#61,#62,#63:** add SECURITY.md, CHANGELOG.md, and README badges ([7bd2f4f](https://github.com/atriumn/cryyer/commit/7bd2f4f62d18f19d975df63b0661a141f8a1cc2c))
* **#64,#65:** deploy docs site and validate npm publish readiness ([39223af](https://github.com/atriumn/cryyer/commit/39223af3b4cd765ccabd6840eff6ccffbcfb30d2))
* add --help flag to preview command ([b056559](https://github.com/atriumn/cryyer/commit/b056559303d2297ec81d12faa773436089ea8754))
* add `cryyer preview` command to show gathered activity ([567e2cf](https://github.com/atriumn/cryyer/commit/567e2cfa4b666f62ea3e89fc75087f2c3b1d49dc))
* add Celiumn product configuration with voice definition ([b3fed37](https://github.com/atriumn/cryyer/commit/b3fed37a53f19c4f45462911c7d69b9df0be87da))
* add CI workflow, unit tests, and improved CLAUDE.md ([8ef3a26](https://github.com/atriumn/cryyer/commit/8ef3a2643d138407fd40eb4e662683aaeda41266))
* add CLI subcommands for open source users ([1ad9c41](https://github.com/atriumn/cryyer/commit/1ad9c4178966b30d4c6cc30cfdf8f7f75c43c7a7))
* add composite actions, draft-file/send-file CLI commands, and release email dogfooding ([038743b](https://github.com/atriumn/cryyer/commit/038743b6447f30ce4bc64c6767b73465333f10c9))
* add Idynic product configuration with extended schema ([e254817](https://github.com/atriumn/cryyer/commit/e2548171665dccd61010512b30f2cfcb702c7cc5))
* add landing page and docs site ([160f822](https://github.com/atriumn/cryyer/commit/160f822f09ea429042106a91e538702358d5df22))
* add MCP server for draft review and subscriber management ([9af5853](https://github.com/atriumn/cryyer/commit/9af585354ebbe4532fdf0e7e72a754b48d349734))
* add multi-audience support and rename weekly functions ([961c081](https://github.com/atriumn/cryyer/commit/961c081d83d46a464697f4003920e37c25910696))
* add pluggable email provider (Gmail support) and token guidance in init ([27d2ed7](https://github.com/atriumn/cryyer/commit/27d2ed708707ce035b8db31ca830b817faa78417))
* add release-please for automated versioning and changelog ([#73](https://github.com/atriumn/cryyer/issues/73)) ([bb8a363](https://github.com/atriumn/cryyer/commit/bb8a36370dfeb488ad118587f7bd948bb4433dab))
* add release-please for automated versioning and changelog (+1 more) ([d5d7eb9](https://github.com/atriumn/cryyer/commit/d5d7eb9bc800a9da3b6b30152f4d4f3b34ce9312))
* add send-on-close workflow ([#10](https://github.com/atriumn/cryyer/issues/10)) ([18a27df](https://github.com/atriumn/cryyer/commit/18a27dfe7824e09b5ba0cf54674eff9e5f09dba3))
* add total count summary to preview output ([a1b32a1](https://github.com/atriumn/cryyer/commit/a1b32a19df9739c28b848a8bbc6e9fd9f4e584b4))
* add weekly draft cron workflow ([#9](https://github.com/atriumn/cryyer/issues/9)) ([34ab5c5](https://github.com/atriumn/cryyer/commit/34ab5c5d07b2947fec6f84186828f1de40396c8b))
* implement GitHub activity gatherer (src/gather.ts) ([6eb447c](https://github.com/atriumn/cryyer/commit/6eb447c99e574225c769163e37f7a33ef731eca3))
* implement LLM draft generator (src/summarize.ts) ([27d32be](https://github.com/atriumn/cryyer/commit/27d32bec42d67ac0605306f3de2f2b2136e8a0da))
* implement Resend email sender (src/send.ts) ([121770b](https://github.com/atriumn/cryyer/commit/121770bb90bbe28ca08fed1027e46c7adb268003))
* implement Supabase subscriber module (src/subscribers.ts) ([6b48a87](https://github.com/atriumn/cryyer/commit/6b48a87afe1d44d4e14e523edf48b973f8ef4763)), closes [#7](https://github.com/atriumn/cryyer/issues/7)
* make LLM provider configurable (Anthropic, OpenAI, Gemini) ([38b3a87](https://github.com/atriumn/cryyer/commit/38b3a87defba0228069e04f359d1b03c6f3fcd6a))
* make subscriber store configurable (Supabase, JSON, Google Sheets) ([c3ccff6](https://github.com/atriumn/cryyer/commit/c3ccff644d56d73bb00e249f86a6243fe4bd2382))
* pass target version to LLM prompt in draft-file pipeline ([1b21cd7](https://github.com/atriumn/cryyer/commit/1b21cd71cfbd17cb2fea5bcc1bfe99a9b5e9adf7))
* redesign `cryyer init` for a great first-run experience ([5963c72](https://github.com/atriumn/cryyer/commit/5963c72cdf8c725febbed71c5d3dd004cd97fed9))
* require manual approval before sending release emails ([f7d2104](https://github.com/atriumn/cryyer/commit/f7d210412da1411618d930f62390b0fb6158ce46))
* resolve issues [#31](https://github.com/atriumn/cryyer/issues/31), [#40](https://github.com/atriumn/cryyer/issues/40), [#42](https://github.com/atriumn/cryyer/issues/42), [#43](https://github.com/atriumn/cryyer/issues/43), [#44](https://github.com/atriumn/cryyer/issues/44), [#45](https://github.com/atriumn/cryyer/issues/45), [#46](https://github.com/atriumn/cryyer/issues/46) ([b89f7a6](https://github.com/atriumn/cryyer/commit/b89f7a6a45a5ce4bf0fcf6e1a4cab3d40080db93))
* scaffold initial project structure for beacon ([5d4396b](https://github.com/atriumn/cryyer/commit/5d4396bce031229d296554f6a1b84eb2b712b028))
* seed initial beta testers for Celiumn product ([8c69723](https://github.com/atriumn/cryyer/commit/8c6972357774aefbde8b70228d576b9fc385df7b))
* upgrade default Anthropic model to claude-sonnet-4-5 ([964a441](https://github.com/atriumn/cryyer/commit/964a4415f54d0b34a25261ce2e5ddbe41076bc5c))
* use SUPABASE_SERVICE_KEY for Supabase authentication ([cd3cfaa](https://github.com/atriumn/cryyer/commit/cd3cfaabd9665fb48d1f17e8b3aada2d5e1a481e))
* wire multi-audience into release pipeline ([0c9ea11](https://github.com/atriumn/cryyer/commit/0c9ea113573f8b977d26452f17d955ffa87442f9))
* wire multi-audience support into release pipeline ([2f56783](https://github.com/atriumn/cryyer/commit/2f567832f16c7c72515714e7f39c9eacaa2a1464))


### Bug Fixes

* **#41:** update example.yaml to use 'repo' instead of deprecated 'githubRepo' ([45aa51a](https://github.com/atriumn/cryyer/commit/45aa51a6d58beb800c9077927f7ebffd6ce6a887))
* **#50,#51,#52,#53,#54,#55:** fix flaky test, add .env.example, remove deprecated refs, unify on pnpm, remove private configs ([13a5ee1](https://github.com/atriumn/cryyer/commit/13a5ee1f62c54afdc32cf36aed86179e202a78d0))
* **#75,#76,#77:** fix beacon refs, add MCP client docs, add .npmignore ([7f45a95](https://github.com/atriumn/cryyer/commit/7f45a95397dede87b634743fc5773a54e666d4ca))
* add packageManager field to fix release workflow ([8e93b18](https://github.com/atriumn/cryyer/commit/8e93b1826e56017dcf0b7136ac357dafacac78dd))
* add tagline to Product, PR body to GatheredPR, update prompt ([ef3dac6](https://github.com/atriumn/cryyer/commit/ef3dac6e9b9abbd104dc6bf26cedcc98718ce789))
* build from source in draft-email workflow ([2a06f2d](https://github.com/atriumn/cryyer/commit/2a06f2d491e1ad618bbd4c572dd42817be889d8e))
* build from source in draft-email workflow ([9748857](https://github.com/atriumn/cryyer/commit/9748857555cab0326bc6330047b396b86c0a0515))
* **ci:** install pnpm before setup-node ([dae5dae](https://github.com/atriumn/cryyer/commit/dae5dae05f8cb04163b8d6e0740921a36db2b027))
* compute --since from latest tag in draft-email workflow ([036f92e](https://github.com/atriumn/cryyer/commit/036f92e41f957d022a84551a9813fe1dc9bc57a6))
* configure release-please for docs/chore releases ([0405082](https://github.com/atriumn/cryyer/commit/0405082be5dc4a4f21acaa7e1ae2b256ce220409))
* configure release-please to include docs and chore commits ([7de3d1d](https://github.com/atriumn/cryyer/commit/7de3d1dedcd20d3b5bca63ed55add4afb5305666))
* handle deep headings and * list items in email markdown converter ([cc82d5b](https://github.com/atriumn/cryyer/commit/cc82d5ba7080351911df4b18cd81538eca2db02f))
* handle deep headings and * list items in email rendering ([ea6c0e7](https://github.com/atriumn/cryyer/commit/ea6c0e720caa18cd44661e5f4226c55a8bcbe311))
* improve LLM response parsing for Gemini compatibility ([4f59ff6](https://github.com/atriumn/cryyer/commit/4f59ff60204f4dc74deb7fe0990471f8ba23abda))
* increase LLM max tokens and switch to Gemini 3 Flash ([6edde8a](https://github.com/atriumn/cryyer/commit/6edde8adbd4faadd028e10528d85bf449b392201))
* remove duplicate pnpm version from ci.yml ([38046e4](https://github.com/atriumn/cryyer/commit/38046e4a7b8cfc60f1e88c262fe36aab09c1a781))
* remove registry-url to allow npm trusted publishing via OIDC ([796b186](https://github.com/atriumn/cryyer/commit/796b186009a54b78efc8e9ebdef9912ace796e27))
* remove ts-node dev script dependency ([fc4e2bb](https://github.com/atriumn/cryyer/commit/fc4e2bbf0146e1f54e45c679c606d87c27fc33f3))
* remove weekly language from LLM prompt and product config ([d5277ca](https://github.com/atriumn/cryyer/commit/d5277ca23acea3caca4f33eceacc25068f1622df))
* replace jyoung GitHub links with atriumn in docs site ([23473d8](https://github.com/atriumn/cryyer/commit/23473d8c4cd979f08efd0a4c3a5c6229651708da))
* resolve lint errors in mcp and send test files ([604faff](https://github.com/atriumn/cryyer/commit/604faff9bf1c13965b7a0d02a8d8aaeca0d49fa4))
* **security:** resolve minimatch ReDoS vulnerabilities ([a288817](https://github.com/atriumn/cryyer/commit/a28881760cb39b0edfe2462949622e8cb52e3c92))
* update email template variables to use correct naming convention ([9c36fdf](https://github.com/atriumn/cryyer/commit/9c36fdfbeb402a30168539f540d7654e000947ee))
* use claude-3-5-haiku-latest as default model in summarize.ts ([fc96f9b](https://github.com/atriumn/cryyer/commit/fc96f9b503a295d470bad9cda01e0a6976d14c73))
* use claude-3-5-sonnet-latest as Anthropic model ID ([9320dab](https://github.com/atriumn/cryyer/commit/9320dabb94907856ee93b68366c52cb0930d19ff))
* use node 24 for publish (npm trusted publishing requires &gt;=11.5.1) ([a570fcf](https://github.com/atriumn/cryyer/commit/a570fcf5436c2ccd496faafb51f65d9d49683a26))
* use valid Anthropic model ID in llm.ts ([731e2eb](https://github.com/atriumn/cryyer/commit/731e2eb49651ef51c1160aaec85faa79de1fd69a))


### Miscellaneous

* add ESLint configuration and dependencies ([1188cdc](https://github.com/atriumn/cryyer/commit/1188cdc69f6c6fc4739902b8174b55f556630f31))
* add minimal ESLint configuration file ([3eb91a5](https://github.com/atriumn/cryyer/commit/3eb91a5f81d02eda6647cd8ab71f8610e3bbcf3f))
* add MIT LICENSE file ([4951b36](https://github.com/atriumn/cryyer/commit/4951b36c55ae7177db66ee4d04448631cc1128bb))
* auto-commit before merge (loop primary) ([f8b70d6](https://github.com/atriumn/cryyer/commit/f8b70d6dfdd1facb3e3c143e31ddd6442bcdd7c0))
* auto-commit before merge (loop primary) ([059f688](https://github.com/atriumn/cryyer/commit/059f68830032a575ceecfe8401ba7640bdb499ff))
* auto-commit before merge (loop primary) ([0163b48](https://github.com/atriumn/cryyer/commit/0163b483087c9de02f1abc55f786b0c6816706ae))
* auto-commit before merge (loop primary) ([92be7c9](https://github.com/atriumn/cryyer/commit/92be7c926af6ce2d26436cc24e07a1ff04f82332))
* auto-commit before merge (loop primary) ([bdd7f22](https://github.com/atriumn/cryyer/commit/bdd7f22bd34d84f604894922a6d9b973eb38db70))
* auto-commit before merge (loop primary) ([342a2da](https://github.com/atriumn/cryyer/commit/342a2da3eee37f15b699a3929d2ddbe30c373ff1))
* auto-commit before merge (loop primary) ([d250975](https://github.com/atriumn/cryyer/commit/d25097553fc44e7fa461f0cf63613c4674ad8797))
* auto-commit before merge (loop primary) ([fc2fbf2](https://github.com/atriumn/cryyer/commit/fc2fbf2051e29ad33718190d6e5019994f2244c9))
* auto-commit before merge (loop primary) ([08bbf8d](https://github.com/atriumn/cryyer/commit/08bbf8df40a5dc06de20e9b37f0aa60f8438db58))
* auto-commit before merge (loop primary) ([096cf4b](https://github.com/atriumn/cryyer/commit/096cf4bc828d7406364e980f8cd07d2e269313b2))
* auto-commit before merge (loop primary) ([55adcf9](https://github.com/atriumn/cryyer/commit/55adcf9666b4037b974cd26f6c440e596724ac6b))
* auto-commit before merge (loop primary) ([8f598ce](https://github.com/atriumn/cryyer/commit/8f598ceb5852c2662b5d054f7178b2b269dce431))
* close scaffolding task ([dcb2913](https://github.com/atriumn/cryyer/commit/dcb2913af00cf8a802f8de67463a46aac938a533))
* draft email for v0.1.11 ([847fe78](https://github.com/atriumn/cryyer/commit/847fe78e2e42449bec174bd04091b9a15dd1d0cc))
* draft email for v0.1.12 ([731a98c](https://github.com/atriumn/cryyer/commit/731a98c2b5ea90cb58dae2afd6aa14a06093f1ca))
* draft emails for v0.1.13 ([d107dd8](https://github.com/atriumn/cryyer/commit/d107dd8dd6143174424e6d26c442d197f7a9bfe4))
* draft emails for v0.1.14 ([4013e06](https://github.com/atriumn/cryyer/commit/4013e06cd5031427a1f32ad46b74a21c20bf82ad))
* **main:** release 0.1.1 ([40422f9](https://github.com/atriumn/cryyer/commit/40422f928bbab600ca090b94c7f7fc4cf02898cf))
* **main:** release 0.1.1 ([e19e3d0](https://github.com/atriumn/cryyer/commit/e19e3d0e39e0ae5ce8b6af125dd6ef15086e5a19))
* **main:** release 0.1.10 ([#89](https://github.com/atriumn/cryyer/issues/89)) ([665da29](https://github.com/atriumn/cryyer/commit/665da29710401a863b29c0e5b11c1ee957ff6531))
* **main:** release 0.1.11 ([e1f0b61](https://github.com/atriumn/cryyer/commit/e1f0b6168f34354a6139eee6701441f05bf111d4))
* **main:** release 0.1.11 ([3460f19](https://github.com/atriumn/cryyer/commit/3460f19a5e03cf35c72e9aa3b83867068c1cf527))
* **main:** release 0.1.12 ([f868c76](https://github.com/atriumn/cryyer/commit/f868c76867fc94bfcddf8b1c06e6c198f1e71462))
* **main:** release 0.1.12 ([68f7123](https://github.com/atriumn/cryyer/commit/68f712349a47a2aeae275ae63adfc72581b9151f))
* **main:** release 0.1.13 ([b09a47a](https://github.com/atriumn/cryyer/commit/b09a47a30bd9684528082c3ef7fc11fc250ca52a))
* **main:** release 0.1.13 ([74713bb](https://github.com/atriumn/cryyer/commit/74713bbeb7584c1f006715fc953b6b1342d373be))
* **main:** release 0.1.14 ([9660d65](https://github.com/atriumn/cryyer/commit/9660d653686c27159c16185945b3548ef8fc7c7b))
* **main:** release 0.1.14 ([f209316](https://github.com/atriumn/cryyer/commit/f2093167d13417c2231b8e0e152e5429cd6effde))
* **main:** release 0.1.2 ([9857b0f](https://github.com/atriumn/cryyer/commit/9857b0ff615b9dd9c0c9c01da9c8d6e29ae31c3d))
* **main:** release 0.1.2 ([f655a37](https://github.com/atriumn/cryyer/commit/f655a37222825d4d021c5b4a6fd2f09f8249b16f))
* **main:** release 0.1.3 ([a07b6bc](https://github.com/atriumn/cryyer/commit/a07b6bc6222191693a8bbbaa39b982b667fb9f1e))
* **main:** release 0.1.3 ([e2e79c9](https://github.com/atriumn/cryyer/commit/e2e79c980fcdfa0db67e8dfa70cbff953d45c0be))
* **main:** release 0.1.4 ([e1b49e1](https://github.com/atriumn/cryyer/commit/e1b49e117bb89fa5bc4ad6f5ff6c94924a7ec874))
* **main:** release 0.1.4 ([76d2e4d](https://github.com/atriumn/cryyer/commit/76d2e4d264654f33bab6fc655bb7fad5310e18bf))
* **main:** release 0.1.5 ([80597e8](https://github.com/atriumn/cryyer/commit/80597e8b48d870039ae37825595092774d7545ab))
* **main:** release 0.1.5 ([6b2c791](https://github.com/atriumn/cryyer/commit/6b2c7914bbdf173c168a0da769b59d97783cea41))
* **main:** release 0.1.6 ([95fe79f](https://github.com/atriumn/cryyer/commit/95fe79ffa6f4d537ca243ce5fe6c8e89a2e2e7e2))
* **main:** release 0.1.6 ([a1514b6](https://github.com/atriumn/cryyer/commit/a1514b6f4cadf0c202cd4244e142cc4aa23579be))
* **main:** release 0.1.7 ([#86](https://github.com/atriumn/cryyer/issues/86)) ([7c18dce](https://github.com/atriumn/cryyer/commit/7c18dce27edc5211e2dcd274ac820d48d1eec223))
* **main:** release 0.1.8 ([#87](https://github.com/atriumn/cryyer/issues/87)) ([a41b05a](https://github.com/atriumn/cryyer/commit/a41b05a5cfcef4bdcb38687973eb9278626dd4e6))
* **main:** release 0.1.9 ([#88](https://github.com/atriumn/cryyer/issues/88)) ([6a678e2](https://github.com/atriumn/cryyer/commit/6a678e2268b4b4bc069e9915d582dd5b7e0291ce))
* mark lock files as binary in .gitattributes to reduce diff noise ([b3a2f81](https://github.com/atriumn/cryyer/commit/b3a2f81f42ddb3e080cbbe2d2fbb04078144eecc))
* mark tasks as closed ([ae0f40f](https://github.com/atriumn/cryyer/commit/ae0f40f8d35aa3c01db00a8d9c7f31024e8ab2bd))
* remove ralph files from repo and add to gitignore ([1b64bd7](https://github.com/atriumn/cryyer/commit/1b64bd719dce54f8b2b8323f5054768d79b5dae8))
* remove redundant deploy-site workflow ([0335188](https://github.com/atriumn/cryyer/commit/033518853ce6ad4aa2009c2e15c33c46f88aea66))
* rename cryer to cryyer across codebase and repo ([1073379](https://github.com/atriumn/cryyer/commit/107337966f5830cd8d12840b43d8758ba8a302ae))
* rename npm package to @atriumn/cryyer ([5e01984](https://github.com/atriumn/cryyer/commit/5e01984f8189a2937b2dd84be13f9a53640e8f43))
* rename npm package to @atriumn/cryyer ([aa7c6f1](https://github.com/atriumn/cryyer/commit/aa7c6f126eb11d2413721ea57870dc89958b2d2f))
* rename project from beacon to cryer ([79e517d](https://github.com/atriumn/cryyer/commit/79e517d63a379d10058285ce9400db8db3c8dd54))
* set up ESLint configuration ([8215cf4](https://github.com/atriumn/cryyer/commit/8215cf429572247b76dd9e78f876553fd2f5e622))
* switch to npm trusted publishing (drop NPM_TOKEN) ([b2cd800](https://github.com/atriumn/cryyer/commit/b2cd800feb5e7e5ed51f04ba51f694404772517c))
* update pnpm lock file ([34dc668](https://github.com/atriumn/cryyer/commit/34dc668275816c08e410836c5119b0e2945158ea))


### Documentation

* add code of conduct ([b8e2d2e](https://github.com/atriumn/cryyer/commit/b8e2d2e543abca4026837b8bb78345be6197923d))
* add logo to README ([73c0c44](https://github.com/atriumn/cryyer/commit/73c0c44726127b8698b2bad29dc87a572072ef4f))
* add release pipeline and manual approval gate documentation ([acde28a](https://github.com/atriumn/cryyer/commit/acde28a25057b6cf1a91aa062f179c5e1bfd2d0b))
* document GitHub secrets configuration ([05ae373](https://github.com/atriumn/cryyer/commit/05ae373045d8d34baecf6ea58c093bd89bc9b7d6))
* document removed deprecated modules and repo conventions in CLAUDE.md ([bc2211d](https://github.com/atriumn/cryyer/commit/bc2211d0465085e20f2a870f24e12cb30a6d6602))
* fix stale documentation across repo ([8270152](https://github.com/atriumn/cryyer/commit/8270152370a377c2cc7d8d6717eb11ec221a5d52))
* fix stale documentation across repo ([ce9429d](https://github.com/atriumn/cryyer/commit/ce9429d5a2101945bd52b18f5627ff76ed326268))
* rewrite README with quickstart, subscriber stores, and Google Sheets walkthrough ([e9a96d9](https://github.com/atriumn/cryyer/commit/e9a96d9a640fb76a1d053ed8a4f629ede72da425))
* update CLAUDE.md to document both release and weekly pipelines ([fb52a39](https://github.com/atriumn/cryyer/commit/fb52a39ab1f367152cc09e291ae6f0ad69e24ac5))
* update scratchpad with completion summary ([ef8c2f5](https://github.com/atriumn/cryyer/commit/ef8c2f5996924076a0fc977fe7a411a6e3e99c33))


### Tests

* **#44:** expand orchestration tests with mocked external calls ([3e58383](https://github.com/atriumn/cryyer/commit/3e58383e581172ea60517bafb52068279349c858))
* **#52,#53:** add regression tests verifying deprecated modules are absent and dist/ is gitignored ([043eebf](https://github.com/atriumn/cryyer/commit/043eebf92e94a31f14c9f3bc00b34eb2bf623e8a))
* boost coverage to 87% and refactor mcp.ts for testability ([124c406](https://github.com/atriumn/cryyer/commit/124c4061c3cb4e0e11cd1c8d4154169ff632c4fd))

## [0.1.14](https://github.com/atriumn/cryyer/compare/v0.1.13...v0.1.14) (2026-03-04)


### Bug Fixes

* handle deep headings and * list items in email markdown converter ([cc82d5b](https://github.com/atriumn/cryyer/commit/cc82d5ba7080351911df4b18cd81538eca2db02f))
* handle deep headings and * list items in email rendering ([ea6c0e7](https://github.com/atriumn/cryyer/commit/ea6c0e720caa18cd44661e5f4226c55a8bcbe311))

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
