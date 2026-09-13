# Course Factory Skill v1 Guide

This guide explains the `course-factory` skill: what it is, how to install it,
how it works, and how to use it to build a complete static interactive course.

## What the Skill Is

`course-factory` is a Codex skill that packages the repeatable workflow for the
Architecture-Interactive-Web-Learning framework.

It does not replace the framework. The framework remains the deterministic
engine that:

1. generates a course from `curriculum.json`;
2. compiles manifests and catalog entries;
3. validates content, routing, tests, accessibility, and publication;
4. produces the static distribution.

The skill instead teaches any coding agent how to use that framework correctly.

## Skill Version

This is **skill v1**.

Version v1 focuses on:

- curriculum generation;
- course generation;
- permitted enrichment;
- canonical validation;
- deployment handoff.

## Skill Location

### Project-local skill

```text
skills/course-factory/
```

Use the local copy when working inside this repository. It can evolve with the
framework without requiring a global reinstall.

### Global skill

```text
/Users/jensu/.codex/skills/course-factory/
```

The global copy makes the skill discoverable in Codex sessions even when the
current workspace is a different repository.

## Skill Structure

```text
course-factory/
  SKILL.md
  references/
    curriculum-prompt.md
    coding-agent-prompt.md
    framework-contract.md
  templates/
    curriculum.json
  agents/
    openai.yaml
```

### `SKILL.md`

The main entrypoint. It contains:

- when the skill should be used;
- repository checks;
- the required workflow;
- allowed and prohibited changes;
- the canonical stop condition.

### `references/curriculum-prompt.md`

Used when the user has a topic but no curriculum yet. It guides curriculum
creation and forces human review before course generation.

### `references/coding-agent-prompt.md`

Used after an approved `curriculum.json` exists. It defines the fresh-session
coding-agent prompt, construction workflow, and failure policy.

### `references/framework-contract.md`

Defines:

- required repository artifacts;
- main commands;
- generated course output;
- deterministic publishing;
- GitHub Pages deployment;
- maintenance rules.

### `templates/curriculum.json`

A valid starter contract for one module and one checkpoint. Use it as the
format reference for new courses.

### `agents/openai.yaml`

Provides UI metadata and enables automatic skill discovery.

## Installation

### Option 1 — Use the project-local skill

If you are inside this repository, no installation is required. The skill is
stored at:

```text
skills/course-factory
```

Invoke it by name:

```text
Use $course-factory to build my course.
```

### Option 2 — Install globally for the current user

From the repository root, run:

```bash
mkdir -p "$HOME/.codex/skills"
cp -R skills/course-factory "$HOME/.codex/skills/course-factory"
```

If the destination already exists and you want to replace it, back it up first,
then update the directory intentionally.

### Verify installation

Check that the required files exist:

```bash
test -f "$HOME/.codex/skills/course-factory/SKILL.md"
test -f "$HOME/.codex/skills/course-factory/templates/curriculum.json"
```

Then start a new Codex session or refresh the skill list and confirm that
`course-factory` is available.

## How To Use It

Use the skill when you want to:

- turn a topic into a curriculum;
- generate a new static course;
- enrich a generated course;
- add permitted components, datasets, or content;
- validate a course;
- prepare a deployment;
- maintain a previously generated course.

Do not use it for:

- unrelated web applications;
- projects that do not contain this framework;
- modifying the player core;
- bypassing validation gates.

## How It Works

The skill operates in two phases.

### Phase 1 — Curriculum Design

The skill first checks whether a curriculum exists.

If it does not, the agent:

1. gathers topic, audience, goal, depth, duration, and optional assets;
2. creates only `curriculum.json`;
3. asks the user to review and approve it.

The skill intentionally stops before course generation at this point.

### Phase 2 — Course Construction

After approval, the agent:

1. validates the curriculum;
2. generates the starter course:

   ```bash
   node template/scripts/course-factory.js curriculum.json
   ```

3. enriches only permitted course files;
4. runs the canonical validation pipeline:

   ```bash
   node template/scripts/agent-run.js
   ```

5. fixes generated course issues—not framework rules;
6. stops only when:

   ```json
   {
     "status": "success"
   }
   ```

   appears in:

   ```text
   template/tests/generated/agent-run.json
   ```

## Basic Usage

### Use Case 1 — “I have a topic”

Prompt:

```text
Use $course-factory to create a curriculum for a beginner course on sustainable home energy.
```

Expected behavior:

- the skill gathers the course brief;
- it creates `curriculum.json`;
- it asks for review before building the course.

### Use Case 2 — “I have curriculum.json”

Prompt:

```text
Use $course-factory to build a complete validated course from curriculum.json.
```

Expected behavior:

- the starter course is generated;
- permitted files are enriched as needed;
- the canonical pipeline runs;
- the task stops only on success.

### Use Case 3 — “Validate or repair a generated course”

Prompt:

```text
Use $course-factory to run the canonical pipeline and fix any generated-course failures.
```

Expected behavior:

- `agent-run.js` is executed;
- failures are fixed only in generated course files or permitted assets;
- framework tests and rules are not weakened.

## Required Inputs

Minimum input:

```text
topic
audience
course goal
```

Useful additional input:

- desired module count;
- depth;
- tone;
- final assessment preference;
- datasets;
- media;
- examples;
- accessibility requirements;
- existing curriculum or learning outcomes.

## Output Artifacts

After successful use, the repository may contain:

```text
curriculum.json
courses/<course-id>/
  course-manifest.json
  index.html
  content/<module-id>.md
courses.yaml
template/tests/generated/course-factory-report.json
template/tests/generated/agent-run.json
dist/
```

The exact content depends on the generated course and enrichment scope.

## Skill Safety Rules

The skill requires the coding agent to respect the framework contract.

### Allowed work

The agent may change:

- `curriculum.json`;
- generated course content;
- declared assets and datasets;
- declared custom components;
- generated expected-answer data;
- generated build output.

### Prohibited work

The agent must not modify:

- player core;
- vendor libraries;
- progress semantics;
- certificate gating;
- validation gates;
- framework tests except generated expected-answer data;
- `dist/` by hand.

## Validation Contract

The canonical pipeline enforces:

1. manifest compiler synchronization;
2. manifest schema fixtures;
3. course factory behavior;
4. catalog compilation;
5. course validation;
6. unit tests;
7. headless course walkthrough;
8. production checks;
9. multi-course validation;
10. catalog determinism;
11. deterministic publishing;
12. publish verification;
13. accessibility readiness;
14. release readiness.

A course is complete only when every gate reports `passed`.

## Deployment Handoff

The skill does not manually publish files. It prepares the framework's verified
distribution and leaves deployment to the existing workflow.

Deployed catalog:

```text
/courses.html
```

Course route:

```text
/courses/<course-id>/
```

GitHub Pages deployment occurs through:

```text
.github/workflows/deploy-pages.yml
```

## Limitations of v1

Skill v1 is intentionally focused and does not:

- automatically deploy to external hosting;
- bypass human curriculum review;
- create framework features;
- redesign the player;
- weaken accessibility or release gates;
- turn every arbitrary topic brief into a full course without validation.

## Troubleshooting

### The skill is not visible

Confirm the repository contract:

```text
template/scripts/course-factory.js
template/scripts/agent-run.js
```

If either file is missing, the skill intentionally does not activate.

### The agent tries to modify framework internals

Stop the task and point it back to the prohibited file list in `SKILL.md`.

### A validation gate fails

Read:

```text
template/tests/generated/agent-run.json
```

Fix the generated course, curriculum input, or declared asset. Rerun:

```bash
node template/scripts/agent-run.js
```

### The curriculum was generated but the course was not

This is expected. The skill requires explicit curriculum approval before
generation.

## v1 Completion Checklist

- Skill entrypoint exists.
- Curriculum prompt reference exists.
- Coding-agent prompt reference exists.
- Framework contract reference exists.
- Curriculum template is valid JSON.
- Local and global copies are installed.
- Skill is discoverable in Codex.
- Canonical framework pipeline passes.
- Skill is indexed in graphify.
