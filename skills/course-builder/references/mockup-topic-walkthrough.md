# Course Builder Mockup Topic Walkthrough

This guide builds a complete, concrete mockup topic from beginning to published,
validated course using **Course Builder v2**.

The mockup topic is:

> **Practical Home Solar Sizing**

The walkthrough uses two tools with a strict separation of responsibility:

| Stage | Tool | Responsibility | Stop condition |
| --- | --- | --- | --- |
| Curriculum design | AI assistant chat | Produce reviewable `curriculum.json` only | Human approves the curriculum |
| Implementation | Coding agent | Initialize, generate, enrich, validate, and publish | `agent-run.json` reports `status: "success"` |

The example assumes you are working in a repository that already contains the
`course-builder` skill.

## 1. Define The Learning Brief Before Prompting

Give the AI assistant a complete learning brief before asking it to create any
course structure.

Use this brief as the source of truth for both tools:

- **Topic:** Practical Home Solar Sizing.
- **Audience:** Homeowners.
- **Goal:** Size a residential solar array using 12 months of utility data.
- **Depth:** Beginner-to-intermediate.
- **Module count:** 3.
- **Assessment:** one checkpoint quiz per module.
- **Optional assets:** a bill-image placeholder.
- **Deployment:** a deterministic static course.
- **Working environment:** a destination repository initialized by the portable skill.

The target repository must be empty or a fresh course repository. Do not initialize
over an unrelated course framework.

## 2. AI Assistant: Generate The Curriculum Only

Open your AI assistant chat and use the following prompt verbatim. This prompt is
designed to stop the assistant before implementation work begins.

```text
Use $course-builder to create a curriculum for a beginner-to-intermediate
course called "Practical Home Solar Sizing".

Audience: Homeowners.
Goal: Size a residential solar array using 12 months of utility data.
Depth: Beginner-to-intermediate.
Module count: 3.
Desired outcomes:
1. Use utility bills to establish an annual energy baseline.
2. Estimate solar production from peak sun hours and derate factors.
3. Choose a practical system size based on roof area, budget, and payback.

Required curriculum structure:
- schemaVersion must be 1.
- Create a stable, route-safe course ID.
- Create exactly 3 modules.
- Use one clear learning objective per module.
- Use one checkpoint quiz per module.
- Use zero-based answer indexes.
- Include a short explanation for each correct answer.
- Do not add a final-assessment module.
- Do not generate course files.
- Do not initialize a repository.
- Do not run any commands.
- Do not modify any files.

Output only a ready-to-save curriculum.json and a short review checklist.

After presenting curriculum.json, stop and wait for my approval.
```

The assistant should return only the curriculum contract and review guidance.

## 3. AI Assistant: Save And Review The Curriculum

Create the destination project directory and save the assistant output as:

```text
home-solar-size/curriculum.json
```

Do not run the course factory yet.

Use this review checklist before approving the curriculum:

- The course ID is stable, lowercase, and route-safe.
- Module IDs are simple and stable (`M1`, `M2`, `M3`).
- The module sequence matches the learning order.
- Each objective is concrete and measurable.
- Each checkpoint maps to exactly one objective.
- Each checkpoint has at least two answer options.
- Answer indexes are zero-based and refer to the correct option.
- Explanations state why the answer is correct.
- No final-assessment module is present.
- No user topic-specific content has been embedded in framework files.
- No unexpected assets, datasets, or custom components are declared.

If any item fails, ask the assistant to update only `curriculum.json`.

## 4. AI Assistant: Produce The Coding-Agent Handoff Prompt

After you approve the curriculum, ask the assistant to generate an implementation
handoff prompt. Use this prompt:

```text
I approved curriculum.json for "Practical Home Solar Sizing".

Prepare a concrete handoff prompt for a coding agent that has access to the
course-builder skill and the destination repository.

The prompt must require the coding agent to:
- validate the portable skill;
- initialize the destination only if needed;
- run the course factory exactly once for the approved curriculum;
- enrich only generated course content and permitted assets;
- add the required solar-bill placeholder media;
- run compile-course.js;
- run agent-run.js;
- fix generated course issues, never framework rules;
- publish and verify the static distribution;
- stop only when agent-run.json reports status "success".

Also require:
- no changes to player core;
- no changes to vendor libraries;
- no changes to progress semantics;
- no changes to certificate gating;
- no changes to validation gates;
- no changes to framework tests except generated expected-answer data;
- no hand-editing of dist/.

Return only the handoff prompt I can copy to the coding agent.
```

This produces a fully bounded implementation request.

## 5. Coding Agent: Copy This Handoff Prompt

Paste the following prompt into the coding agent. It is already optimized for the
portable skill and the Practical Home Solar Sizing mockup.

```text
Use $course-builder to build the approved "Practical Home Solar Sizing"
course in the destination repository.

Required files:
- curriculum.json is already approved and must not be redesigned.
- Destination repository: home-solar-size
- Portable skill location: skills/course-builder/

Environment:
- Work from the repository containing the portable skill.
- Use Node.js.
- Run commands with the shell.
- Read no unrelated files.
- Create only course framework output, generated course content, permitted media,
  generated validation state, and generated static distribution.

Required workflow:
1. Validate the portable skill:
   node skills/course-builder/scripts/validate.js

2. Initialize a fresh destination if needed:
   node skills/course-builder/scripts/init.js \
     --target ../home-solar-size \
     --validate \
     --report ../home-solar-size/initialization-report.json

3. Enter the destination:
   cd ../home-solar-size

4. Generate the starter course:
   node template/scripts/course-factory.js curriculum.json

5. Enrich only:
   - courses/practical-home-solar-sizing/content/M1.md
   - courses/practical-home-solar-sizing/content/M2.md
   - courses/practical-home-solar-sizing/content/M3.md
   - courses/practical-home-solar-sizing/content/media/solar-bill.png

6. Add the placeholder image:
   mkdir -p courses/practical-home-solar-sizing/content/media
   cp template/app/content/media/placeholder.png \
     courses/practical-home-solar-sizing/content/media/solar-bill.png

7. Compile generated course state:
   node template/scripts/compile-course.js

8. Run the unchanged canonical gate:
   node template/scripts/agent-run.js

9. Fix the generated course—not the framework—until every gate passes.

10. Publish and verify:
    node template/scripts/publish.js
    node template/scripts/verify-publish.js

11. Stop only when:
    template/tests/generated/agent-run.json
    reports:
    status: "success"

Course details:
- Course ID: practical-home-solar-sizing
- Course name: Practical Home Solar Sizing
- Module 1: Read Your Bill
- Module 2: Estimate Production
- Module 3: Choose System Size
- Objective 1: Explain how monthly kilowatt-hours reveal a home's energy need.
- Objective 2: Use peak sun hours to estimate annual solar production.
- Objective 3: Choose a system size that balances consumption, roof area, and budget.

Content requirements:
- Use the exact approved checkpoint IDs and objective IDs.
- Use concrete example data.
- Include calculations.
- Include comparison tables where useful.
- Include flashcards.
- Keep quiz answers zero-based.
- Prefer built-in components only.
- Do not add a custom component unless a built-in component cannot meet the need.

Allowed changes:
- curriculum.json only if required by a validation failure;
- generated module content under courses/practical-home-solar-sizing/content/;
- course media under courses/practical-home-solar-sizing/content/media/;
- generated expected-answer data;
- generated catalog and course files;
- generated validation state;
- generated dist/ output produced by the publisher.

Forbidden changes:
- player core;
- vendor libraries;
- progress semantics;
- certificate gating;
- validation gates;
- framework tests except generated expected-answer data;
- manually edited dist/ output.

Failure policy:
- Read the failed gate output.
- Inspect the relevant generated course file.
- Fix only the generated course or permitted expected-answer data.
- Rerun compile-course.js if content or objectives changed.
- Rerun agent-run.js until status is "success".
- Never weaken a gate, test, rule, or semantic behavior.

Final report:
- list the generated course paths;
- list the module and media paths;
- report agent-run status;
- report publish verification status;
- state whether all gates passed.
```

## 6. Coding Agent: Understand The Environment

The coding agent works in two locations.

Source repository containing the skill:

```text
/path/to/course-factory
```

Destination repository:

```text
../home-solar-size
```

Expected destination structure after initialization:

```text
home-solar-size/
  curriculum.json
  AGENT.md
  Proposed-Architecture.md
  course.yaml
  courses.yaml
  template/
  docs/
  notes/
  .github/
```

The coding agent must not use the AI assistant to redesign the course while the
pipeline is running.

## 7. Coding Agent: Validate And Initialize

From the source repository, validate the portable skill:

```bash
node skills/course-builder/scripts/validate.js
```

Required result:

```json
{
  "status": "passed"
}
```

Then initialize a fresh destination:

```bash
node skills/course-builder/scripts/init.js \
  --target ../home-solar-size \
  --validate \
  --report ../home-solar-size/initialization-report.json
```

Move into the destination:

```bash
cd ../home-solar-size
```

## 8. Coding Agent: Generate The Starter Course

Run:

```bash
node template/scripts/course-factory.js curriculum.json
```

Expected result:

```json
{
  "status": "success",
  "courseId": "practical-home-solar-sizing",
  "outputRoot": "courses/practical-home-solar-sizing"
}
```

Inspect the generated files before enrichment.

Expected paths:

```text
courses/practical-home-solar-sizing/
  course-manifest.json
  index.html
  courses.html
  courses.json
  content/M1.md
  content/M2.md
  content/M3.md
```

## 9. Coding Agent: Enrich Module 1

Open:

```text
courses/practical-home-solar-sizing/content/M1.md
```

Use the following concrete content:

````markdown
---
title: Read Your Bill
kicker: Module 1 · Energy Baseline
subtitle: Turn one year of utility bills into a practical solar baseline.
---

## Start With Energy, Not Panels

Your first solar number is not a panel count. It is the energy your home already
consumes. Collect the last 12 utility bills and record the **kilowatt-hours
(kWh)** used each month.

A stable baseline answers three questions:

1. How much energy does the home need annually?
2. Which seasons push consumption highest?
3. How much could efficiency measures reduce before you buy hardware?

## Make The Baseline Concrete

Suppose your bills show:

| Month | kWh |
| --- | ---: |
| January | 620 |
| February | 580 |
| March | 540 |
| April | 500 |
| May | 560 |
| June | 710 |
| July | 850 |
| August | 830 |
| September | 700 |
| October | 580 |
| November | 600 |
| December | 680 |

The annual total is:

$$
7{,}770 \text{ kWh/year}
$$

The monthly average is:

$$
\frac{7{,}770}{12} = 647.5 \text{ kWh/month}
$$

Use the average for planning and the highest month as a reality check.

## Read The Bill Like A Solar Designer

A typical bill contains:

- **Energy charge**: the cost of consumed kWh;
- **Fixed charge**: the daily or monthly service fee;
- **Delivery or distribution charge**: sometimes billed separately;
- **Net-metering credit**: energy exported to the grid, where available.

Focus on kWh, not the fixed charge. Panels produce energy, so the fixed monthly
service fee usually remains even after an excellent solar installation.

## Choose The Practical Target

A practical first target is:

- 70–100% of annual kWh if net metering is favorable;
- 50–80% if export compensation is poor;
- a smaller value if budget or roof area is constrained.

For this mockup, use **80%** of `7,770` kWh:

$$
0.80 \times 7{,}770 = 6{,}216 \text{ kWh/year}
$$

## Bill Map

```media
type: image
src: content/media/solar-bill.png
caption: A utility bill is the first solar design document.
```

## Key Terms

```flash
id: solar-bill-kwh
front: Why start with monthly kWh instead of appliance watts?
back: Solar output is energy over time. Monthly kWh matches the unit that the home consumes and that the array must produce.
```

## Checkpoint

```quiz
id: m1-kwh
objectives:
  - solar-bill-kwh
q: Which unit should you use as the starting point for sizing solar?
opts:
  - Monthly kilowatt-hours consumed
  - Peak instantaneous watts in one appliance
  - The utility's fixed monthly charge
answer: 0
expl: Solar production is energy over time, so monthly kWh consumption is the practical sizing baseline.
```
````

Create the required media:

```bash
mkdir -p courses/practical-home-solar-sizing/content/media
cp template/app/content/media/placeholder.png \
  courses/practical-home-solar-sizing/content/media/solar-bill.png
```

## 10. Coding Agent: Enrich Module 2

Open:

```text
courses/practical-home-solar-sizing/content/M2.md
```

Use the following concrete content:

````markdown
---
title: Estimate Production
kicker: Module 2 · Site Output
subtitle: Convert peak sun hours and system size into expected energy.
---

## Understand Peak Sun Hours

A **peak sun hour** is one hour of sunlight at roughly 1,000 watts per square
meter.

A common starting formula is:

$$
E = P_{\text{kW}} \times H_{\text{peak-sun}} \times D
$$

Where:

- $E$ is expected daily energy in kWh;
- $P_{\text{kW}}$ is the array's nameplate capacity;
- $H_{\text{peak-sun}}$ is the local daily peak-sun value;
- $D$ is the derate factor for losses.

A first-pass estimate often uses a derate factor of **0.8**:

- panel tolerance;
- inverter efficiency;
- wiring losses;
- soiling;
- shading;
- temperature-related losses.

## Work A Concrete Example

Use a **6 kW** system at **4 peak sun hours**:

$$
6 \times 4 = 24 \text{ kWh/day}
$$

Before losses, that is:

$$
24 \times 365 = 8{,}760 \text{ kWh/year}
$$

Apply a 0.8 derate factor:

$$
8{,}760 \times 0.8 = 7{,}008 \text{ kWh/year}
$$

## Compare Options

| System | Gross annual kWh | 80% derated annual kWh |
| --- | ---: | ---: |
| 4 kW | 5,840 | 4,672 |
| 5 kW | 7,300 | 5,840 |
| 6 kW | 8,760 | 7,008 |
| 7 kW | 10,220 | 8,176 |

## Size To The Target, Not To The Perfect Number

For the `6,216` kWh target:

$$
P_{\text{kW}} =
\frac{6{,}216}{365 \times 4 \times 0.8}
\approx 5.3 \text{ kW}
$$

Because modules come in fixed quantities, choose the next practical array size,
commonly 5.5–6 kW.

## Production Factors

```flash
id: solar-production-factor
front: Why apply a derate factor to a solar estimate?
back: Real systems lose energy from shading, soiling, wiring, inverter conversion, temperature, and panel tolerance.
```

## Checkpoint

```quiz
id: m2-production
objectives:
  - solar-production-factor
q: A 6 kW system at 4 peak sun hours produces approximately how much energy per day before losses?
opts:
  - 24 kWh
  - 10 kWh
  - 6 kWh
answer: 0
expl: 6 kW multiplied by 4 peak sun hours gives approximately 24 kWh per day before losses.
```
````

## 11. Coding Agent: Enrich Module 3

Open:

```text
courses/practical-home-solar-sizing/content/M3.md
```

Use the following concrete content:

````markdown
---
title: Choose System Size
kicker: Module 3 · Practical Design
subtitle: Balance energy target, roof area, budget, and payback.
---

## Bring The Constraints Together

A good residential design usually balances:

1. the production target;
2. usable roof area;
3. shading;
4. orientation;
5. budget;
6. payback expectations.

## Estimate Roof Capacity

For this mockup, assume:

- each module is 420 W;
- each module occupies 1.7 m²;
- 32 usable roof positions remain.

Panel count:

$$
32 \text{ modules}
$$

Array size:

$$
32 \times 420 \text{ W} = 13{,}440 \text{ W} \approx 13.4 \text{ kW}
$$

Roof area:

$$
32 \times 1.7 \text{ m}^2 = 54.4 \text{ m}^2
$$

## Choose The Practical Array

The 5.3 kW calculated target becomes:

- 13 modules × 420 W = 5.46 kW;
- 14 modules × 420 W = 5.88 kW;
- 15 modules × 420 W = 6.30 kW.

Choose **15 modules**:

- it is close to the target;
- it leaves roof positions available;
- it avoids overbuying capacity;
- it makes future storage or an electric vehicle easier to add.

## Check Payback Simply

Suppose:

- gross installed cost: `$9,000`;
- net cost after incentives: `$6,300`;
- electricity value: `$0.20/kWh`;
- expected annual production: `6,300 kWh`.

Annual value:

$$
6{,}300 \times 0.20 = \$1{,}260
$$

Simple payback:

$$
\frac{6{,}300}{1{,}260} = 5 \text{ years}
$$

## Avoid Common Mistakes

- Do not size only from the highest summer bill.
- Do not ignore shade on the strongest roof plane.
- Do not compare quotes using different production assumptions.
- Do not choose an inverter without checking future expansion headroom.
- Do not forget that a fixed service charge may remain.

## Design Decision

```flash
id: solar-right-size
front: What should you do when the calculated array cannot fit the roof?
back: Reduce the array to the largest practical size, reduce consumption first, and compare the value of efficiency measures.
```

## Checkpoint

```quiz
id: m3-right-size
objectives:
  - solar-right-size
q: What is the safest first decision when a proposed system cannot fit the roof?
opts:
  - Reduce the array to the largest practical size and revisit efficiency first
  - Ignore roof area and install panels anyway
  - Choose equipment only by the lowest price
answer: 0
expl: Roof area, energy reduction, and budget constrain the design; maximize value within the practical roof area.
```
````

## 12. Coding Agent: Compile And Validate

After enriching all module files, run:

```bash
node template/scripts/compile-course.js
```

Then run the canonical 14-gate pipeline:

```bash
node template/scripts/agent-run.js
```

The pipeline checks:

1. manifest compiler;
2. manifest schema fixtures;
3. course factory;
4. catalog compiler;
5. course validation;
6. unit tests;
7. headless course walkthrough;
8. production checks;
9. multi-course validation;
10. catalog determinism;
11. deterministic publish;
12. publish verification;
13. accessibility report;
14. release readiness.

Stop only when:

```text
template/tests/generated/agent-run.json
```

reports:

```json
{
  "status": "success"
}
```

## 13. Coding Agent: Publish And Verify

Run:

```bash
node template/scripts/publish.js
node template/scripts/verify-publish.js
```

Expected catalog entry:

```text
dist/courses.html
```

Expected course route:

```text
dist/courses/practical-home-solar-sizing/
```

## 14. Coding Agent: Final Review Checklist

Confirm each of these paths exists:

```text
courses/practical-home-solar-sizing/index.html
courses/practical-home-solar-sizing/course-manifest.json
courses/practical-home-solar-sizing/content/M1.md
courses/practical-home-solar-sizing/content/M2.md
courses/practical-home-solar-sizing/content/M3.md
courses/practical-home-solar-sizing/content/media/solar-bill.png
courses.yaml
template/tests/generated/agent-run.json
dist/courses.html
dist/courses/practical-home-solar-sizing/index.html
```

Confirm each report:

```text
template/tests/generated/agent-run.json
```

and:

```text
template/tests/generated/publish-report.json
```

reports passed status.

## 15. Reuse This Workflow For Another Topic

To adapt the workflow:

1. Change the learning brief.
2. Ask the AI assistant to create only `curriculum.json`.
3. Review and approve the curriculum.
4. Ask the AI assistant for a coding-agent handoff prompt.
5. Paste that prompt into the coding agent.
6. Let the coding agent initialize, generate, enrich, validate, and publish.
7. Never let either tool weaken a validation gate.

## 16. Common Mistakes By Environment

### In the AI assistant

- Do not let it generate course files too early.
- Do not let it invent unapproved objectives.
- Do not skip the human approval checkpoint.
- Do not let it modify framework files.
- Do not treat a curriculum conversation as full implementation.

### In the coding agent

- Do not redesign the curriculum after generation.
- Do not modify player core or vendor libraries.
- Do not weaken validation gates.
- Do not hand-edit `dist/`.
- Do not add a custom component without a concrete need.
- Do not stop before `agent-run.json` reports `success`.
