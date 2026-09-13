# The Modular Interactive Learning Platform — Architecture Specification

**Document class:** Architecture specification · Reusable web platform
**Applies to:** Any-topic instantiation of the interactive learning web (reference build: *Time Series Lab*)
**Status:** Formalized from the completed, tested V1/V2 implementation
**Reading time:** ~15 min

---

## 1. Purpose & Scope

This document specifies a **zero-backend, content-driven architecture** for self-paced interactive courses on arbitrary topics. The platform's central principle:

> **Markdown is the course. The application is a player.**

A course is a directory of markdown files. A small static runtime fetches and "plays" it — rendering prose, mathematics, annotated code, quizzes, interactive laboratories, and media — while tracking per-learner progress in the browser. No server, no build step, no database, no accounts.

**In scope:** runtime architecture, content contract, component model, state model, extension protocol, verification strategy, instantiation procedure.
**Out of scope:** topic-specific curriculum design (the content layer), LMS integration, multi-user sync.

### 1.1 Design goals

| Goal | Consequence in the architecture |
|---|---|
| **Any topic, no programming to author** | All course material lives in markdown; fenced blocks declare interactivity declaratively |
| **Free-tier forever / offline-friendly** | 100% static assets, all libraries vendored locally, zero network calls at runtime |
| **Deploy = copy files** | Any static host (GitHub Pages, Netlify, intranet share, USB stick) |
| **Context-budget-friendly construction** | Disk-is-memory build process; layered slices; state file as single source of truth |
| **Verifiable without humans** | Headless DOM suite walks every route and completes the course programmatically |
| **Look-and-feel as configuration** | 100% of color in design tokens; themes are pure variable blocks |

### 1.2 The reference instantiation

The architecture was proven with *Time Series Lab*: 10 modules + final assessment, 9 interactive component types, a numerical engine (decomposition, stationarity tests, autocorrelation, smoothing, forecasting), 5 themes, certificate gating. It runs at 157 automated checks (36 engine + 121 DOM) and zero runtime dependencies on external services.

---

## 2. System Overview

### 2.1 Layered architecture

The system separates **what changes per topic** from **what never changes**. Five layers, strict downward dependency only:

```
┌──────────────────────────────────────────────────────────────┐
│  L5 · CHROME (never changes)                                  │
│  Sidebar + badges + progress, themes, typography, drawer     │
├──────────────────────────────────────────────────────────────┤
│  L4 · PLAYER (never changes)                                  │
│  Hash router · markdown pipeline · fence extraction ·        │
│  math placeholders · module nav · progress store              │
├──────────────────────────────────────────────────────────────┤
│  L3 · COMPONENTS (generic + specialized)                      │
│  quiz · media · chart-lab · certificate      ← generic        │
│  topic laboratories (0–8)                   ← per topic       │
├──────────────────────────────────────────────────────────────┤
│  L2 · DOMAIN ENGINE (per topic, or absent)                   │
│  Pure functions, zero DOM — math / simulation / logic         │
├──────────────────────────────────────────────────────────────┤
│  L1 · CONTENT (always per topic)                              │
│  home.md · M1..Mn.md · final-assessment.md · data/           │
└──────────────────────────────────────────────────────────────┘
        content defines a course · engine+labs define a domain ·
        player+chrome define the platform
```

**Swappability matrix:**

| Layer | Changes per topic | Cost to swap |
|---|---|---|
| L1 Content | Always | Authoring time (markdown) |
| L2 Engine | If quantitative | One pure-JS module |
| L3 Specialized labs | Optional (0–8) | Each is one self-contained file |
| L3 Generic components, L4 Player, L5 Chrome | Never | — |

### 2.2 Filesystem contract

```
app/
├── index.html                 # loads vendored libs + platform JS in strict order
├── css/
│   ├── style.css              # all styles, token-driven
│   └── fonts/                 # local font files (incl. math fonts)
├── js/
│   ├── vendor/                # marked, highlight.js, Chart.js, KaTeX (local)
│   ├── engine.js              # L2 — pure domain functions (optional)
│   ├── shell.js               # L4 — router, MODULES registry, progress, sidebar
│   ├── renderer.js            # L4 — markdown → DOM, fences, math, media
│   ├── main.js                # boot (loads last)
│   └── components/            # L3 — one file per component
│       ├── quiz.js            #   generic (every instantiation)
│       ├── chartlab.js        #   generic chart + slider harness
│       ├── media.js (in renderer) # generic
│       ├── certificate.js     #   generic
│       └── <topic>-lab.js     #   specialized per domain
└── content/
    ├── home.md                # landing: course description + module cards
    ├── M1.md … Mn.md          # modules in reading order
    ├── final-assessment.md    # ★ gate + certificate
    ├── media/                 # images / self-hosted video
    └── data/*.json            # datasets (if quantitative)
```

### 2.3 Runtime data flow

```
learner navigates  →  hash router (#/module/M3)
                   →  fetch(content/M3.md)              [per-boot cache token]
                   →  parse front-matter (title, kicker, subtitle)
                   →  EXTRACT all fenced blocks → placeholder divs + store[]
                     (regex built from FENCES registry — before any markdown parsing)
                   →  extract $$…$$ / $…$ math → %%RAW n%% placeholders
                     (protects LaTeX from markdown mangling: _…_ → <em>)
                   →  marked.parse(remaining text)
                   →  inject into <article class="doc">
                   →  MOUNT loop: for each placeholder, mount component by kind
                     python→code window · anno→annotation rail · interactive→lab
                     quiz→quiz card · media→figure
                   →  restoreMath(): swap %%RAW n%% → KaTeX HTML
                   →  module nav + sidebar badges + progress % update
```

The **extract-before-parse** pipeline is the platform's key invariant: no component payload (code, YAML config, quiz text, LaTeX) is ever exposed to the markdown parser. This is why real code with backticks/underscores and LaTeX with subscripts survive intact.

### 2.4 Module namespace & load order

All modules attach to a single global namespace `TS` (Topic Shell):

```
engine.js    → window.TS.engine        (pure functions)
shell.js     → window.TS.shell        (router, progress, sidebar)
renderer.js  → window.TS.renderer     (markdown pipeline)
components/* → window.TS.components    (registry: name → mount fn)
               + TS._pending queue for deferred registration
main.js      → boots TS.shell.boot()  (MUST load last)
```

Script order in `index.html` is normative: `engine → shell → renderer → components → main`. Vendor libraries (marked, highlight.js, Chart.js, KaTeX) load before platform code.

---

## 3. Content Contract (L1)

### 3.1 Module file structure

Every module is markdown with YAML-ish front-matter:

```yaml
---
title: Module 4 — <Topic Phrase>
kicker: Module 4 · <Section label>      # small uppercase eyebrow
subtitle: One-line hook for the learner.
---
```

### 3.2 Fenced-block grammar

Six block types, each extracted pre-parse and mounted post-parse:

#### V2 slide mode

- `---` on its own line separates slides after fences are extracted.
- The first `##` heading in a slide becomes its title.
- `<!-- slide: review:true note:"Speaker guidance" -->` marks a review slide and speaker note.
- A module with fewer than two slide fragments remains long-form.
- Flow, Read, and Presentation mode render from the same source markdown.

#### `python` + `anno` (paired) — annotated code
````markdown
```python
import pandas as pd
df = pd.read_csv("sales.csv", parse_dates=["date"])
```

```anno
2|parse_dates converts strings → datetime on load
```
````

- `anno` rows are `LINE|explanation`; the block binds to the **immediately preceding** `python` block and renders as an annotation rail under the code window
- Code renders with line-number gutter (compact, left-aligned), syntax highlighting, and an "runs on your machine" header — the platform deliberately does not execute code

#### `interactive` — laboratory mounting
````
```interactive
component: stationaritylab
dataset: airline
period: 12
```
````

Mini-YAML: `key: value` lines; floats must match `^-?\d*\.\d+$`; `key:` + indented `- item` lists; strings may be quoted. `component:` names must exist in the component registry; unknown names **degrade to a visible error box, never a crash**.

#### `quiz` — checkpoint
````
```quiz
id: m4-1                              # unique, stable
q: Question text?
opts:
  - option A
  - option B
  - option C
answer: 1                             # 0-BASED index
expl: Feedback shown after checking.
```
````

First-attempt only is recorded (see §5.2).

#### `media` — image / video / embed
````
```media
type: image | video | youtube
src: content/media/foo.png             # app/-relative (image, video)
youtube: VIDEO_ID                     # the part after watch?v=
caption: optional caption
width: 560                            # optional max px (video)
```
````

YouTube embeds use a **click-to-load facade**: the player (≈1 MB JS) only loads when the learner clicks ▶ — pages stay fast, tracking cookies stay unloaded, and the DOM suite stays network-hermetic.

#### `math` (inline in prose, no fence)
`$inline$` and `$$display$$` — extracted to `%%RAW n%%` placeholders pre-parse, rendered via KaTeX post-mount. The `%%…%%` marker (not `\u0000`) is normative: NUL does not survive HTML parsing.

### 3.3 Special pages

- **`home.md`** — landing article; module cards are plain markdown links; the renderer adds course metadata
- **`final-assessment.md`** — ★ step; hosts the certificate component (see §5.3); its quizzes may live in M(n) with `final-*` ids and are dual-recorded (§5.2)
- **`data/*.json`** — columnar datasets, fetched once per boot, cached in memory

---

## 4. Component Model (L3)

### 4.1 Component contract

A component is `mount(holder, config, ctx)` where `ctx = {moduleId, store}`. It:

1. receives the already-parsed mini-YAML config,
2. builds its DOM inside `holder`,
3. may call `TS.engine.*` for domain computation,
4. reports events (e.g. quiz results) to `TS.shell.record*` — components never touch localStorage directly,
5. self-registers at load: `TS._pending.push(['name', mount])`, drained by `main.js` into `TS.components`.

Failure isolation: any component throw renders `⚠️ component error: <message>` in place — one broken lab never kills a page.

### 4.2 Generic component inventory (every instantiation)

| Component | Purpose | Key selectors (test contract) |
|---|---|---|
| `quiz` | checkpoint with options, check/reset, explanation, first-attempt scoring | `.quiz`, `.quiz-opt`, `.check`, `.reset`, `.quiz-expl` |
| `chartlab` | generic line-chart + slider harness reading engine metrics | `.chart-wrap`, `.lab-controls input` |
| `media` (renderer-mounted) | image / self-hosted video / youtube facade | `figure.media`, `.yt-facade` |
| `certificate` | progress summary + locked/unlocked certificate card | `.cert-card`, `.cert-list`, `.cert-stats` |

### 4.3 Specialized laboratories (per topic, 0–8)

Reference set (Time Series): `declab` (classical decomposition), `stationaritylab` (ADF test), `acflab` (ACF/PACF), `smoothlab` (SES/Holt/Holt-Winters), `arimalab` (AR/MA mechanics stepper), `modelcompare` (forecast-vs-actual with MAE/RMSE/MAPE). A non-quantitative topic needs **zero** specialized labs — the generic set plus prose/media is a complete course.

---

## 5. State & Progress Model (L4)

### 5.1 Client state keys

| Key | Content |
|---|---|
| `ts-progress-v1` | `{ [moduleId]: { visited: bool, quiz: {score, total} \| null } }` |
| `ts-theme` | active theme id (`default\|slate\|warm\|nord\|blossom`) |

V2 stores three additional concepts without changing the certificate gate:

| Concept | Location | Purpose |
|---|---|---|
| `lastSlide` | inside `ts-progress-v1` | Resume position per module |
| `confidence` | inside `ts-progress-v1` | Got it / shaky / lost self-assessment |
| `ts-flashcards-v1` | instantiation-local key | Three-box Leitner review state |

Progress codes use `MDA1.` followed by UTF-8 JSON encoded as Base64. `teacher.html`
imports one code per line entirely in the browser; no backend or account is required.

All state is localStorage; no server, no accounts. Progress is exportable by copying the key (documented in the footer philosophy: your browser, your data).

### 5.2 Recording rules

- **Visited** — recorded on module render; idempotent
- **Quiz first-attempt lock** — only the first `check` click per quiz id writes progress; retries display feedback but never change the score (anti-gaming, honest %)
- **Dual recording** — a quiz with id `final-*` in module `M(n)` records to **both** that module and `final-assessment` (the certificate's gate step can live in the last content module)
- **Badge states** — ○ hollow (never visited), ● dot-in-ring (visited, quiz not passed), ✓ thin ring (quiz `score === total`); updated **live** — `recordQuiz` re-renders the sidebar immediately, no navigation needed

### 5.3 Certificate gating

The certificate unlocks when every module in `MODULES` has `quiz.score === quiz.total`. The final page shows a locked state (progress list, N/11 count, %) until 100%, then a formal certificate card (name entry, date, stats). Unlock is computed, never stored.

---

## 6. Presentation Architecture (L5)

### 6.1 Design token system

100% of color, shadow, radius, and font-stack live in `:root` custom properties. A theme is **one CSS block** of variable overrides (`html[data-theme="X"]`) — no selector duplication, no images, no build.

Reference set of five themes, varying on three axes (mode × temperature × radius character): Midnight (dark·cool·12px), Daylight (light·cool·12px), Sepia (dark·warm·12px), Nord (dark·cold·frost·8px), Blossom (light·warm·rose·16px).

### 6.2 Layout

- **Topbar** (sticky, backdrop-blur): brand, topnav, theme select
- **Sidebar** (sticky, left): course progress header (% gradient bar, N/M passed) + module list with completion badges + number circles; current module highlighted
- **Content** (`main`, max 860px): article with kicker → h1 → subtitle → body
- **Bottom module nav**: prev/next cards (linear reading)
- **Footer**: static
- **Mobile (<900px)**: sidebar becomes an off-canvas drawer (☰ button, backdrop, Esc closes, module click closes)

### 6.3 Caching discipline

- **Content** (`*.md`, `data/*.json`): per-boot cache token (`TS_CACHE = 'b' + Date.now()`) — always fresh on reload; authoring loop is edit → save → refresh
- **Code assets** (`*.js`, `*.css`): explicit `?v=N` query, bumped on change (hard refresh needed)

---

## 7. Extension Protocol — instantiating a new topic

The instantiation checklist (topic T):

1. **Scaffold** — copy `app/` (delete `content/`, `engine.js`, specialized labs, their tests)
2. **Content** — author `home.md`, `M1…Mn.md`, `final-assessment.md` in the content contract (§3). This alone yields a working course with quizzes, math, media, and certificate
3. **Registry** — edit one array in `shell.js`: `MODULES = [{id, short}…]` (+ `M0` smoke module for tests, hidden from nav)
4. **Domain engine** *(optional, quantitative topics)* — `engine.js` with pure functions; unit-test in `tests/unit.js` (no DOM)
5. **Laboratories** *(optional)* — 0–8 components per §4.1 contract; each a single file
6. **Verification** — copy `tests/headless.js` pattern: keep a **CORRECT answer map** synchronized with content quizzes; walk all routes, complete all quizzes, assert certificate unlock
7. **Deploy** — copy `app/` to any static host

**Time-to-first-module: the time to write one markdown file.**
A non-quantitative topic ships with **zero** engine/lab code.

---

## 8. Verification & QA Architecture

### 8.1 Two-tier test pyramid

| Tier | Tool | Scope | Reference count |
|---|---|---|---|
| Unit | plain Node | engine math/logic, brute-force vs reference values | 36 |
| Headless DOM | jsdom + http server | every route, every block type, full completion flow | 121 |

### 8.2 Headless suite design

- jsdom with custom `ResourceLoader` (blocks Chart.js — stub installed via `beforeParse`; blocks external embeds) → **network-hermetic**
- Polyfills: `fetch` (fs-backed), `scrollTo`, Chart stub mirroring `config.data`
- The **completion flow** answers every quiz from a CORRECT map (kept in sync with `answer:` fields), walks all modules, and asserts: all badges ✓, progress 100%, certificate unlocked — the entire course is completable without a human
- Gotchas codified in tests: 2.2 s boot sleep, media facade click-to-load, quiz first-attempt lock

### 8.3 Normative gotchas (learned, enforced)

1. Fence regex is **built from the `FENCES` array** — adding a block type means adding the kind in both places (or it silently never extracts)
2. `parseMiniYaml` expects a **lines array** — `content.split('\n')`, never a raw string
3. Math placeholders use `%%RAW n%%` — NUL chars die in HTML parsing
4. Quiz `answer:` is **0-based**
5. Nested triple-backticks inside quiz `q:` break extraction — quote code instead
6. Media `src:` is **app/-relative** (convention: `content/media/`)
7. Component errors degrade visibly; they never crash the page
8. localStorage keys are versioned (`-v1`) for forward migration

---

## 9. Conformance

An instantiation **conforms to this architecture** when:

- [ ] Zero backend: all assets static, all libraries vendored, no runtime network calls
- [ ] Content contract §3 honored (5 block types, front-matter, 0-based answers)
- [ ] Load order `engine → shell → renderer → components → main` intact
- [ ] Progress model §5: first-attempt lock, dual-recorded finals, live badge updates
- [ ] Themes are token-only blocks; all 5 ship and persist
- [ ] Headless suite completes the whole course and unlocks the certificate
- [ ] Component failures degrade to error boxes, never page crashes

**Reference implementation:** Time Series Lab (`app/` in this repository) — 16 modules of content coverage, 9 components, 5 themes, 157 checks green.

---

*End of specification. Generated from the live reference implementation; all architectural claims are backed by automated checks that run on every change (`node tests/unit.js && node tests/headless.js`).*
