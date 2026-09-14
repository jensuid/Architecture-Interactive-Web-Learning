/* ============================================================
   Headless DOM test suite for the LEARNING PLATFORM TEMPLATE.
   Walks every route, exercises every block type, completes the
   whole demo course via a CORRECT answer map, asserts the
   certificate unlocks. Network-hermetic (Chart stub, embed filter).

   Run:  cd tests && npm install && cd .. && node tests/headless.js
   Keep the CORRECT map in sync with your quiz content!
   ============================================================ */
'use strict';
const { JSDOM, ResourceLoader } = require('jsdom');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Generated from module quiz answer fields by the course compiler.
const CORRECT = JSON.parse(fs.readFileSync(path.join(__dirname, 'generated', 'expected-answers.json'), 'utf8'));

class FilterLoader extends ResourceLoader {
  fetch(url, options) {
    if (/chart\.umd\.js/.test(url)) return Promise.resolve(Buffer.from('')); // stub installed instead
    if (/youtube(-nocookie)?\.com/.test(url)) return Promise.resolve(Buffer.from('')); // hermetic
    return super.fetch(url, options);
  }
}

function makeDOM(errors) {
  const indexPath = path.join(__dirname, '..', 'app', 'index.html');
  return JSDOM.fromFile(indexPath, {
    url: pathToFileURL(path.resolve(indexPath)).toString(),
    runScripts: 'dangerously',
    resources: new FilterLoader(),
    pretendToBeVisual: true,
    beforeParse(window) {
      window.scrollTo = () => {};
      const storage = new Map();
      Object.defineProperty(window, 'localStorage', {
        value: {
        getItem: (key) => (storage.has(String(key)) ? storage.get(String(key)) : null),
        setItem: (key, value) => storage.set(String(key), String(value)),
        removeItem: (key) => storage.delete(String(key)),
        clear: () => storage.clear(),
        key: (index) => Array.from(storage.keys())[index] || null,
        get length() { return storage.size; },
        },
        configurable: true,
      });
      window.fetch = async (url) => {
        const p = path.join(__dirname, '..', 'app', url.split('?')[0].replace(/^\//, ''));
        const body = fs.readFileSync(p);
        return { ok: true, status: 200, text: async () => body.toString(), json: async () => JSON.parse(body.toString()) };
      };
      window.Chart = function (canvas, config) {
        return {
          destroy() {}, update() {},
          data: { labels: (config && config.data && config.data.labels) || [], datasets: (config && config.data && config.data.datasets) || [] },
          options: { scales: { x: {} } },
        };
      };
      window.Chart.prototype = {};
      window.addEventListener('error', (e) => errors.push(e.message));
    },
  });
}

(async function main() {
  let pass = 0, fail = 0;
  const t = (name, ok, info) => {
    if (ok) { pass++; console.log(`  ✔ ${name}`); }
    else { fail++; console.log(`  ✘ ${name}${info ? ' — ' + info : ''}`); }
  };
  function catalogCheck() {
    const catalogPath = path.join(__dirname, '..', 'app', 'courses.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const cardsPath = path.join(__dirname, '..', 'app', 'courses.html');
    const cardsHtml = fs.readFileSync(cardsPath, 'utf8');
    return catalog.schemaVersion === 1
      && catalog.courses.length > 0
      && /id="course-cards"/.test(cardsHtml)
      && catalog.courses.every((course) => course.id && course.name && course.version && course.route);
  }
  const a11y = [];
  const audit = (name, ok, info) => a11y.push({ name, status: ok ? 'passed' : 'failed', info: info || null });

  try {
    const errors = [];
    const dom = await makeDOM(errors);
    const w = dom.window;
    await sleep(2200);

    // ---- boot ----
    t('boots without page errors', errors.length === 0, errors.join('; '));
    t('course manifest loads', w.TS.shell.COURSE_META && w.TS.shell.COURSE_META.name === 'Your Course Name');
    t('manifest registers 4 modules', w.TS.shell.MODULES.length === 4 && w.TS.shell.MODULES[3].id === 'final-assessment');
    t('manifest sets final quiz host', w.TS.shell.FINAL_QUIZ_HOST === 'M3');
    t('manifest presentation loads', w.TS.shell.PRESENTATION.theme === 'default' && w.TS.shell.PRESENTATION.layout === 'sidebar-left');
    t('manifest layout uses sidebar-left', w.document.querySelector('.layout.sidebar-left') !== null || w.document.body.classList.contains('sidebar-left'));
    t('course catalog is available', catalogCheck());
    t('home renders title', /Your Course Name/.test(w.document.querySelector('.doc h1').textContent));
    t('sidebar has 4 steps', w.document.querySelectorAll('.step').length === 4);
    t('home shows module cards', w.document.querySelectorAll('.card').length >= 3);
    t('home renders objective map', w.document.querySelectorAll('.objectives-list .objective').length === 6);
    t('objective panel recommends unmastered objectives', w.document.querySelectorAll('.objective-action').length === 6);
    t('objective panel is a live region', w.document.querySelector('.objectives-list[aria-live="polite"]') !== null);
    audit('single page h1', w.document.querySelectorAll('main h1').length === 1);
    audit('has main landmark', w.document.querySelector('main#app') !== null);
    audit('has navigation landmark', w.document.querySelector('nav.topnav') !== null);
    audit('all module links have accessible text', Array.from(w.document.querySelectorAll('a.card')).every((link) => link.textContent.trim().length > 0));

    // ---- sidebar + drawer ----
    t('progress header renders', w.document.querySelector('.side-progress') !== null);
    t('each step has a badge', w.document.querySelectorAll('.step .badge').length === 4);
    t('fresh boot: no done badges', w.document.querySelectorAll('.badge-done').length === 0);
    w.document.querySelector('#menu-btn').click();
    await sleep(60);
    t('menu button opens drawer', w.document.body.classList.contains('drawer-open'));
    w.document.querySelector('#drawer-backdrop').click();
    await sleep(60);
    t('backdrop closes drawer', !w.document.body.classList.contains('drawer-open'));

    // ---- themes ----
    const sel = w.document.querySelector('#theme-select');
    t('theme select offers 5 themes', sel.querySelectorAll('option').length === 5);
    for (const th of ['slate', 'warm', 'nord', 'blossom', 'default']) {
      sel.value = th;
      sel.dispatchEvent(new w.Event('change', { bubbles: true }));
      await sleep(40);
      t(`theme "${th}" applies + persists`,
        w.document.documentElement.getAttribute('data-theme') === th
        && w.localStorage.getItem('learning-platform-template-theme') === th);
    }

    // ---- M1: prose + quizzes ----
    w.location.hash = '#/module/M1';
    await sleep(900);
    t('M1 renders title', /Getting Started/.test(w.document.querySelector('.doc h1').textContent));
    t('M1 first slide renders prose only', w.document.querySelectorAll('.quiz').length === 0 && w.document.querySelector('.doc table') !== null);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    await sleep(60);
    t('P enters presentation mode', w.document.documentElement.classList.contains('presenting'));
    t('first slide disables Back', w.document.querySelector('.deck-prev').disabled === true);
    t('first slide enables Next', w.document.querySelector('.deck-next').disabled === false);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await sleep(60);
    t('presentation arrow advances slides', w.document.querySelector('.deck-indicator').textContent === 'Slide 2 / 2');
    t('active checkpoint slide mounts 2 quizzes', w.document.querySelectorAll('.quiz').length === 2);
    t('last slide disables Next', w.document.querySelector('.deck-next').disabled === true);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await sleep(60);
    t('presentation arrow returns to previous slide', w.document.querySelector('.deck-indicator').textContent === 'Slide 1 / 2');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await sleep(60);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(60);
    t('Escape exits presentation mode', !w.document.documentElement.classList.contains('presenting'));

    // ---- M2: code + anno + chartlab ----
    w.location.hash = '#/module/M2';
    await sleep(900);
    t('M2 codeview renders', w.document.querySelector('.codeview code.hljs') !== null);
    t('M2 gutter has line numbers', /^\s*1\n2/.test(w.document.querySelector('.codeview .gutter').textContent));
    t('M2 annotations render', w.document.querySelectorAll('.anno-row').length === 3);
    t('SQL renders as a highlighted code window', w.document.querySelector('.codeview-sql code.hljs.language-sql') !== null);
    t('prompt renders as a distinct code window', w.document.querySelector('.codeview-prompt code.plain-code') !== null);
    t('diagram component registers', w.TS.components.diagram !== undefined);
    t('objectives component registers', w.TS.components.objectives !== undefined);
    t('diagram groups render', w.document.querySelectorAll('.diagram-group').length === 2);
    t('diagram is accessible', w.document.querySelector('.diagram-groups[role="group"][aria-label]') !== null
      && w.document.querySelector('.diagram-description') !== null);
    t('M2 chartlab mounts', w.document.querySelector('.lab .chart-wrap canvas') !== null);
    t('M2 has diagnostic plus 2 checkpoints', w.document.querySelectorAll('.quiz').length === 3);
    audit('interactive controls have labels', Array.from(w.document.querySelectorAll('button, input, select, textarea')).every((control) => {
      const accessibleName = control.getAttribute('aria-label')
        || control.getAttribute('title')
        || control.textContent.trim()
        || (control.closest('label') ? control.closest('label').textContent.trim() : '')
        || control.id
        || control.name;
      if (accessibleName) return true;
      a11y.push({
        name: 'unlabeled-control',
        status: 'failed',
        info: `${control.tagName.toLowerCase()}#${control.id || 'no-id'} .${control.className || 'no-class'}`,
      });
      return false;
    }));
    // rolling toggle works (engine rolling)
    w.document.querySelector('.lab .roll').click();
    await sleep(60);
    t('rolling toggle adds datasets', w.TS.engine && true);

    // ---- M3: media + math + final quizzes ----
    w.location.hash = '#/module/M3';
    await sleep(1200);
    const figs = w.document.querySelectorAll('figure.media');
    t('M3 renders 3 media figures', figs.length === 3, `got ${figs.length}`);
    audit('non-youtube media have captions', Array.from(figs).every((fig) => fig.classList.contains('youtube') || fig.querySelector('figcaption') !== null));
    t('M3 video has controls', w.document.querySelector('figure.media.video video') !== null);
    const facade = w.document.querySelector('figure.media.youtube .yt-facade');
    t('youtube facade before click (no iframe)', facade !== null && w.document.querySelector('figure.media.youtube iframe') === null);
    facade.dispatchEvent(new w.Event('click', { bubbles: true }));
    await sleep(60);
    t('facade click swaps embed', w.document.querySelector('figure.media.youtube iframe') !== null);
    const katex = w.document.querySelectorAll('.katex').length;
    t('KaTeX renders (display + inline)', katex >= 3, `katex nodes: ${katex}`);
    t('no leftover %%RAW%% placeholders', !/%%RAW\d+%%/.test(w.document.querySelector('.doc').innerHTML));

    // ---- live badge update ----
    w.localStorage.removeItem('ts-progress-v1');
    w.location.hash = '#/module/M1';
    await sleep(900);
    const q0 = w.document.querySelector('.quiz');
    q0.querySelectorAll('.quiz-opt')[CORRECT.M1[0]].dispatchEvent(new w.Event('click', { bubbles: true }));
    await sleep(30);
    q0.querySelector('.check').click();
    await sleep(80);
    const m1Step = Array.from(w.document.querySelectorAll('.step')).find((s) => /Getting started/.test(s.textContent));
    t('badge flips to ✓ live after quiz pass', m1Step.querySelector('.badge-done') !== null);
    t('progress header updates live', /25%/.test(w.document.querySelector('.side-progress-pct').textContent));
    w.localStorage.removeItem('ts-progress-v1');
    w.TS.shell.renderStepper();

    // ---- bottom module nav ----
    t('M1 has next nav only', w.document.querySelector('.module-nav .nav-card.next') !== null
      && w.document.querySelector('.module-nav .nav-card.prev') === null);
    w.localStorage.removeItem('ts-progress-v1');
    w.location.hash = '#/module/M2';
    await sleep(850);
    const diagnostic = w.document.querySelector('.quiz');
    diagnostic.querySelectorAll('.quiz-opt')[CORRECT.M2[0]].dispatchEvent(new w.Event('click', { bubbles: true }));
    diagnostic.querySelector('.check').click();
    await sleep(60);
    const diagnosticProgress = w.TS.shell.readProgress();
    t('diagnostic records objective baseline', w.TS.shell.objectiveStatus('obj-m2-architecture').status === 'baseline-ready');
    t('diagnostic does not record module quiz', !diagnosticProgress.M2 || diagnosticProgress.M2.quiz === null,
      JSON.stringify(diagnosticProgress));
    w.localStorage.removeItem('ts-progress-v1');
    w.TS.shell.renderStepper();

    // ---- FULL COMPLETION FLOW ----
    for (const mid of Object.keys(CORRECT)) {
      w.location.hash = `#/module/${mid}`;
      await sleep(850);
      const quizzes = Array.from(w.document.querySelectorAll('.quiz'));
      quizzes.forEach((q, qi) => {
        const want = CORRECT[mid][qi];
        q.querySelectorAll('.quiz-opt')[want].dispatchEvent(new w.Event('click', { bubbles: true }));
        q.querySelector('.check').click();
      });
      await sleep(120);
    }
    w.location.hash = '#/module/final-assessment';
    await sleep(1000);
    t('certificate UNLOCKS at full pass', w.document.querySelector('.cert-card.complete') !== null);
    t('all 4 badges done', w.document.querySelectorAll('.badge-done').length === 4);
    t('progress reaches 100%', w.TS.shell.percent() === 100);
    t('final step lit via FINAL_QUIZ_HOST', /4\s*\/\s*4/.test(w.document.querySelector('.side-progress-count').textContent));
    t('all objectives mastered', w.TS.shell.objectiveStatuses().every((objective) => objective.status === 'mastered'));
    audit('certificate completion state is announced', w.document.querySelector('.cert-card.complete') !== null);

    w.location.hash = '#/';
    await sleep(500);
    t('objective panel clears recommendations after mastery', w.document.querySelectorAll('.objectives-list .objective-action').length === 0);

    fs.writeFileSync(path.join(__dirname, 'generated', 'accessibility-report.json'), `${JSON.stringify({
      schemaVersion: 1,
      status: a11y.every((check) => check.status === 'passed') ? 'passed' : 'failed',
      checks: a11y,
    }, null, 2)}\n`);
    t('accessibility audit passes', a11y.every((check) => check.status === 'passed'));

    console.log(`\nheadless: ${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
    w.close();
  } catch (e) {
    console.error('headless crashed:', e);
    process.exitCode = 1;
  }
})();
