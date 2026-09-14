# Coding Agent Prompt

Use this prompt in a fresh agent session after `curriculum.json` exists and has been approved.

```text
Read these files before making any change:
1. AGENT.md
2. docs/zero-to-final-guide.md
3. docs/topic-course-workflow.md
4. Proposed-Architecture.md
5. template/ARCHITECTURE.md
6. template/README.md

Goal:
Construct a complete static interactive course from curriculum.json.

Required workflow:
1. Validate curriculum.json.
2. Generate the starter course:
   node template/scripts/course-factory.js curriculum.json
3. Enrich only generated course content, declared assets, datasets,
   permitted components, and generated expected-answer data.
4. Prefer built-in components. Add custom components only if a curriculum
   need cannot be met otherwise.
5. Keep course, module, objective, and checkpoint IDs stable.
6. Do not modify player core, vendor libraries, progress semantics,
   certificate gating, validation gates, or framework tests.
7. Do not hand-edit dist/.
8. Run the canonical pipeline until every gate passes:
   node template/scripts/agent-run.js
9. Report:
   - files changed;
   - validation result;
   - any failed gate and how it was fixed;
   - final agent-run report location.

Stop condition:
The task is complete only when agent-run.json reports status: "success".
```

## Failure Policy

If a gate fails:

1. Read the relevant output from `template/tests/generated/agent-run.json`.
2. Fix the generated course, curriculum input, declared asset, or permitted component.
3. Rerun `node template/scripts/agent-run.js`.
4. Never weaken a validation rule or edit framework internals to make a course pass.
