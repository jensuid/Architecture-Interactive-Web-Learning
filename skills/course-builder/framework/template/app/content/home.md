---
title: Your Course Name — learn it by playing with it
kicker: Interactive course
subtitle: 3 demo modules · interactive labs · code with annotations · checkpoint quizzes · a certificate at the end. Replace everything here with your own topic.
---

## What this template gives you

This is a **generic interactive learning platform**: markdown files are the course,
the browser app is the player. Edit the files in `content/` and you have a new course —
no build step, no backend.

The three demo modules each demonstrate a slice of the content contract:

1. **Getting started** — prose, tables, a checkpoint quiz, the certificate flow
2. **Content blocks** — annotated code (`python` + `anno`) and the chart lab
3. **Media & math** — images, self-hosted video, YouTube embeds, and LaTeX math

## Start

<div class="card-grid">

  <a class="card" href="#/module/M1"><span class="n">M1</span><div class="t">Getting started</div><div class="d">Prose, lists, tables, and your first checkpoint quiz.</div><div class="q">~5 min · quiz inside</div></a>

  <a class="card" href="#/module/M2"><span class="n">M2</span><div class="t">Content blocks</div><div class="d">Annotated code windows and an interactive chart lab.</div><div class="q">~5 min · quiz inside</div></a>

  <a class="card" href="#/module/M3"><span class="n">M3</span><div class="t">Media & math</div><div class="d">Images, video, YouTube embeds, LaTeX equations.</div><div class="q">~5 min · final quiz inside</div></a>

</div>

## How authoring works

Every module is one markdown file in `content/`. Five special fenced blocks
(`python`, `anno`, `interactive`, `quiz`, `media`) become interactive elements;
everything else is ordinary markdown. See `docs/ARCHITECTURE.md` for the full
content contract, and `README.md` for the 10-minute instantiation guide.

## Your objective map

```interactive
component: objectives
```
