# New Course — Session Handoff

**Purpose:** paste the block at the bottom into a FRESH agent session to start a new
course. This file + the template are self-contained; no prior conversation needed.

## What exists (disk memory — the source of truth)

- `template/` — reusable any-topic learning platform, fully working, tested (9 unit + 36 headless)
  - `template/README.md` — 10-minute instantiation guide, content contract, gotchas
  - `template/docs/ARCHITECTURE.md` — formal 5-layer architecture spec
  - `template/tests/` — ported suites; keep the CORRECT map in sync with quiz edits
- `app/` + `tests/` (repo root) — the original Time Series Lab reference build
  (36 unit + 121 headless) — consult it for how a mature course uses labs/media/math
- `artifacts/00-project-state.md` — build history + every gotcha encountered

## Suggested session budgeting for a new topic

- **Pilot session:** copy template, rename, register 3–5 modules, author their content,
  adapt tests → one session
- **Full course (8–12 modules):** 2–3 sessions, ~4 modules each — always end a session
  with green tests + commit + a state note, so the next session starts clean
- Keep every session's state file current (disk is memory; the chat is not)

## Paste-into-a-new-session prompt

```
Read template/README.md and template/ARCHITECTURE.md first.

I'm building a new course: [TOPIC NAME].
Copy template/ to a new directory "app-[topic]/" (or replace template/app content
in place — your call, but keep template/ pristine as the reusable scaffold).

Course plan:
- [N] modules + final assessment
- [quantitative? if yes: what the engine needs to compute]
- [any datasets/media you already have, or "generate sensible demos"]

Author the markdown content per the content contract in the README
(## sections, --- slide breaks optional, python/anno/interactive/quiz/media
fences, 0-based answers). Register modules in shell.js, set FINAL_QUIZ_HOST,
keep tests' CORRECT map in sync. Run node tests/unit.js && node tests/headless.js
green before finishing. Work in slices; commit per slice.
```
