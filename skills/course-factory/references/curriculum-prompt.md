# Curriculum Generation Prompt

Use this prompt with an AI assistant or coding agent when curriculum input is missing.

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
2. Define 4–20 modules in logical learning order.
3. For each module:
   - module ID;
   - short title;
   - 1–4 measurable learning objectives;
   - key concepts and metal model to teach;
   - practical example or exercise;
   - common misconception and correction;
   - one checkpoint question with 3–4 answer options, one correct answer,
     and an explanation.
4. Identify prerequisites.
5. Recommend a final assessment structure if needed.
6. Keep IDs stable, route-safe, and machine-friendly.
7. Make every objective observable and measurable.
8. Do not write full course content yet.

Return only valid curriculum JSON using the framework contract. Do not modify
the framework or generate the course until the curriculum is approved.
```

## Approval Rule

Do not run the course factory until the user explicitly approves the curriculum. If the user says “create the course” after supplying a topic brief, treat that as approval only if they have already reviewed the proposed curriculum; otherwise request review first.
