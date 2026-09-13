# Course Agent Contract

## Agent Objective

Given a topic and curriculum, produce a complete interactive static course
without modifying framework internals.

## Required Reading

Before changing files, read:

1. `Proposed-Architecture.md`
2. `template/ARCHITECTURE.md`
3. `template/README.md`

## Source of Truth

`course.yaml` is the authoritative course structure. Generated content and
tests must stay synchronized with it.

## Allowed Files

Agents may create or modify:

- `course.yaml`;
- `content/`;
- `assets/`;
- `data/`;
- declared custom components;
- declared domain packages;
- generated tests;
 - generated build output;
- the agent run report.

## Forbidden Files

Agents may not modify:

- player core;
- vendor libraries;
- progress and certificate semantics;
- validation gates;
- framework tests except generated expected-answer data.

## Required Workflow

1. Validate the supplied topic and curriculum.
2. Generate `course.yaml`.
3. Generate module and assessment content.
4. Prefer built-in components.
5. Generate custom components only when a curriculum need cannot be met.
6. Generate the expected-answer map and tests.
7. Run:

   ```bash
   node template/scripts/agent-run.js
   ```

8. Produce a machine-readable agent run report.

## Progress Updates

- Report meaningful progress approximately every 3 minutes during long-running generation or validation, adjusting timing when useful.
- Keep each update concise: completed work, current step, next validation gate.
- Do not stop work for transient transport warnings; continue from disk state.

## Quality Gates

A course is complete only when:

- the manifest validates;
- every module route renders;
- every component usage mounts;
- the full course completes headlessly;
- certificate requirements work correctly;
- runtime remains network-hermetic;
- accessibility checks pass.

## Failure Policy

Never weaken a validation rule or test to make generation succeed. If a gate
fails, report the failure, fix the generated course, and rerun validation.

## Generated Work Policy

- Mark generated assets and datasets explicitly.
- Keep IDs stable once published.
- Avoid changing progress semantics.
- Preserve first-attempt checkpoint scoring.
- Do not hardcode topic metadata into player code.
- Preserve course-scoped progress, flashcard, and theme storage keys.
- Keep `courses.yaml`, course manifests, and generated catalog JSON synchronized.
- Never hand-edit `dist/`; regenerate it with `scripts/publish.js`.
