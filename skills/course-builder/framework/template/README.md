# Learning Platform Template

A **zero-backend, content-driven template** for self-paced interactive courses on any
topic. Markdown files are the course; a small static web app is the player.

> Formal architecture spec: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## What you get

- 3 demo modules exercising the full content contract (prose, tables, annotated
  code, chart lab, media, LaTeX math, quizzes, certificate gating)
- V2 guided walkthroughs: slide mode, read mode, presentation mode, speaker
  notes, deep links, resume state, and confidence controls
- Practice checks, flashcards, review packs, and a static teacher viewer
- Sidebar with live completion badges + course-progress header, 5 themes, mobile drawer
- An empty-but-usable domain engine (`engine.js`: seeded PRNG, rolling stats, random walk)
- A network-hermetic headless test suite that **completes the entire course** and
  asserts the certificate unlocks

## Quick start

```bash
cd app
python3 -m http.server 8123        # any static server works
# open http://localhost:8123 — hard refresh (Cmd/Ctrl+Shift+R) after edits
```

Run the tests:

```bash
cd tests && npm install            # jsdom (dev only)
cd ..
node tests/validate-course.js      # course manifest schema + sync checks
node tests/unit.js                 # engine checks
node tests/headless.js             # full DOM walkthrough (~60 checks)
node scripts/agent-run.js           # all validation gates + machine-readable report
```

## Instantiation: your topic in ~10 minutes

1. **Brand** — `app/index.html`: change `<title>` + the brand link text. Optionally
   rename the `ts-` localStorage prefix in `shell.js` (if two courses live on the
   same origin).
2. **Modules** — edit `course.yaml` at the repository root:
   ```yaml
   course:
     id: guitar-fundamentals
     name: Guitar Fundamentals
     version: v1.0.0
   modules:
     - { id: M1, short: Tuning }
     - { id: M2, short: Chords }
     - { id: final-assessment, short: Final }
   finalQuizHost: M5
   ```
   Keep `template/app/course-manifest.json` synchronized with `course.yaml`.
   Run `node template/scripts/compile-course.js` after edits.

## Multi-course catalog

`courses.yaml` at the repository root registers every course served from the
same static deployment:

```yaml
schemaVersion: 1
courses:
  - id: learning-platform-template
    name: Your Course Name
    version: v2.0
    manifest: template/app/course-manifest.json
    route: template/app/index.html
```

Each course must have:

- a unique, route-safe ID;
- a valid manifest;
- a valid route;
- manifest ID/name matching the catalog.

Run:

```bash
node template/scripts/compile-catalog.js
node template/scripts/validate-courses.js
```

The catalog page is `template/app/courses.html`. Learner progress, flashcards,
and theme choices are isolated by course ID.

## Publish a deterministic static build

```bash
node template/scripts/publish.js
node template/scripts/verify-publish.js
```

Output goes to `dist/`. The publisher:

- copies `template/app/`;
- rewrites catalog routes for static deployment;
- generates `dist/build-manifest.json`;
- records a SHA-256 checksum for every content file.

`dist/` is generated output. Regenerate it after changing source; do not hand-edit it.
3. **Content** — write `app/content/home.md`, `M1..Mn.md`, `final-assessment.md`
   using the content contract (below). Delete the demo files when done.
4. **Data** *(optional)* — if quantitative, add `app/content/data/*.json`
   (`{name, labels, values}`) and/or extend `app/js/engine.js` with domain functions.
5. **Labs** *(optional)* — copy `chartlab.js` as a starting point for a specialized
   interactive lab; register it via `TS._pending.push(['mylab', mount])`.
6. **Tests** — update the `CORRECT` map in `tests/headless.js` to match your quiz
   answers; extend `tests/unit.js` for engine functions.
7. **Ship** — copy `app/` to GitHub Pages / Netlify / any static host.

**Non-quantitative topic?** Delete `engine.js`, `chartlab.js`, and `data/` —
prose + quizzes + media + certificate is a complete course.

## The content contract

Each module = front-matter + markdown + fenced blocks:

````markdown
---
title: Module 1 — Anything
kicker: Module 1 · Section
subtitle: One-line hook.
---

Prose, lists, tables. Inline $math$ and display $$math$$.

```python
real code with line numbers + syntax highlighting
```
```anno
2|explanation bound to line 2 (binds to the python block right above)
```
```interactive
component: chartlab      # or your own lab
dataset: demo
title: My lab
```
```quiz
id: m1-1                # unique; final-* ids light the ★ gate
q: Question?
opts:
  - option A
  - option B
answer: 1                # 0-BASED index
expl: Feedback after checking.
```
```media
type: image | video | youtube
src: content/media/foo.png    # app/-relative (image, video)
youtube: VIDEO_ID             # youtube only — click-to-load facade
caption: optional caption
```
```flash
id: M1:first-card
front: Question shown on the review card
back: Answer shown after flipping
```
````

Place `---` on its own line to split the module into slides. The first `##`
heading in each slide becomes its title. A module without `---` markers remains
a normal long-form page.

**Gotchas (each is enforced by tests):**
- quiz `answer:` is **0-based**
- media `src:` is **app/-relative**, convention `content/media/`
- never nest triple-backticks inside a quiz `q:` — quote code instead
- labs must exist in the registry — unknown names degrade to a visible error box
- `python`+`anno` pair positionally (anno binds to the block immediately above)
- `practice: true` quizzes are formative and never write progress
- `flash` cards use three-box Leitner scheduling and localStorage
- `P` / `F` enters presentation mode, `Esc` exits, and `N` toggles speaker notes

## Editing loop

Change a `.md` → save → **reload the browser** (content fetches are per-boot fresh).
Only JS/CSS changes need a `?v=N` bump in `index.html` + hard refresh.

## Layout

```
app/
  content/        home.md, M1..Mn.md, final-assessment.md, media/, data/
  css/style.css   all styling, token-driven (5 themes at the top)
  js/engine.js    YOUR domain functions (pure, optional)
  js/shell.js     router + MODULES registry + progress  ← edit per topic
  js/renderer.js  markdown pipeline                     ← never edit
  js/components/  quiz, chartlab, certificate + your labs
  js/main.js      boot (loads last)
tests/            unit.js + headless.js (jsdom)
docs/             ARCHITECTURE.md
```
