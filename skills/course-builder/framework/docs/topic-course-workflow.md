# Topic-to-Course End-to-End Workflow

This document explains how to use the topic-agnostic framework with an AI
assistant for curriculum design and a coding agent for course construction.
It is the operational companion to `docs/zero-to-final-guide.md`.

## Objective Evaluation

The intended objective is sound:

- **Curriculum design benefits from AI assistance.** AI can propose outcomes,
  module sequencing, prerequisites, examples, checkpoints, and misconceptions
  quickly.
- **Course construction benefits from a coding agent.** A coding agent can turn
  the curriculum into manifests, Markdown content, component declarations,
  datasets, tests, and validation reports.
- **The framework should remain deterministic.** Once a curriculum contract
  exists, generation, validation, publishing, and deployment must be controlled
  by the framework rather than ad-hoc agent behavior.

The key risk is treating the coding agent as an unrestricted application
developer. Without boundaries, it may modify the player core, vendor libraries,
progress semantics, certificate rules, or tests. The current framework already
prevents this through `AGENT.md`, manifest validation, and the canonical agent
pipeline.

## Recommendation

Use a **hybrid production model**:

1. **AI assistant:** design and refine the curriculum with a human owner.
2. **Curriculum contract:** encode the approved curriculum as JSON.
3. **Deterministic factory:** generate the starter course and catalog entry.
4. **Coding agent:** enrich generated content and permitted components only.
5. **Framework gates:** validate, publish, and deploy without agent discretion.

This gives the project flexibility where creativity matters and determinism
where correctness matters.

## Pipeline

### Stage 1 — Define the course

The course owner defines:

- Topic and audience.
- Learning outcomes.
- Existing knowledge and misconceptions.
- Module outline.
- Optional datasets, media, and exercises.

The AI assistant can propose:

- Prerequisite map.
- Stable objective IDs.
- Module sequence.
- Teaching examples.
- Checkpoint questions.
- Misconceptions and remediation.

The course owner must review these outputs. Curriculum quality is a human
decision, not an automation problem.

### Stage 2 — Normalize the curriculum

The AI assistant or coding agent converts the reviewed curriculum into the
factory contract:

```json
{
  "schemaVersion": 1,
  "course": {
    "id": "course-id",
    "name": "Course Name",
    "version": "v1.0"
  },
  "modules": [
    {
      "id": "M1",
      "short": "Module title",
      "objectives": [
        { "id": "objective-id", "text": "Learner can do X." }
      ],
      "checkpoint": {
        "id": "checkpoint-id",
        "q": "Question?",
        "options": ["Wrong", "Correct"],
        "answer": 1,
        "explanation": "Why the correct answer matters."
      }
    }
  ],
  "finalQuizHost": null
}
```

Rules:

- Course IDs must be route-safe.
- Module and objective IDs should remain stable.
- Every objective must be measurable.
- Every module needs a valid checkpoint.
- Optional final assessment should be identified before generation.

### Stage 3 — Generate the starter course

Run:

```bash
node template/scripts/course-factory.js curriculum.json
```

The factory:

1. Validates the input curriculum.
2. Builds the course manifest.
3. Copies the reusable runtime.
4. Generates module content.
5. Registers the course in `courses.yaml`.
6. Writes a machine-readable factory report.

This output is intentionally a deterministic baseline, not the final learning
experience.

### Stage 4 — Enrich the course

The coding agent may now improve generated files:

- Expand module Markdown into complete lessons.
- Add quizzes, media, flashcards, and review packs.
- Select built-in components.
- Add datasets and domain packages only when required.
- Add a custom component only if built-ins cannot meet a curriculum need.
- Keep the expected-answer map synchronized.

The coding agent must not modify:

- player core;
- vendor libraries;
- progress and certificate semantics;
- validation gates;
- framework tests except generated expected-answer data;
- generated `dist/` output.

### Stage 5 — Run the canonical gate

Run:

```bash
node template/scripts/agent-run.js
```

This runs all 14 framework gates, including:

1. Manifest compiler check.
2. Manifest schema fixtures.
3. Course factory tests.
4. Catalog compiler.
5. Course validation.
6. Unit tests.
7. Headless course walkthrough.
8. Production checks.
9. Multi-course validation.
10. Catalog determinism.
11. Deterministic publishing.
12. Publish verification.
13. Accessibility readiness.
14. Release readiness.

The course is not final until every step passes.

### Stage 6 — Publish and deploy

The pipeline creates `dist/`, checksums every file, and verifies the published
catalog. The hosted deployment workflow then publishes the verified `dist/`
directory to GitHub Pages.

## Mockup Topic: Sustainable Home Energy

This example shows how the same pipeline applies to any topic.

### Stage 1 output

- **Topic:** Sustainable Home Energy.
- **Audience:** Homeowners who want practical energy-saving decisions.
- **Outcomes:**
  1. Interpret a home electricity bill.
  2. Compare appliance energy use.
  3. Prioritize cost-effective upgrades.
  4. Estimate solar savings.

### Stage 2 output

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
        "explanation": "A kilowatt-hour combines power and duration, which is why bills use it."
      }
    },
    {
      "id": "M2",
      "short": "Find Hidden Loads",
      "objectives": [
        {
          "id": "energy-standby-loads",
          "text": "Identify common standby electricity loads in a home."
        }
      ],
      "checkpoint": {
        "id": "m2-standby",
        "q": "What is a standby load?",
        "options": [
          "Power used while a device waits for activation",
          "Power used only during active operation",
          "Power stored inside a battery"
        ],
        "answer": 0,
        "explanation": "Standby load is continuous waiting power, so small amounts accumulate daily."
      }
    },
    {
      "id": "M3",
      "short": "Prioritize Upgrades",
      "objectives": [
        {
          "id": "energy-cost-benefit",
          "text": "Rank home energy upgrades by savings and payback period."
        }
      ],
      "checkpoint": {
        "id": "m3-payback",
        "q": "What does simple payback period estimate?",
        "options": [
          "Time for savings to recover the investment",
          "Total lifetime equipment quality",
          "Monthly financing interest"
        ],
        "answer": 0,
        "explanation": "Payback compares an upfront cost against expected periodic savings."
      }
    }
  ],
  "finalQuizHost": null
}
```

### Stage 3 output

After running the factory, the project contains:

```text
courses/sustainable-home-energy/
  course-manifest.json
  index.html
  content/M1.md
  content/M2.md
  content/M3.md
```

`courses.yaml` also gains:

```yaml
  - id: sustainable-home-energy
    name: Sustainable Home Energy
    version: v1.0
    manifest: courses/sustainable-home-energy/course-manifest.json
    route: courses/sustainable-home-energy/index.html
```

### Stage 4 enrichment

The coding agent enriches each generated module:

- Add a diagram of the customer-versus-supplier charge split.
- Add a chart comparing appliance consumption.
- Add flashcards for key terms.
- Add a review pack for payback calculations.
- Add a deterministic calculator component if the built-in lab cannot express it.

The course then becomes a complete learner experience while the framework and
player remain unchanged.

### Stage 5 validation

The canonical pipeline verifies:

- all three modules render;
- every checkpoint works;
- objectives map to checkpoints;
- the full learner path completes headlessly;
- the certificate gate behaves correctly;
- no runtime network dependency exists;
- responsive and accessibility checks pass;
- the course and catalog agree;
- publication is deterministic and checksum-verified.

### Stage 6 final output

The deployed catalog includes the new course:

```text
/courses.html
/courses/sustainable-home-energy/
```

The learner can complete the course entirely in the browser without an account
or backend.
