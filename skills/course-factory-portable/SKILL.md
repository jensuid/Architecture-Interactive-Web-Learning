---
name: course-factory-portable
description: Build topic-agnostic interactive static courses outside the source repository by initializing a packaged course framework and running its unchanged validation pipeline.
metadata:
  short-description: Generate portable static courses
---

# Course Factory Portable

Turn a topic and curriculum into a complete, validated static interactive course
in any destination repository. This skill is self-contained and does not depend
on the Architecture-Interactive-Web-Learning checkout.

## Portable Contract

Use this skill when:

- the destination repository has not yet been initialized for the framework; or
- the destination contains a framework previously initialized by this skill.

Do not use it for unrelated web applications.

## Workflow

1. Validate the skill package before first use:

   ```bash
   node skills/course-factory-portable/scripts/validate.js
   ```

   When the skill is installed elsewhere, replace the path with the installed
   skill path. This command validates skill structure, packaging, the source
   canonical pipeline when available, and a temporary full initialization.

   When maintaining the skill in its source repository, rebuild it only with:

   ```bash
   node skills/course-factory-portable/scripts/package.js
   ```

   Never manually edit `framework/`. The package command regenerates it from
   canonical `template/` and root contracts; `package.js --check` detects
   drift and checksum changes.

2. Initialize a destination repository:

   ```bash
   node skills/course-factory-portable/scripts/init.js \
     --target /absolute/or/relative/destination
   ```

   The initializer copies the runtime, compilers, validation gates, contracts,
   curriculum template, docs, CI, and release-support files into the destination.
   It refuses to overwrite framework paths unless `--force` is explicitly given.
   Dependency installation is opt-in with `--install`.

3. Collect the topic, audience, goal, desired depth, module count, and optional assets.
4. If curriculum input is missing, create only `curriculum.json` using the
   reference prompt, then ask the user to review and approve it.
5. Generate the starting course only after approval:

   ```bash
   node template/scripts/course-factory.js curriculum.json
   ```

6. Enrich only generated course content, declared assets, datasets, permitted
   components, and generated expected-answer data.
7. Run the unchanged canonical gate:

   ```bash
   node template/scripts/agent-run.js
   ```

8. Fix the generated course—not the framework—until every gate passes.
9. Stop only after `template/tests/generated/agent-run.json` reports:

   ```json
   {
     "status": "success"
   }
   ```

## Existing Destinations

When the destination is already initialized, skip initialization and run its
canonical gate directly:

```bash
cd /absolute/or/relative/destination
node template/scripts/agent-run.js
```

Only reinitialize to update the packaged framework, and pass `--force` after
reviewing the destination's framework files.

## Boundaries

Never modify:

- player core;
- vendor libraries;
- progress semantics;
- certificate gating;
- validation gates;
- framework tests except generated expected-answer data;
- generated `dist/` output.

Prefer built-in components. Add a custom component only when a curriculum
requirement cannot be met otherwise.

## Packaging Rules

The portable package must not contain:

- `dist/`;
- `node_modules/`;
- `graphify-out/`;
- generated reports;
- repository history.

Test dependencies are represented by the packaged
`framework/template/tests/package.json` and `package-lock.json`; initialization
installs them with `npm ci`.

## References

- Read `references/curriculum-prompt.md` when designing curriculum input.
- Read `references/coding-agent-prompt.md` when constructing or enriching a course.
- Read `references/framework-contract.md` for course, publishing, and maintenance rules.
- Read `references/user-guide.md` for detailed installation, initialization, authoring,
  validation, publishing, and maintenance instructions.
- Read `references/mockup-topic-walkthrough.md` for a complete, concrete end-to-end mockup topic.
- Read `README.md` for portable installation and command details.
- Use `templates/curriculum.json` as the starting curriculum format.
