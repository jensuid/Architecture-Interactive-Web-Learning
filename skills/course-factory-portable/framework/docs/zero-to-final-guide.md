# Zero-to-Final Course Guide

This guide connects the project's planning, authoring, generation, validation,
publishing, and deployment documents into one workflow. Use it when creating a
new course from no prior project knowledge through a deployed static course.

## Documentation Path

Read these files before making changes:

1. `START-HERE.md` — project entry point and handoff context.
2. `Proposed-Architecture.md` — target architecture and boundaries.
3. `AGENT.md` — allowed files, forbidden files, and quality gates.
4. `template/ARCHITECTURE.md` — runtime architecture.
5. `template/README.md` — course instantiation and content contract.
6. `docs/DEPLOYMENT.md` — local preflight and GitHub Pages deployment.

The source of truth is the generated course manifest, synchronized with the
authoritative catalog and content. Never bypass a validation gate.

## 1. Start With a Course Plan

Prepare the following before creating files:

- Course topic and audience.
- Course ID, name, and semantic version.
- One or more modules, each with a short title.
- Stable objective IDs and measurable objective text.
- A checkpoint question for every module.
- Optional final-assessment module and assets or datasets.

Use route-safe IDs such as `architecture-basics` and `M1`. Keep IDs stable after
publication because progress, checkpoints, and reports depend on them.

## 2. Choose a Creation Path

### Recommended end-to-end workflow

Use the deterministic factory for the first complete draft, then use a coding
agent only inside the allowed generated-course layers. This keeps curriculum
design flexible while preserving the framework's deterministic compiler,
validation, publishing, and deployment boundaries.

1. Define the topic, audience, learning outcomes, module outline, and optional
   assets with an AI assistant or coding agent.
2. Review and normalize the curriculum into the factory's JSON contract.
3. Generate the starter course with the course factory.
4. Use a coding agent to deepen module content, add components, datasets, and
   custom domain behavior only when built-ins are insufficient.
5. Run the canonical validation pipeline.
6. Publish and deploy the checksum-verified static distribution.

### Option A — Deterministic course factory

Use this path for a generated starter course from a curriculum.

1. Create a curriculum JSON input. Refer to:

   ```text
   template/tests/fixtures/course-factory/curriculum.json
   ```

2. Generate the course:

   ```bash
   node template/scripts/course-factory.js <curriculum.json>
   ```

3. Confirm the factory reports `status: "success"`.

The factory creates a course under `courses/<course-id>/`, generates the
manifest and module content, and registers the course in `courses.yaml`.
The generated report is:

```text
template/tests/generated/course-factory-report.json
```

### Option B — Manual template instantiation

Use this path when you need full control over authoring and components.

1. Copy the reusable runtime structure from `template/app/`.
2. Keep generated content under the course's `content/` directory.
3. Author `course.yaml` as the authoritative structure.
4. Compile the course manifest:

   ```bash
   node template/scripts/compile-course.js
   ```

5. Register the course in `courses.yaml`.
6. Compile and validate the catalog:

   ```bash
   node template/scripts/compile-catalog.js
   node template/scripts/validate-courses.js
   ```

Refer to `template/README.md` for the exact content contract, quiz syntax,
media rules, flashcards, labs, and common gotchas.

## 3. Author Course Content

Create one Markdown file per module and, if needed, a final-assessment file.

Follow the template content contract:

- Use `##` headings for module sections.
- Use `---` on its own line to split slides.
- Use the supported fenced blocks for quizzes, media, flashcards, and labs.
- Use zero-based answer indexes in quizzes.
- Keep media paths course-relative.
- Prefer built-in components before creating custom components.
- Keep generated expected-answer data synchronized with quiz content.

Do not modify the player core, vendor libraries, progress semantics,
certificate gating, or validation gates to make a course pass.

## 4. Run the Full Validation Pipeline

Run the canonical pipeline from the repository root:

```bash
node template/scripts/agent-run.js
```

This command runs all 14 release gates, including:

- manifest compiler check;
- schema fixtures;
- course factory;
- catalog compilation;
- course validation;
- unit tests;
- headless course walkthrough;
- production readiness;
- multi-course validation;
- catalog determinism;
- deterministic publishing;
- publish verification;
- accessibility readiness;
- release readiness.

The machine-readable report is:

```text
template/tests/generated/agent-run.json
```

A course is complete only when every gate reports `"passed"` and the overall
report status is `"success"`.

If a gate fails, fix the generated course or curriculum and rerun the pipeline.
Do not weaken a test or modify framework internals to make validation pass.

## 5. Review the Publish Output

The validation pipeline creates the checksum-verified static distribution:

```text
dist/
```

The deployed catalog is:

```text
dist/courses.html
```

Each course is published under an isolated route:

```text
dist/courses/<course-id>/
```

Never hand-edit `dist/`. Regenerate it by running the pipeline or publisher.
The publisher and verifier keep every file checksum traceable.

## 6. Deploy With GitHub Pages

### One-time repository setup

1. Open the GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Save the setting.

### Publish

Push to `main`, `master`, or a `v*` tag, or run the **Deploy Interactive
Courses** workflow manually. The workflow:

1. Runs the full validation pipeline first.
2. Publishes only the checksum-verified `dist/` directory.
3. Places the catalog at `/courses.html`.
4. Serves each course from `/courses/<course-id>/`.

Continuous integration also runs on pull requests, default-branch pushes,
release tags, and manual dispatch.

## 7. Maintain a Published Course

When updating a course:

1. Change the curriculum, manifest, or content—not the generated `dist/` files.
2. Keep IDs stable unless you intentionally create a new course.
3. Apply semantics versioning to the course version and release notes.
4. Rerun:

   ```bash
   node template/scripts/agent-run.js
   ```

5. Verify the report status is still `success`.
6. Commit the source and generated metadata, then push to trigger deployment.

## Completion Checklist

- Curriculum is valid.
- Course ID, name, version, manifest, and catalog agree.
- Every module has stable objectives and a checkpoint.
- All content follows the template contract.
- `node template/scripts/agent-run.js` reports `status: "success"`.
- Accessibility, responsive, network-hermetic, and release gates pass.
- `dist/` was generated and verified by the pipeline.
- GitHub Pages is configured for GitHub Actions deployment.
- The deployed catalog and course URLs load successfully.
