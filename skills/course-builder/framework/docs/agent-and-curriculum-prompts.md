# Curriculum and Coding Agent Prompts

This guide formalizes the two handoff prompts needed to build a topic-agnostic
interactive course with this framework:

1. an AI-assistant prompt for curriculum generation;
2. a coding-agent prompt for course construction and validation.

Use these prompts together with `docs/zero-to-final-guide.md` and
`docs/topic-course-workflow.md`.

## 1. Curriculum Generation With an AI Assistant

Use the following prompt in a chat AI assistant. It produces a structured
curriculum ready for conversion into `curriculum.json`.

### Prompt

```text
You are an expert instructional designer.

Design a complete, learner-focused curriculum for the following course.

Topic:
[TOPIC]

Audience:
[WHO THEY ARE, CURRENT KNOWLEDGE, GOAL]

Course goal:
[WHAT LEARNERS SHOULD BE ABLE TO DO AFTER FINISHING]

Constraints:
- Duration: [e.g., 6–10 modules]
- Depth: [beginner / intermediate / advanced]
- Assessment style: checkpoint quizzes, final assessment, practical exercises
- Tone: [practical / academic / professional / friendly]
- Optional assets or datasets: [DESCRIBE OR WRITE "none"]

Requirements:
1. Propose a course ID, name, and version.
2. Define 4–10 modules in logical learning order.
3. For each module:
   - module ID;
   - short title;
   - 1–4 measurable learning objectives;
   - key concepts to teach;
   - practical example or exercise;
   - common misconception and correction;
   - one checkpoint question with 3–4 answer options, one correct answer,
     and an explanation.
4. Identify prerequisites.
5. Recommend a final assessment structure if needed.
6. Keep all IDs stable, route-safe, and machine-friendly:
   - lowercase letters, numbers, and hyphens for course ID;
   - simple uppercase module IDs such as M1, M2, M3;
   - descriptive objective IDs such as obj-energy-bill-kwh.
7. Make every objective observable and measurable.
8. Do not write full course content yet.

Output format:
Return only valid JSON using this structure:

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
        {
          "id": "obj-example",
          "text": "Learner can explain or perform a specific measurable action."
        }
      ],
      "checkpoint": {
        "id": "m1-example",
        "q": "Checkpoint question?",
        "options": [
          "Incorrect option",
          "Correct option",
          "Incorrect option"
        ],
        "answer": 1,
        "explanation": "Why the correct answer is correct."
      }
    }
  ],
  "finalQuizHost": null
}

Quality checklist before responding:
- JSON is syntactically valid.
- Every module has at least one objective and one checkpoint.
- Every checkpoint has at least two options.
- Every answer index points to the correct option.
- Objective IDs are unique.
- The module order builds knowledge progressively.
- No module introduces a concept without prerequisite coverage.
```

### Usage Notes

- If you want curriculum review before JSON, add:

  ```text
  First propose a module outline for review. Do not produce JSON until I approve it.
  ```

- If the course needs a final assessment, set `"finalQuizHost"` to the final
  module ID and include a final-assessment module.
- Save the approved output as `curriculum.json`.

## 2. Course Construction With Any Coding Agent

### Files and Artifacts to Provide

Give the coding agent:

| Artifact | Purpose |
|---|---|
| `curriculum.json` | Main input defining course, modules, objectives, and checkpoints. |
| `AGENT.md` | Required agent contract and prohibited changes. |
| `docs/zero-to-final-guide.md` | End-to-end construction, validation, publishing, and deployment workflow. |
| `docs/topic-course-workflow.md` | Detailed topic-to-course pipeline and mockup. |
| `Proposed-Architecture.md` | Target architecture and system boundaries. |
| `template/ARCHITECTURE.md` | Runtime architecture. |
| `template/README.md` | Course instantiation and content contract. |
| `docs/DEPLOYMENT.md` | GitHub Pages deployment contract. |
| `template/tests/fixtures/course-factory/curriculum.json` | Reference curriculum format. |
| `courses/factory-sample-course/` | Reference generated course. |

Also provide optional:

- datasets;
- media and assets;
- domain rules;
- preferred examples;
- assessment requirements;
- accessibility requirements.

### Do Not Provide as Source of Truth

Do not use these as editable source:

- `dist/`;
- `node_modules/`;
- `graphify-out/`;
- generated validation reports.

The coding agent must not modify:

- player core;
- vendor libraries;
- progress semantics;
- certificate gating;
- validation gates;
- framework tests except generated expected-answer data.

### Prompt

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

### If the Curriculum Is Not Ready

Use this initial prompt instead of directly asking for course construction:

```text
Read AGENT.md, docs/topic-course-workflow.md, and
template/tests/fixtures/course-factory/curriculum.json.

Using my topic brief below, create only curriculum.json.
- Define a route-safe course ID.
- Create measurable objectives.
- Create module IDs, short titles, and checkpoint questions.
- Use stable objective and checkpoint IDs.
- Do not modify the framework or generate course files yet.

Topic brief:
[TOPIC]
[AUDIENCE]
[LEARNING OUTCOMES]
[OPTIONAL ASSETS/DATASETS]
```

## 3. Complete Handoff Sequence

1. Use the AI-assistant curriculum prompt.
2. Review and approve the curriculum.
3. Save it as `curriculum.json`.
4. Give the coding agent the files and artifacts listed above.
5. Use the coding-agent prompt.
6. Require `agent-run.json` to report `status: "success"`.
7. Publish through the existing GitHub Pages deployment workflow.
