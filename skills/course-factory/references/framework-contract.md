# Framework Contract

## Required Repository Artifacts

The target repository should contain:

```text
AGENT.md
courses.yaml
course.yaml
docs/DEPLOYMENT.md
docs/zero-to-final-guide.md
docs/topic-course-workflow.md
template/ARCHITECTURE.md
template/README.md
template/scripts/course-factory.js
template/scripts/agent-run.js
template/tests/fixtures/course-factory/curriculum.json
```

## Main Commands

Generate a starter course:

```bash
node template/scripts/course-factory.js curriculum.json
```

Run all validation, publishing, accessibility, and release gates:

```bash
node template/scripts/agent-run.js
```

The final report is:

```text
template/tests/generated/agent-run.json
```

## Output Contract

The factory creates:

```text
courses/<course-id>/
  course-manifest.json
  index.html
  content/<module-id>.md
```

It also registers the course in `courses.yaml`.

The canonical pipeline creates a checksum-verified static distribution:

```text
dist/
```

Do not edit `dist/` directly. Regenerate it with the pipeline.

## Publishing

GitHub Pages deploys only after all validation gates pass. Configure the repository’s Pages provider to GitHub Actions, then push to `main`, `master`, or a `v*` tag, or run the deployment workflow manually.

The deployed catalog starts at:

```text
/courses.html
```

Each course is served from:

```text
/courses/<course-id>/
```

## Maintenance Rules

- Keep course, module, objective, and checkpoint IDs stable after publication.
- Regenerate `dist/`; never hand-edit it.
- Keep manifests, catalog entries, content, and expected-answer data synchronized.
- Use semantic course versions and enforced release notes.
- Preserve course-scoped learner storage.
- Do not introduce runtime network dependencies.
