# Topic-Agnostic Interactive Course Framework

## Status

Design proposal for the next major version. The current template remains the
working runtime while this architecture is introduced in phases.

## Current Architecture Assessment

The current platform is already strong as a static course runtime:

- markdown-defined course content;
- extract-before-parse rendering;
- guided, read, and presentation modes;
- quizzes, practice checks, flashcards, confidence reflection, and review packs;
- first-attempt progress tracking and certificate gating;
- a declarative component registry;
- a zero-backend, privacy-preserving learner experience;
- unit and network-hermetic headless DOM verification.

The main limitation is instantiation. A topic owner or coding agent must edit
`shell.js` to register modules and final-assessment behavior, author content,
optionally add an engine or lab, and keep test data synchronized by hand. The
course is content-driven, but its structure is not canonical.

## Target Principle

> Input: topic and curriculum.  
> Framework: compiler and player.  
> Output: a complete static interactive course.

The next version should use a **hybrid architecture**:

1. Keep the proven static runtime.
2. Add a deterministic build-time course compiler.
3. Make a versioned course manifest the single source of truth.
4. Restrict coding agents to generated layers and explicitly permitted files.

## Target Layers

```text
Input layer
  topic, curriculum, preferences, and optional assets

Agent layer
  curriculum planning, content generation, component selection,
  optional domain-package design, and validation orchestration

Course compiler
  schema validation, curriculum normalization, content generation,
  route generation, test generation, and asset verification

Static course
  generated manifest, generated content, player, generic components,
  optional domain engine, and optional custom components

Verification layer
  schema checks, content linting, unit tests, headless walkthrough,
  accessibility checks, and completion validation
```

Dependencies must flow downward. The player may not know a topic. Content and
components may not mutate player internals. Agents may not modify the player
core to add a course capability.

## Course Manifest Contract

`course.yaml` is the authoritative course description. It becomes the runtime
course structure after compilation.

The initial runtime-compatible subset is:

```yaml
schemaVersion: 1
course:
  id: learning-platform-template
  name: Your Course Name
  version: v2.0
modules:
  - id: M1
    short: Getting started
  - id: M2
    short: Content blocks
  - id: M3
    short: Media & math
  - id: final-assessment
    short: Final
finalQuizHost: M3
```

The full target manifest will also describe:

- course branding and language;
- learner policy and ordered completion;
- objectives, summaries, and estimated duration per module;
- checkpoint, practice, and final assessment requirements;
- flashcards and media;
- datasets;
- generic and custom component declarations;
- optional domain-engine capabilities;
- agent generation policy;
- validation requirements and output configuration.

## Manifest Validation Rules

The Phase 1 validator enforces:

- `schemaVersion` is exactly `1`;
- course ID, name, and version are present;
- at least one module exists;
- module IDs are unique;
- module IDs contain only safe route characters;
- every module has a nonempty short label;
- `final-assessment` is last, if present;
- `finalQuizHost` is null or an existing module ID;
- module content files exist;
- referenced data files exist.

## Component Plugin Contract

New interactive capabilities—diagrams, timelines, concept maps, simulators,
and similar components—are added through the component registry.

A component declaration provides:

```yaml
components:
  custom:
    - id: diagram
      name: Diagram Viewer
      entry: components/diagram.js
      inputs:
        - id: format
          type: enum
          values: [svg, mermaid, graphviz]
          required: true
```

Content references a component declaratively:

````markdown
```interactive
component: diagram
format: mermaid
source: diagrams/architecture.txt
```
````

The runtime mount contract remains:

```text
mount(holder, config, context)
```

`context` exposes only framework services such as module ID, router, progress,
datasets, theme, locale, and component registry. Components never access
framework internals directly. Invalid component configuration must render a
visible error and must never crash a route.

The player core is not modified to support a new component. The player knows
only that a content block references a registered component.

## Agent Contract

### Inputs

The agent receives:

- a topic;
- a curriculum, outline, or learning objectives;
- optional preferences, assets, datasets, and prior course state.

### Required Workflow

1. Read `AGENT.md` and the architecture specification.
2. Normalize the curriculum and infer required capabilities.
3. Generate or update `course.yaml`.
4. Generate module and assessment material.
5. Prefer generic components; generate custom components only when necessary.
6. Generate or update tests and the expected-answer map from the manifest/content.
7. Run schema, content, unit, and headless validation.
8. Deliver the static course and a validation report.

### Allowed Changes

- `course.yaml`
- generated content
- generated tests
- declared assets and datasets
- declared domain packages
- declared custom components
- generated build output

### Forbidden Changes

- player core;
- vendor libraries;
- progress semantics;
- certificate gating rules;
- framework validation gates;
- tests merely to make an invalid course pass.

### Required Validation

A generated course is complete only when:

- manifest schema validation passes;
- all module routes render;
- all component mounts have smoke coverage;
- the headless learner completes every required checkpoint;
- the certificate unlocks when requirements are met;
- no runtime network dependency is introduced;
- accessibility and responsive checks pass.

## Phased Implementation

### Phase 1 — Manifest-Driven Runtime

- Add `course.yaml`.
- Add a manifest validator.
- Generate runtime metadata from the manifest.
- Remove topic metadata and module registration from `shell.js`.
- Make navigation, progress, and final-assessment logic manifest-driven.
- Preserve existing player behavior.
- Add manifest and regression tests.

### Phase 2 — Course Compiler

- Add a deterministic compiler for content, routes, and runtime manifest.
- Generate expected-answer maps.
- Validate fenced blocks and asset references.
- Produce deterministic static output.

### Phase 3 — Component Ecosystem

- Formalize the component interface and context services.
- Add generic diagram, timeline, concept-map, and comparison components.
- Add component smoke and accessibility tests.
- Keep custom components isolated and declaratively registered.

### Phase 4 — Domain Packages

- Add pure domain-engine contracts for quantitative or simulation-heavy courses.
- Separate domain logic from component presentation.
- Add deterministic dataset generation and unit tests.

### Phase 5 — Agent Automation

- Add an agent entrypoint and machine-readable run report.
- Automate curriculum-to-manifest generation.
- Automate content, test, and QA report generation.
- Enforce the agent contract in CI.

### Phase 6 — Accessibility and Production Quality

- Add keyboard, screen-reader, contrast, and media fallback checks.
- Add performance budgets.
- Add responsive layout verification.
- Produce a production readiness report.

## Architecture Decision

Use the hybrid model. It preserves the current platform's zero-backend,
privacy-preserving, static deployment model while making course generation
declarative, reproducible, and safe for any coding agent.
