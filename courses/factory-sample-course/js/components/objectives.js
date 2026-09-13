'use strict';
(function () {
  function statusLabel(status) {
    if (status === 'mastered') return 'Mastered';
    if (status === 'needs-review') return 'Review recommended';
    if (status === 'baseline-ready') return 'Baseline ready';
    if (status === 'diagnostic-ready') return 'Diagnostic ready';
    return 'In progress';
  }

  function mount(holder) {
    holder.classList.add('objectives-holder');
    holder.innerHTML = `
      <section class="objectives-panel" aria-labelledby="objectives-title">
        <div class="objectives-head">
          <h2 id="objectives-title">Learning objectives</h2>
          <p>Checkpoints generate recommendations. Diagnostics never unlock the certificate.</p>
        </div>
        <ul class="objectives-list" aria-live="polite"></ul>
      </section>`;

    const list = holder.querySelector('.objectives-list');
    function render() {
      const objectives = window.TS.shell.objectiveStatuses();
      list.innerHTML = objectives.map((objective) => `
        <li class="objective ${objective.status}">
          <span class="objective-status">${statusLabel(objective.status)}</span>
          <span class="objective-text">${objective.text}</span>
          <span class="objective-module">${objective.moduleShort}</span>
          ${objective.recommended ? `<a class="objective-action" href="#/module/${objective.moduleId}">Review</a>` : ''}
        </li>`).join('');
    }

    render();
    document.addEventListener('ts-objectives-updated', render);
  }

  (window.TS._pending = window.TS._pending || []).push(['objectives', mount]);
})();
