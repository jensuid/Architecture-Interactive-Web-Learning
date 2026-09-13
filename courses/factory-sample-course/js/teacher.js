'use strict';
(function () {
  const COURSE_NAME = "Factory Sample Course";
  const MODULES = ['M1', 'M2', 'M3', 'final-assessment'];

  function decodeSubmission(code) {
    const [format, encoded] = String(code || '').trim().split('.');
    if (format !== 'MDA1') throw new Error('Unknown format');
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (payload.course !== COURSE_NAME || !payload.progress) throw new Error('Invalid course payload');
    return payload;
  }

  function summarize(payload) {
    const passed = MODULES.filter((id) => {
      const quiz = payload.progress[id] && payload.progress[id].quiz;
      return quiz && quiz.score === quiz.total;
    }).length;
    return {
      name: payload.studentName || 'Student',
      date: payload.exportedAt || 'unknown',
      passed,
      total: MODULES.length,
      percent: Math.round((passed / MODULES.length) * 100),
    };
  }

  function parseSubmissions(text) {
    const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const submissions = [];
    const errors = [];
    lines.forEach((line, index) => {
      try {
        submissions.push(summarize(decodeSubmission(line)));
      } catch (e) {
        errors.push(`Line ${index + 1}: ${e.message}`);
      }
    });
    return { submissions, errors };
  }

  function mount() {
    const form = document.querySelector('#teacher-form');
    const output = document.querySelector('#teacher-results');
    form.querySelector('.parse').addEventListener('click', () => {
      const { submissions, errors } = parseSubmissions(form.querySelector('textarea').value);
      output.innerHTML = `
        <div class="teacher-summary">${submissions.length} valid · ${errors.length} invalid</div>
        <table>
          <thead><tr><th>Student</th><th>Exported</th><th>Modules</th><th>Progress</th></tr></thead>
          <tbody>
            ${submissions.map(row => `<tr><td>${row.name}</td><td>${row.date}</td><td>${row.passed}/${row.total}</td><td>${row.percent}%</td></tr>`).join('')}
          </tbody>
        </table>
        ${errors.length ? `<ul class="teacher-errors">${errors.map(error => `<li>${error}</li>`).join('')}</ul>` : ''}`;
    });
  }

  window.MDA_TEACHER = { decodeSubmission, parseSubmissions, mount };
  document.addEventListener('DOMContentLoaded', mount);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    Promise.resolve().then(() => {
      if (!window.MDA_TEACHER_BOOTED) {
        window.MDA_TEACHER_BOOTED = true;
        mount();
      }
    });
  }
})();
