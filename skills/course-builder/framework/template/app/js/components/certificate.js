/* ============================================================
   certificate component — renders completion state from progress
   Reads TS.shell progress; shows certificate when ALL modules have
   perfect first-attempt quiz scores (score === total), else a
   progress checklist. cfg: title
   ============================================================ */
'use strict';
(function () {
  function mount(holder, cfg) {
    const S = window.TS.shell;
    const p = S.readProgress();
    const rows = S.MODULES.map((m) => {
      const st = p[m.id] || {};
      return { id: m.id, short: m.short, visited: !!st.visited, quiz: st.quiz };
    });
    const done = rows.filter((r) => r.quiz && r.quiz.score === r.quiz.total).length;
    const total = rows.length;
    const complete = done === total;
    const pct = Math.round((done / total) * 100);

    holder.innerHTML = `
      <div class="cert-card ${complete ? 'complete' : ''}">
        <div class="cert-head">${complete ? '🎓' : '📋'} ${cfg.title || 'Course completion'}</div>
        ${complete ? `
          <div class="cert-body">
            <div class="cert-title">Certificate of Completion</div>
            <div class="cert-sub">Interactive Time Series Analysis</div>
            <p>This certifies that the bearer has completed all 10 modules and the final
            assessment of the Time Series Lab — from exploration and decomposition through
            stationarity, autocorrelation, smoothing, ARIMA, evaluation, and modern methods —
            with passing first-attempt checkpoint scores.</p>
            <div class="cert-stats">${total}/${total} modules passed · ${pct}%</div>
            <div class="cert-date">Issued ${new Date().toLocaleDateString()}</div>
          </div>` : `
          <div class="cert-body">
            <div class="cert-progress">${done} / ${total} modules passed (${pct}%)</div>
            <p style="color:var(--muted); font-size:.9rem">Pass each module's checkpoint quiz
            (first attempt counts) to unlock the certificate. Modules you've visited show in
            the stepper above; passed quizzes turn their step dot green.</p>
            <ul class="cert-list">
              ${rows.map((r) => `<li class="${r.quiz && r.quiz.score === r.quiz.total ? 'pass' : r.visited ? 'seen' : ''}">
                <a href="#/module/${r.id}">${r.id === 'final-assessment' ? '★' : ''} ${r.short}</a>
                <span>${r.quiz ? (r.quiz.score === r.quiz.total ? '✔ passed' : `scored ${r.quiz.score}/${r.quiz.total} — revisit to pass on first attempt is locked, but mastery isn't`) : r.visited ? 'visited — quiz pending' : 'not started'}</span>
              </li>`).join('')}
            </ul>
          </div>`}
      </div>`;
  }
  (window.TS._pending = window.TS._pending || []).push(['certificate', mount]);
})();
