/* ============================================================
   TS.shell — hash router, module sidebar, progress (localStorage)
   Course structure is loaded from course-manifest.json.
   ============================================================ */
'use strict';
(function () {
  const S = {};
  let PROGRESS_KEY = 'ts-progress-v1';

  // ---------- course metadata and module registry ----------
  // Loaded from course-manifest.json before the first route renders.
  S.COURSE_META = null;
  S.MODULES = [];
  S.FINAL_QUIZ_HOST = null;
  S.PRESENTATION = null;
  S.OBJECTIVE_MAP = [];

  // ---------- progress ----------
  S.readProgress = () => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { return {}; }
  };
  S.writeProgress = (p) => {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
    S.renderStepper();
  };
  S.currentSlide = (id) => {
    const match = location.hash.match(new RegExp(`^#/module/${id}/s(\\d+)$`));
    if (match) return Math.max(0, Number(match[1]) - 1);
    const progress = S.readProgress();
    return progress[id] && Number.isInteger(progress[id].lastSlide) ? progress[id].lastSlide : 0;
  };
  S.saveLastSlide = (id, index) => {
    const progress = S.readProgress();
    if (!progress[id]) progress[id] = { visited: true, quiz: null };
    progress[id].lastSlide = index;
    S.writeProgress(progress);
  };
  S.recordConfidence = (moduleId, confidence) => {
    const progress = S.readProgress();
    if (!progress[moduleId]) progress[moduleId] = { visited: true, quiz: null };
    progress[moduleId].confidence = confidence;
    S.writeProgress(progress);
  };
  S.decodeProgressCode = (code) => {
    const text = String(code || '').trim();
    const [format, encoded] = text.split('.');
    if (format !== 'MDA1') throw new Error('unknown progress code format');
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json);
    if (payload.course !== S.COURSE_META.name || payload.progress === undefined) {
      throw new Error('not a Modern Data Analyst progress export');
    }
    return payload;
  };
  S.exportProgress = (studentName) => {
    const bytes = new TextEncoder().encode(JSON.stringify({
      format: 1,
      course: S.COURSE_META.name,
      studentName: String(studentName || 'Student'),
      exportedAt: new Date().toISOString(),
      progress: S.readProgress(),
    }));
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return `MDA1.${btoa(binary)}`;
  };
  S.importProgress = (code) => {
    const payload = S.decodeProgressCode(code);
    S.writeProgress(payload.progress);
    return payload;
  };
  S.markVisited = (id) => {
    const p = S.readProgress();
    if (!p[id]) p[id] = { visited: true, quiz: null };
    else p[id].visited = true;
    S.writeProgress(p);
  };
  S.recordQuiz = (id, score, total) => {
    const p = S.readProgress();
    if (!p[id]) p[id] = { visited: true, quiz: null };
    if (!p[id].quiz) p[id].quiz = { score, total }; // first attempt only
    S.writeProgress(p);
    S.renderStepper(); // live-update badges + progress header the moment a quiz is recorded
  };
  S.percent = () => {
    const p = S.readProgress();
    if (!S.MODULES.length) return 0;
    const done = S.MODULES.filter((m) => p[m.id] && p[m.id].quiz && p[m.id].quiz.score === p[m.id].quiz.total).length;
    return Math.round((done / S.MODULES.length) * 100);
  };

  S.recordObjectiveResult = (checkpointId, correct, diagnostic) => {
    const entries = S.OBJECTIVE_MAP.filter((entry) => entry.checkpointId === checkpointId);
    if (!entries.length) return;
    const progress = S.readProgress();
    if (!progress.objectives) {
      progress.objectives = { results: {}, diagnostics: {} };
    }
    entries.forEach((entry) => {
      if (diagnostic) {
        progress.objectives.diagnostics[entry.objectiveId] = { checkpointId, correct };
      } else if (!progress.objectives.results[entry.objectiveId]) {
        progress.objectives.results[entry.objectiveId] = { checkpointId, correct };
      }
    });
    S.writeProgress(progress);
    document.dispatchEvent(new CustomEvent('ts-objectives-updated'));
  };

  S.objectiveStatus = (objectiveId) => {
    const module = S.MODULES.find((candidate) => (
      (candidate.objectives || []).some((objective) => objective.id === objectiveId)
    ));
    if (!module) return null;
    const objective = module.objectives.find((candidate) => candidate.id === objectiveId);
    const entries = S.OBJECTIVE_MAP.filter((entry) => entry.objectiveId === objectiveId);
    const objectiveState = S.readProgress().objectives || {};
    const result = objectiveState.results && objectiveState.results[objectiveId];
    const diagnostic = objectiveState.diagnostics && objectiveState.diagnostics[objectiveId];
    const checkpointEntries = entries.filter((entry) => !entry.diagnostic);
    const hasCheckpoint = checkpointEntries.length > 0;
    let status = 'not-started';
    if (result && result.correct) status = 'mastered';
    else if (result && !result.correct) status = 'needs-review';
    else if (diagnostic && diagnostic.correct) status = 'baseline-ready';
    else if (hasCheckpoint) status = 'in-progress';
    else if (diagnostic) status = 'diagnostic-ready';
    return {
      id: objective.id,
      text: objective.text,
      moduleId: module.id,
      moduleShort: module.short,
      checkpointIds: checkpointEntries.map((entry) => entry.checkpointId),
      status,
      recommended: status !== 'mastered',
      correct: result ? result.correct : null,
    };
  };

  S.objectiveStatuses = () => S.MODULES
    .flatMap((module) => module.objectives || [])
    .map((objective) => S.objectiveStatus(objective.id))
    .filter(Boolean);

  // ---------- module sidebar (was: top pipeline stepper) ----------
  // Renders the course progress header + module list with completion badges.
  S.renderStepper = () => {
    const el = document.getElementById('stepper');
    if (!el) return;
    const p = S.readProgress();
    const cur = S.currentModuleId();
    const pct = S.percent();
    const done = S.MODULES.filter((m) => {
      const st = p[m.id];
      return st && st.quiz && st.quiz.score === st.quiz.total;
    }).length;
    let html = `
      <div class="side-progress">
        <div class="side-progress-label">
          <span>Course progress</span><span class="side-progress-pct">${pct}%</span>
        </div>
        <div class="side-progress-bar"><div class="side-progress-fill" style="width:${pct}%"></div></div>
        <div class="side-progress-count">${done} / ${S.MODULES.length} modules passed</div>
      </div>
      <nav class="stepper-track">`;
    S.MODULES.forEach((m, i) => {
      const st = p[m.id] || {};
      const cls = ['step'];
      if (m.id === cur) cls.push('current');
      else if (st.visited) cls.push('visited');
      if (st.quiz && st.quiz.score === st.quiz.total) cls.push('quiz-done');
      const n = m.id === 'final-assessment' ? '★' : String(i + 1);
      const badge = st.quiz && st.quiz.score === st.quiz.total
        ? '<span class="badge badge-done" title="Quiz passed">✓</span>'
        : st.visited
          ? '<span class="badge badge-started" title="Visited"></span>'
          : '<span class="badge" title="Not started"></span>';
      html += `<a class="${cls.join(' ')}" href="#/module/${m.id}">
        <span class="n">${n}</span><span class="t">${m.short}</span>${badge}</a>`;
    });
    html += '</nav>';
    el.innerHTML = html;
  };

  // ---------- mobile drawer ----------
  // Sidebar lives off-canvas below ~900px; menu button slides it in.
  S.drawerOpen = false;
  S.setDrawer = (open) => {
    S.drawerOpen = open;
    document.body.classList.toggle('drawer-open', open);
    const btn = document.getElementById('menu-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '✕' : '☰';
    }
  };
  S.initDrawer = () => {
    const btn = document.getElementById('menu-btn');
    const backdrop = document.getElementById('drawer-backdrop');
    if (btn) btn.addEventListener('click', () => S.setDrawer(!S.drawerOpen));
    if (backdrop) backdrop.addEventListener('click', () => S.setDrawer(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.drawerOpen) S.setDrawer(false); });
    // close drawer after picking a module (delegated — list is re-rendered)
    document.getElementById('stepper').addEventListener('click', (e) => {
      if (e.target.closest('a.step')) S.setDrawer(false);
    });
  };

  // ---------- module navigation ----------
  // Returns {prev:{id,short}|null, next:{id,short}|null} for a module id.
  S.moduleNav = (id) => {
    const i = S.MODULES.findIndex((m) => m.id === id);
    if (i === -1) return { prev: null, next: null };
    return {
      prev: i > 0 ? S.MODULES[i - 1] : null,
      next: i < S.MODULES.length - 1 ? S.MODULES[i + 1] : null,
    };
  };

  // Renders the bottom prev/next navigation for a module page.
  S.renderModuleNav = (root, id) => {
    const nav = root.querySelector('.module-nav');
    if (nav) nav.remove();
    const { prev, next } = S.moduleNav(id);
    const el = document.createElement('div');
    el.className = 'module-nav';
    el.innerHTML = `
      ${prev ? `<a class="nav-card prev" href="#/module/${prev.id}">
        <span class="dir">← Previous</span>
        <span class="t">${prev.short}</span>
      </a>` : '<span></span>'}
      ${next ? `<a class="nav-card next" href="#/module/${next.id}">
        <span class="dir">Next →</span>
        <span class="t">${next.short}</span>
      </a>` : '<span></span>'}`;
    root.appendChild(el);
  };

  // ---------- routing ----------
  S.currentModuleId = () => {
    const m = location.hash.match(/^#\/module\/([\w-]+)/);
    return m ? m[1] : null;
  };
  S.currentRoute = () => {
    if (/^#\/module\//.test(location.hash)) return { page: 'module', id: S.currentModuleId() };
    return { page: 'home' };
  };
  S.bindDeck = (deck, id) => {
    const slides = Array.from(deck.querySelectorAll('.slide'));
    const deckRoot = deck.closest('.doc');
    const readBody = deckRoot.querySelector('.read-body');
    const toggle = deck.querySelector('.deck-topbar .read-toggle');
    const goTo = (index, replace = true) => {
      const active = window.TS.deck.activateSlide(deck, index);
      S.saveLastSlide(id, active);
      const hash = `#/module/${id}/s${active + 1}`;
      if (replace) location.replace(hash);
      else location.hash = hash;
    };

    deck.querySelector('.deck-prev').addEventListener('click', () => goTo(Number(deck.querySelector('.deck-indicator').textContent.match(/Slide (\d+)/)[1]) - 2, 0));
    deck.querySelector('.deck-next').addEventListener('click', () => goTo(Number(deck.querySelector('.deck-indicator').textContent.match(/Slide (\d+)/)[1])));
    deck.querySelector('.deck-dots').addEventListener('click', (event) => {
      const dot = event.target.closest('.deck-dot');
      if (dot) goTo(Number(dot.dataset.index));
    });
    toggle.addEventListener('click', () => {
      const readMode = !deckRoot.classList.contains('read-mode');
      deckRoot.classList.toggle('read-mode', readMode);
      toggle.textContent = readMode ? 'Flow mode' : 'Read mode';
      const readToggle = readBody.querySelector('.read-toggle');
      if (readToggle) readToggle.textContent = readMode ? 'Flow mode' : 'Read mode';
      deck.hidden = readMode;
      readBody.hidden = !readMode;
      if (readMode) {
        if (!readBody.dataset.mounted) {
          readBody.dataset.mounted = 'true';
          window.TS.renderer.mountReadMode(readBody, deck, id);
        }
      } else {
        goTo(S.currentSlide(id), false);
      }
    });
    readBody.querySelector('.read-toggle').addEventListener('click', () => {
      const readMode = true;
      deckRoot.classList.toggle('read-mode', readMode);
      readBody.hidden = readMode;
      deck.hidden = !readMode;
      toggle.textContent = readMode ? 'Flow mode' : 'Read mode';
      const readToggle = readBody.querySelector('.read-toggle');
      if (readToggle) readToggle.textContent = readMode ? 'Flow mode' : 'Read mode';
      goTo(S.currentSlide(id), false);
    });
    deck._goTo = goTo;
    const presentToggle = deck.querySelector('.present-toggle');
    presentToggle.addEventListener('click', () => {
      if (document.documentElement.classList.contains('presenting')) S.exitPresentation();
      else S.enterPresentation();
    });
    const confidenceBlock = document.createElement('div');
    confidenceBlock.className = 'confidence-block';
    confidenceBlock.innerHTML = `
      <div class="confidence-title">How well did this module land?</div>
      <div class="confidence-actions">
        <button data-confidence="got-it">🟢 Got it</button>
        <button data-confidence="shaky">🟡 Shaky</button>
        <button data-confidence="lost">🔴 Lost</button>
      </div>`;
    deckRoot.appendChild(confidenceBlock);
    confidenceBlock.addEventListener('click', (event) => {
      const button = event.target.closest('[data-confidence]');
      if (!button) return;
      confidenceBlock.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      S.recordConfidence(id, button.dataset.confidence);
    });
  };

  S.initDeckKeyboard = () => {
    document.addEventListener('keydown', (event) => {
      if (document.documentElement.classList.contains('presenting') && event.key === 'Escape') {
        S.exitPresentation();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', ' '].indexOf(event.key) === -1) return;
      const target = event.target;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
      const deckRoot = document.querySelector('.doc.deck-mode:not(.read-mode)');
      const deck = deckRoot && deckRoot.querySelector('.deck');
      if (!deck || !deck._goTo) return;
      const current = Number(deck.querySelector('.deck-indicator').textContent.match(/Slide (\d+)/)[1]) - 1;
      const count = deck.querySelectorAll('.slide').length;
      if (event.key === 'ArrowLeft') deck._goTo(Math.max(0, current - 1));
      else if (event.key === 'ArrowRight') deck._goTo(Math.min(count - 1, current + 1));
      else if (event.key === ' ') {
        event.preventDefault();
        deck._goTo(Math.min(count - 1, current + 1));
      }
    });
  };
  S.enterPresentation = () => {
    const deckRoot = document.querySelector('.doc.deck-mode:not(.read-mode)');
    if (!deckRoot) return;
    const deck = deckRoot.querySelector('.deck');
    if (!deck || !deck._goTo) return;
    document.documentElement.classList.add('presenting');
    deckRoot.classList.add('presenting');
    deck.querySelector('.present-toggle').textContent = 'Exit';
    if (deckRoot.requestFullscreen) {
      deckRoot.requestFullscreen().catch(() => {});
    }
  };
  S.exitPresentation = () => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    document.documentElement.classList.remove('presenting');
    const deckRoot = document.querySelector('.doc.deck-mode.presenting');
    if (!deckRoot) return;
    deckRoot.classList.remove('presenting');
    const toggle = deckRoot.querySelector('.present-toggle');
    if (toggle) toggle.textContent = 'Present';
  };
  S.toggleSpeakerNotes = () => {
    const slide = document.querySelector('.doc.presenting .slide.active');
    if (!slide) return;
    slide.classList.toggle('show-note');
  };
  S.initPresentationKeyboard = () => {
    document.addEventListener('keydown', (event) => {
      if (event.target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) return;
      if (event.key === 'p' || event.key === 'P') S.enterPresentation();
      else if (event.key === 'f' || event.key === 'F') S.enterPresentation();
      else if (event.key === 'n' || event.key === 'N') S.toggleSpeakerNotes();
      else if (event.key === 'Escape') S.exitPresentation();
    });
  };

  S.loadCourseManifest = async function () {
    const response = await fetch('course-manifest.json');
    if (!response.ok) throw new Error(`course manifest ${response.status}`);
    const manifest = await response.json();
    if (manifest.schemaVersion !== 1) throw new Error('unsupported course manifest schemaVersion');
    if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) throw new Error('course manifest has no modules');

    const ids = manifest.modules.map((module) => module.id);
    if (new Set(ids).size !== ids.length) throw new Error('course manifest has duplicate module IDs');
    if (ids.includes('final-assessment') && ids[ids.length - 1] !== 'final-assessment') {
      throw new Error('final-assessment must be the last module');
    }
    if (manifest.finalQuizHost !== null && manifest.finalQuizHost !== undefined && !ids.includes(manifest.finalQuizHost)) {
      throw new Error('finalQuizHost is not a registered module');
    }

    S.COURSE_META = manifest.course;
    PROGRESS_KEY = `${S.COURSE_META.id}-progress-v1`;
    S.MODULES = manifest.modules;
    S.FINAL_QUIZ_HOST = manifest.finalQuizHost === undefined ? null : manifest.finalQuizHost;
    S.OBJECTIVE_MAP = Array.isArray(manifest.objectiveMap) ? manifest.objectiveMap : [];
    S.PRESENTATION = manifest.presentation || { theme: 'default', layout: 'sidebar-left', customTheme: null, componentVariants: {} };
    if (!['default', 'slate', 'warm', 'nord', 'blossom', 'architecture-studio'].includes(S.PRESENTATION.theme)) {
      throw new Error('unsupported presentation theme');
    }
    if (S.PRESENTATION.layout !== 'sidebar-left') throw new Error('unsupported presentation layout');
    document.documentElement.setAttribute('data-theme', S.PRESENTATION.theme);
  };

  S.boot = async function () {
    const app = document.getElementById('app');
    try {
      await S.loadCourseManifest();
    } catch (err) {
      app.innerHTML = `<section class="loading">Course manifest failed to load: ${err.message}</section>`;
      throw err;
    }

    const render = async () => {
      const route = S.currentRoute();
      // topnav active state
      document.querySelectorAll('.topnav a').forEach((a) => {
        a.classList.toggle('active', a.getAttribute('data-nav') === (route.page === 'home' ? 'home' : route.id));
      });
      app.innerHTML = '<section class="loading">Loading…</section>';
      try {
        if (route.page === 'module') {
          await window.TS.renderer.renderModule(app, route.id);
          S.renderModuleNav(app, route.id);
          S.markVisited(route.id);
        } else {
          await window.TS.renderer.renderHome(app);
        }
      } catch (err) {
        app.innerHTML = `<section class="loading">Failed to load: ${err.message}</section>`;
      }
      S.renderStepper();
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', render);
    S.initDrawer();
    S.initDeckKeyboard();
    S.initPresentationKeyboard();
    await render();
  };

  window.TS = window.TS || {};
  window.TS.shell = S;
})();
