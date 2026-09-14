# Course Builder User Guide

This guide explains how to validate, initialize, build, validate, publish, and
maintain a static interactive course using **Course Builder v2**.

It is intended for:

- course authors using a coding agent;
- developers initializing a new course repository;
- maintainers validating or updating a previously initialized destination.

## 1. What You Get

Course Builder packages a complete, zero-backend course framework:

- a static learner runtime;
- a deterministic manifest and catalog compiler;
- a deterministic course factory;
- the unchanged 14-gate validation pipeline;
- a curriculum template and reference prompts;
- course architecture and workflow documentation;
- CI and GitHub Pages deployment workflows;
- release readiness contracts.

The skill deliberately does not package:

- `dist/`;
- `node_modules/`;
- `graphify-out/`;
- destination `courses/`;
- operating-system metadata;
- generated reports;
- stale generated content;
- repository history.

Dependencies are represented by `template/tests/package.json` and
`template/tests/package-lock.json`. Use `init.js --install` to install them
with `npm ci`.

## 2. Before You Begin

You need:

1. **Node.js 18 or newer** — Node 24 is used by the source project.
2. **npm** — included with Node.js.
3. **A destination repository** — can be empty or existing.
4. **A topic** — for example, *Sustainable Home Energy*.
5. **Optional curriculum inputs** — audience, outcomes, module count, assets,
   datasets, and desired depth.

The destination must not already contain a different course framework unless you
intentionally intend to replace the packaged framework paths.

## 3. Understand The Skill Paths

When this skill is stored in a source repository, its main paths are:

```text
skills/course-builder/
  SKILL.md
  README.md
  scripts/init.js
  scripts/package.js
  scripts/validate.js
  references/
  templates/
  framework/
    package-manifest.json
```

When installed globally, replace `skills/course-builder` with the
installed skill directory, for example:

```text
~/.codex/skills/course-builder
```

All examples below use the project-local path.

## 4. Validate The Skill First

Before initializing a destination, validate the skill package:

```bash
node skills/course-builder/scripts/validate.js
```

The validator checks:

1. required skill structure;
2. required framework files;
3. prohibited package content;
4. packaging and SHA-256 checksums;
5. canonical drift, when the source repository is available;
6. the source repository's canonical pipeline, when available;
7. a complete temporary empty-directory initialization and destination validation.

To save a machine-readable report:

```bash
node skills/course-builder/scripts/validate.js \
  --report validation-report.json
```

Optional controls:

```bash
--skip-canonical       # Do not run the source-repository pipeline
--skip-initialization  # Do not initialize a temporary destination
```

The command exits nonzero if any selected check fails. Fix the package or
environment before using the skill to initialize a real destination.

Maintainers regenerate the embedded framework only through:

```bash
node skills/course-builder/scripts/package.js
```

Never manually edit `framework/`. Run `package.js --check` before committing
the package to detect canonical drift, prohibited content, and checksum changes.

## 5. Initialize A New Destination

From the repository containing the skill:

```bash
node skills/course-builder/scripts/init.js \
  --target ../my-course-repo
```

This creates:

```text
my-course-repo/
  AGENT.md
  Proposed-Architecture.md
  course.yaml
  courses.yaml
  template/
  docs/
  notes/
  .github/
```

It can also install the lockfile-pinned headless test dependency with
`--install`:

```bash
cd template/tests
npm ci
```

### 5.1 Initialize And Validate Together

For a complete first-run check:

```bash
node skills/course-builder/scripts/init.js \
  --target ../my-course-repo \
  --install \
  --validate \
  --report initialization-report.json
```

This runs the unchanged 14-gate pipeline in the destination.

### 5.2 Skip Dependency Installation

Use this only when jsdom is already resolvable in the destination, for example
through an existing installation or `NODE_PATH`:

```bash
node skills/course-builder/scripts/init.js \
  --target ../my-course-repo \
  --no-install
```

### 5.3 Handle Existing Framework Paths

By default, initialization refuses to overwrite:

```text
AGENT.md
Proposed-Architecture.md
course.yaml
courses.yaml
.github/
docs/
notes/
template/
```

If these paths already exist, initialization stops without changing them.

To replace only these packaged framework paths:

```bash
node skills/course-builder/scripts/init.js \
  --target ../my-course-repo \
  --force
```

Use `--force` only after reviewing the destination. It replaces framework
contracts and validation scripts; it does not authorize unrelated learner-content
changes.

### 5.4 Initialization Safety Rules

The initializer:

- creates the destination if necessary;
- refuses partial overwrites by default;
- installs only the declared headless test dependency when `--install` is used;
- runs the destination's own scripts, not the source repository's scripts;
- keeps generated output in the destination;
- never packages dependencies, `dist/`, or generated reports.

## 6. Design The Curriculum

Before writing a course, create `curriculum.json` in the destination root.

Start from:

```text
skills/course-builder/templates/curriculum.json
```

Copy it to the destination:

```bash
cp skills/course-builder/templates/curriculum.json \
  ../my-course-repo/curriculum.json
```

Then edit it to describe:

- course ID, name, and version;
- modules;
- module short labels;
- learning objectives;
- checkpoints;
- correct answers;
- explanations;
- optional final assessment host.

Example shape:

```json
{
  "schemaVersion": 1,
  "course": {
    "id": "sustainable-home-energy",
    "name": "Sustainable Home Energy",
    "version": "v1.0"
  },
  "modules": [
    {
      "id": "M1",
      "short": "Read Your Bill",
      "objectives": [
        {
          "id": "energy-bill-kwh",
          "text": "Explain what kilowatt-hours measure on a home energy bill."
        }
      ],
      "checkpoint": {
        "id": "m1-kwh",
        "q": "Which unit measures consumed electricity over time?",
        "options": ["Kilowatt-hours", "Watts", "Volts"],
        "answer": 0,
        "explanation": "A kilowatt-hour combines power and duration."
      }
    }
  ],
  "finalQuizHost": null
}
```

### 6.1 Required Human Review

If no curriculum exists, the agent must create only `curriculum.json` and then
stop for your review. Do not generate the course until you explicitly approve
the curriculum.

### 6.2 Curriculum Rules

- `schemaVersion` must be `1`.
- Course IDs and module IDs must be route-safe.
- At least one module is required.
- Every module requires a short label.
- Every module requires at least one objective.
- Every objective requires a unique ID.
- Every module requires a valid checkpoint.
- Checkpoint answers use zero-based indexes.

## 7. Generate The Starter Course

After you approve `curriculum.json`, run:

```bash
cd ../my-course-repo
node template/scripts/course-factory.js curriculum.json
```

The factory creates:

```text
courses/<course-id>/
  index.html
  course-manifest.json
  content/<module-id>.md
```

It also registers the course in `courses.yaml`.

Do not hand-edit generated `dist/` output. The publisher regenerates it.

## 8. Enrich The Course

After starter generation, enrich only permitted course material:

- module and assessment markdown;
- declared assets;
- declared datasets;
- permitted built-in components;
- declared custom components when a built-in component cannot meet the need;
- generated expected-answer data.

### 8.1 Prefer Built-In Components

Available built-in components include:

- diagram;
- objectives;
- quiz;
- flashcard;
- chartlab;
- reviewpack;
- progresskit;
- certificate.

Add a custom component only when no built-in component can satisfy a curriculum
requirement.

### 8.2 Enrichment Boundaries

Never modify:

- player core;
- vendor libraries;
- progress semantics;
- certificate gating;
- validation gates;
- framework tests except generated expected-answer data;
- generated `dist/` output.

If validation fails, fix the generated course. Do not weaken a gate or test.

## 9. Run The Canonical Pipeline

After generation or enrichment:

```bash
cd ../my-course-repo
node template/scripts/agent-run.js
```

The pipeline runs these unchanged 14 gates:

1. manifest compiler check;
2. manifest schema fixtures;
3. course factory tests;
4. catalog compiler;
5. course validation;
6. unit tests;
7. headless course walkthrough;
8. production checks;
9. multi-course validation;
10. catalog determinism;
11. deterministic publish;
12. publish verification;
13. accessibility report;
14. release readiness.

The course is complete only when:

```text
template/tests/generated/agent-run.json
```

contains:

```json
{
  "status": "success"
}
```

## 10. Interpret Validation Failures

### 10.1 Manifest Failures

Common causes:

- module content is missing;
- IDs are duplicated;
- IDs are not route-safe;
- the final assessment is not last;
- `finalQuizHost` references an unknown module;
- `course.yaml` and the generated manifest disagree.

Fix the course contract, rerun the compiler or factory, then rerun the pipeline.

### 10.2 Content Lint Failures

Common causes:

- quiz answers are outside the option range;
- an interactive component is not registered;
- media paths are missing or not app-relative;
- dataset files are missing or invalid;
- module routes do not exist.

Fix content, then rerun the canonical pipeline.

### 10.3 Headless Failures

Common causes:

- expected answers are out of sync;
- required checkpoints are not completable;
- progress does not reach 100%;
- certificate requirements do not unlock;
- component mounting fails;
- a runtime error occurs.

Do not edit progress or certificate semantics. Fix the generated course or
expected-answer data.

### 10.4 Accessibility Failures

Common causes:

- missing accessible labels;
- missing live regions;
- inaccessible component markup;
- keyboard navigation problems.

Fix component or content markup without weakening validation.

### 10.5 Release Readiness Failures

Common causes:

- missing release notes;
- missing CI workflow;
- missing deployment workflow;
- missing deployment guide;
- publish checksum mismatch;
- static payload budget exceeded.

Restore the required repository contract and rerun the pipeline.

## 11. Publish Locally

The canonical pipeline already generates and verifies `dist/`.

To publish and verify manually:

```bash
cd ../my-course-repo
node template/scripts/publish.js
node template/scripts/verify-publish.js
```

The static catalog starts at:

```text
dist/index.html
```

`dist/courses.html` serves the same catalog for compatibility.

Each course is isolated under:

```text
dist/courses/<course-id>/
```

## 12. Deploy With GitHub Pages

Initialization includes:

```text
.github/workflows/ci.yml
.github/workflows/deploy-pages.yml
docs/DEPLOYMENT.md
```

One-time setup:

1. Open the destination repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Save.
5. Push to `main`, `master`, or a `v*` tag, or run the workflow manually.

Deployment runs only after the full validation pipeline succeeds.

## 13. Maintain An Initialized Repository

For everyday course work:

```bash
cd ../my-course-repo
node template/scripts/agent-run.js
```

Do not reinitialize unless you intentionally want to update the framework.

After updating the framework with `--force`, run:

```bash
cd ../my-course-repo
node template/scripts/agent-run.js
```

### 13.1 Add Another Course

1. Create or update `curriculum.json`.
2. Run the course factory.
3. Enrich the generated content.
4. Run the canonical pipeline.
5. Confirm `agent-run.json` reports `success`.

The catalog compiler and multi-course validator keep `courses.yaml`, manifests,
routes, and generated catalog JSON synchronized.

## 14. Use With A Coding Agent

When prompting an agent, say:

```text
Use $course-builder to build a beginner course on
sustainable home energy.
```

The agent should:

1. validate the portable skill;
2. initialize the destination;
3. create only `curriculum.json`;
4. stop for curriculum review;
5. generate the starter course after approval;
6. enrich permitted course files;
7. run the canonical pipeline;
8. stop only when every gate passes.

## 15. Troubleshooting

### `npm ci` fails

Check:

```bash
node --version
npm --version
```

Ensure the destination has not corrupted
`template/tests/package-lock.json` and that dependency installation can access
the configured npm registry.

### Initialization refuses existing paths

This is intentional. Review the destination, then pass `--force` only if you
want to replace the packaged framework paths.

### Destination gate fails after source gate passes

Run the destination command directly:

```bash
cd ../my-course-repo
node template/scripts/agent-run.js
```

Inspect:

```text
template/tests/generated/agent-run.json
```

The destination owns its generated state and validation reports.

### Generated reports are missing after initialization

If you used `--no-install`, install dependencies first:

```bash
cd ../my-course-repo/template/tests
npm ci
```

Then run the destination pipeline again.

### The portable package fails its exclusion check

The package must not contain `dist/`, `node_modules/`, `graphify-out/`,
generated reports, or repository history. Remove those artifacts from the skill
directory and rerun the portable validator.

## 16. Command Reference

| Command | Purpose |
| --- | --- |
| `node scripts/init.js --target <path>` | Initialize a destination |
| `node scripts/init.js --target <path> --install --validate` | Initialize, install, and run all gates |
| `node scripts/init.js --target <path> --no-install` | Skip `npm ci` |
| `node scripts/init.js --target <path> --force` | Replace packaged framework paths |
| `node scripts/package.js` | Rebuild the embedded framework |
| `node scripts/package.js --check` | Check drift, exclusions, and checksums |
| `node scripts/validate.js` | Validate the portable skill |
| `node template/scripts/course-factory.js curriculum.json` | Generate starter course |
| `node template/scripts/agent-run.js` | Run the unchanged 14 gates |
| `node template/scripts/publish.js` | Generate `dist/` |
| `node template/scripts/verify-publish.js` | Verify `dist/` |

## 17. Stop Condition

The workflow is complete only when:

```text
template/tests/generated/agent-run.json
```

reports:

```json
{
  "status": "success"
}
```

Do not stop early, skip a gate, or weaken a rule.
