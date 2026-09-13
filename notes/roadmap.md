# Project Roadmap — Phases 1–13 Complete

## Current State

The topic-agnostic interactive course framework is complete, validated, and release-ready.
It supports declarative course manifests, objective mastery, deterministic publishing,
multi-course routing, automated course generation, and consolidated release checks.

## Completed Phases

### Phase 1 — Manifest-Driven Runtime ✅

- Authoritative `course.yaml`
- Compiler-generated runtime manifest
- Manifest-driven navigation, progress, presentation, and final assessment

### Phase 2 — Deterministic Course Compiler ✅

- Deterministic manifest compilation
- Quiz answer generation
- Quiz, component, dataset, media, module, and route linting

### Phase 3 — Component Ecosystem ✅

- Component plugin contract
- Manifest-declared built-ins
- Accessible generic diagram component
- Failure isolation and component tests

### Phase 4 — Domain Packages ✅

- Pure, deterministic domain engine
- Dataset validation
- Deterministic domain unit tests

### Phase 5 — Agent Automation ✅

- One-command full validation pipeline
- Machine-readable agent report
- Compiler, catalog, course, unit, headless, production, publishing,
  accessibility, and release gates

### Phase 6 — Accessibility and Quality ✅

- Landmark, heading, control-label, media-caption, and certificate checks
- Network-hermetic runtime verification
- Full headless course completion

### Phase 7 — Multi-Course Foundation ✅

- Authoritative `courses.yaml`
- Generated catalog JSON
- Catalog and manifest identity checks
- Course-scoped progress, flashcard, and theme storage

### Phase 8 — Deterministic Publishing ✅

- Deterministic static output
- SHA-256 build manifest
- Checksum verification and unexpected-file checks

### Phase 9 — Advanced Learning Features ✅

- Stable objective IDs
- Objective checkpoint maps
- Mastery and recommendation states
- Diagnostic pre-assessment without certificate impact

### Phase 10 — Manifest Contract Hardening ✅

- Shared parser/schema module
- Course and catalog contracts
- Valid and malformed fixture suites
- Duplicate ID, route, objective-reference, and link checks

### Phase 11 — True Multi-Course Productionization ✅

- Isolated route per course: `dist/courses/<course-id>/`
- Unified catalog shell
- Catalog route collision prevention
- Per-course manifest and runtime verification

### Phase 12 — Agent Course Factory ✅

- Curriculum JSON input
- Deterministic course generation
- Generated manifest, content, objective map, catalog entry, and report
- Idempotent regeneration and end-to-end factory tests

### Phase 13 — Release and Operations Quality ✅

- Consolidated release gate
- Performance and per-file size budgets
- Responsive viewport and breakpoint checks
- Accessibility and network-hermetic checks
- Build provenance and enforced release notes

### Hosted CI ✅

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs on every pull request
- Runs on `main` and `master` pushes
- Runs on release tags matching `v*`
- Supports manual dispatch
- Uses Node.js 24
- Runs the full canonical agent pipeline
- Uploads validation reports and the static distribution

### GitHub Pages Deployment ✅

- Deployment workflow: `.github/workflows/deploy-pages.yml`
- Deploys only after full validation succeeds
- Publishes the checksum-verified `dist/` directory
- Supports `main`, `master`, `v*` tags, and manual dispatch
- Deployment guide: `docs/DEPLOYMENT.md`

## Final Validation

| Gate | Result |
|---|---|
| Canonical agent pipeline | success, 14/14 steps |
| Manifest schema fixtures | 10/10 |
| Course factory tests | 7/7 |
| Unit tests | 11/11 |
| Headless DOM tests | 57/57 |
| Production readiness | passed |
| Multi-course validation | 2 courses, passed |
| Deterministic publish | 94 content files |
| Publish verification | 95 total files, 0 errors |
| Accessibility audit | passed |
| Release readiness | passed |

## Release

- Release notes: `notes/release-notes.md`
- Full progress log: `notes/phases-10-13-progress.md`
- Machine-readable release report:
  `template/tests/generated/release-report.json`

## Post-Release Options

These are optional future enhancements rather than incomplete roadmap phases:

- Expand accessibility reporting into a formal WCAG conformance document.
- Add more reusable components such as timelines, concept maps, and simulations.
- Add LMS export formats while preserving the static-only core.
