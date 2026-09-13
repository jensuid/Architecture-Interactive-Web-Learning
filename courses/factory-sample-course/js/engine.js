/* ============================================================
   TS.engine — DOMAIN ENGINE (per topic). PURE functions, zero DOM.
   ------------------------------------------------------------
   Template note: this file is OPTIONAL.
   - Non-quantitative topics: delete it (no component references it).
   - Quantitative topics: put your domain math/simulation here.

   Contract:
   - No DOM access, no fetch, no localStorage — testable in plain Node.
   - Every function deterministic (seed your own PRNG — see below).
   - Reference in components as window.TS.engine.fn(...).

   The demo API below (rolling, seedRng, walk) is enough for the
   generic chartlab to run on generated data. Replace freely.
   ============================================================ */
'use strict';
(function () {
  const E = {};

  // ---------- seeded PRNG (deterministic across runs/tests) ----------
  // mulberry32 — tiny, fast, good enough for teaching sims
  E.seedRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---------- demo: rolling statistics (used by chartlab) ----------
  E.rolling = function (values, window, stat) {
    const w = Math.max(2, Math.min(window | 0, values.length));
    const out = values.map(() => null);
    for (let i = w - 1; i < values.length; i++) {
      const slice = values.slice(i - w + 1, i + 1);
      if (stat === 'std') {
        const m = slice.reduce((s, x) => s + x, 0) / w;
        out[i] = Math.sqrt(slice.reduce((s, x) => s + (x - m) * (x - m), 0) / w);
      } else {
        out[i] = slice.reduce((s, x) => s + x, 0) / w;
      }
    }
    return out;
  };

  // ---------- demo: synthetic random walk (example domain function) ----------
  E.walk = function (n, start, step, seed) {
    const rng = E.seedRng(seed || 42);
    const out = [start];
    for (let i = 1; i < n; i++) out.push(out[i - 1] + (rng() - 0.5) * step);
    return out;
  };

  // ---------- V2: three-box Leitner review scheduling ----------
  E.LEITNER_INTERVALS = [1, 3, 7];
  E.advanceCard = function (card, gotIt, dayOffset) {
    const currentDay = Number(dayOffset || 0);
    const box = Math.max(0, Math.min(2, Number(card && card.box) || 0));
    const nextBox = gotIt ? Math.min(2, box + 1) : Math.max(0, box - 1);
    return {
      id: card.id,
      box: nextBox,
      reviewedOn: currentDay,
      dueOn: currentDay + E.LEITNER_INTERVALS[nextBox],
    };
  };
  E.isCardDue = function (card, dayOffset) {
    return Number(card.dueOn || 0) <= Number(dayOffset || 0);
  };

  window.TS = window.TS || {};
  window.TS.engine = E;
})();
