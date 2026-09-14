/* ============================================================
   quiz component — mcq & predict, instant feedback, first-attempt scoring
   ============================================================ */
'use strict';
(function () {
  function mount(holder, cfg, data, moduleId) {
    if (!cfg.opts || !cfg.opts.length) throw new Error('quiz has no options');
    const isPredict = (cfg.type || 'mcq') === 'predict';
    const isPractice = cfg.practice === true;
    holder.classList.add('quiz');
    if (isPractice) holder.classList.add('practice');
    holder.innerHTML = `
      <div class="quiz-head"><span>${isPractice ? '🟡 Practice check' : '✅ Checkpoint quiz'}</span>${isPredict ? '<span class="tag">predict</span>' : ''}</div>
      <div class="quiz-q">${cfg.q}</div>
      <div class="quiz-opts"></div>
      <div class="quiz-actions">
        <button class="check" disabled>Check</button>
        <button class="reset secondary" style="display:none">Try again</button>
      </div>
      <div class="quiz-expl" style="display:none"></div>`;

    const optsEl = holder.querySelector('.quiz-opts');
    const checkBtn = holder.querySelector('.check');
    const resetBtn = holder.querySelector('.reset');
    const explEl = holder.querySelector('.quiz-expl');
    let selected = null;
    let done = false;

    cfg.opts.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'quiz-opt';
      div.innerHTML = `<span class="key">${String.fromCharCode(65 + i)}</span><span class="tx">${opt}</span>`;
      div.addEventListener('click', () => {
        if (done) return;
        selected = i;
        optsEl.querySelectorAll('.quiz-opt').forEach((o) => o.classList.remove('selected'));
        div.classList.add('selected');
        checkBtn.disabled = false;
      });
      optsEl.appendChild(div);
    });

    checkBtn.addEventListener('click', () => {
      if (selected === null || done) return;
      done = true;
      const correct = selected === cfg.answer;
      optsEl.querySelectorAll('.quiz-opt').forEach((o, i) => {
        o.classList.remove('selected');
        if (i === cfg.answer) o.classList.add('correct');
        if (i === selected && !correct) o.classList.add('wrong');
      });
      explEl.style.display = 'block';
      explEl.className = 'quiz-expl ' + (correct ? 'good' : 'bad');
      explEl.innerHTML = (correct ? '✔ Correct — ' : '✘ Not quite — ') + (cfg.expl || '');
      if (isPractice) {
        checkBtn.style.display = 'inline-block';
        checkBtn.disabled = true;
        resetBtn.style.display = 'inline-block';
        selected = null;
        done = false;
      } else {
        checkBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
      }
      if (moduleId && !isPractice && window.TS.shell) {
        window.TS.shell.recordObjectiveResult(cfg.id, correct, cfg.diagnostic === true);
        if (cfg.diagnostic !== true) {
          window.TS.shell.recordQuiz(moduleId, correct ? 1 : 0, 1);
          // If this quiz belongs to the final gate but lives inside a content
          // module, ALSO record it to the gate step (see shell.FINAL_QUIZ_HOST).
          const host = window.TS.shell.FINAL_QUIZ_HOST;
          if (host && moduleId === host && /^final-/.test(cfg.id || '')) {
            window.TS.shell.recordQuiz('final-assessment', correct ? 1 : 0, 1);
          }
        }
      }
    });

    resetBtn.addEventListener('click', () => {
      done = false; selected = null;
      optsEl.querySelectorAll('.quiz-opt').forEach((o) => o.className = 'quiz-opt');
      explEl.style.display = 'none';
      checkBtn.style.display = 'inline-block';
      checkBtn.disabled = true;
      resetBtn.style.display = 'none';
    });
  }
  (window.TS._pending = window.TS._pending || []).push(['quiz', mount]);
})();
