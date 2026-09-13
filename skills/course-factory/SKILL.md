---
name: course-factory
description: Build topic-agnostic interactive static courses in repositories containing template/scripts/course-factory.js and template/scripts/agent-run.js. Use for curriculum generation, course construction, enrichment, validation, or deployment handoff; not for unrelated web applications.
metadata:
  short-description: Generate and validate static courses
---

# Course Factory

Turn a topic and curriculum into a complete, validated static interactive course.

## Repository Contract

Use this skill only when the target repository contains both:

```text
template/scripts/course-factory.js
template/scripts/agent-run.js
```

If either is missing, stop and ask for the correct Architecture-Interactive-Web-Learning repository rather than improvising a course framework.

## Workflow

1. Collect the topic, audience, goal, desired depth, module count, and optional assets.
2. If curriculum input is missing, create only `curriculum.json` using the reference prompt, then ask the user to review and approve it.
3. After approval, generate the starter course:

   ```bash
   node template/scripts/course-factory.js curriculum.json
   ```

4. Enrich only generated course content, declared assets, datasets, permitted components, and generated expected-answer data.
5. Run the canonical gate:

   ```bash
   node template/scripts/agent-run.js
   ```

6. Fix the generated course—not the framework—until every gate passes.
7. Stop only after `template/tests/generated/agent-run.json` reports `status: "success"`.

## Boundaries

Never modify:

- player core;
- vendor libraries;
- progress semantics;
- certificate gating;
- validation gates;
- framework tests except generated expected-answer data;
- generated `dist/` output.

Prefer built-in components. Add a custom component only when a curriculum requirement cannot be met otherwise.

## References

- Read `references/curriculum-prompt.md` when designing or validating curriculum input.
- Read `references/coding-agent-prompt.md` when constructing, enriching, or validating a course.
- Read `references/framework-contract.md` for commands, artifacts, publishing, and deployment rules.
- Use `templates/curriculum.json` as the starting curriculum format.
