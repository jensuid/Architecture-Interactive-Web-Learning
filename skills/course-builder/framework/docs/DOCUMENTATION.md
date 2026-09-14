# Course Factory Documentation Index

This index maps the project's user, technical, portable-skill, and maintenance
documentation to the task you are trying to complete.

## Start Here

Read these first if you are creating your first course:

1. [New Course Session Handoff](../START-HERE.md) — orientation and a reusable prompt for a fresh agent session.
2. [Framework README](../template/README.md) — course structure, commands, and content contract.
3. [Topic Course Workflow](topic-course-workflow.md) — step-by-step course-authoring workflow.
4. [User Guide](USER-GUIDE.md) — complete reference for the current framework.

## User Guides

- [General User Guide](USER-GUIDE.md) — build, validate, publish, and troubleshoot a static course.
- [Course Factory Skill Guide](course-factory-skill-guide.md) — use the locally installed `course-factory` skill safely.
- [Agent and Curriculum Prompts](agent-and-curriculum-prompts.md) — reusable prompts for curriculum planning and course enrichment.
- [Deployment Guide](DEPLOYMENT.md) — deploy the generated static `dist/` site to a static host.

## Technical Reference

- [Architecture Proposal](../Proposed-Architecture.md) — target architecture, contracts, and design principles.
- [Framework Architecture](../template/ARCHITECTURE.md) — layers, compilation, runtime behavior, and validation model.
- [Framework README](../template/README.md) — canonical runtime structure and technical content contract.
- [Zero to Final Guide](zero-to-final-guide.md) — detailed path from initialization through final release.
- [Framework Release Notes](../notes/release-notes.md) — completed framework release capabilities and validation baseline.

## Portable Skill

Use the portable skill when working outside this repository:

- [Portable Skill README](../skills/course-builder/README.md) — package overview, initializer, packaging, and validation commands.
- [Portable Skill Contract](../skills/course-builder/SKILL.md) — agent-facing boundaries and required workflow.
- [Portable User Guide](../skills/course-builder/references/user-guide.md) — complete installation, initialization, authoring, publishing, and troubleshooting guide.
- [Portable Framework Contract](../skills/course-builder/references/framework-contract.md) — runtime files, generated output, and release rules.
- [Curriculum Prompt](../skills/course-builder/references/curriculum-prompt.md) — curriculum input template and prompt.
- [Coding Agent Prompt](../skills/course-builder/references/coding-agent-prompt.md) — course enrichment and coding-agent rules.
- [Mockup Topic Walkthrough](../skills/course-builder/references/mockup-topic-walkthrough.md) — complete concrete end-to-end example.

## Maintenance And Release

- [Portable Stage And Release Checklist](../notes/portability/plan-proposed.md) — completed portability stages and remaining release gates.
- [Framework Release Notes](../notes/release-notes.md) — versioned release summary.

## Essential Commands

Validate the canonical framework and portable package:

```bash
node template/scripts/agent-run.js
node skills/course-builder/scripts/package.js --check
node skills/course-builder/scripts/validate.js
```

Initialize and validate an empty destination repository:

```bash
node skills/course-builder/scripts/init.js \
  --target /absolute/path/to/destination \
  --install \
  --validate
```

Publish and verify a static distribution:

```bash
node template/scripts/verify-publish.js
```

## Documentation Rules

- Treat `template/` as the only canonical runtime.
- Do not manually edit `skills/course-builder/framework/`.
- Rebuild the portable framework with `skills/course-builder/scripts/package.js`.
- Never weaken a validation rule to make a course pass.
- Never hand-edit generated `dist/` output.
