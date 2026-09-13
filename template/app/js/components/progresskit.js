'use strict';
(function () {
  function mount(holder) {
    const S = window.TS.shell;
    holder.classList.add('lab');
    holder.innerHTML = `
      <div class="lab-head"><span class="t">Progress export / import</span><span class="c">teacher kit</span></div>
      <p class="lab-sub">Generate a progress code for another browser, or restore progress from a backup.</p>
      <div class="progresskit-grid">
        <label>Name<input class="student-name" type="text" placeholder="Student name"></label>
        <textarea class="progress-code" rows="4" placeholder="Progress code"></textarea>
      </div>
      <div class="progresskit-actions">
        <button class="btn progress-generate">Generate code</button>
        <button class="btn secondary progress-copy">Copy code</button>
        <button class="btn secondary progress-import">Import code</button>
      </div>
      <div class="progress-status"></div>`;

    const nameInput = holder.querySelector('.student-name');
    const codeField = holder.querySelector('.progress-code');
    const status = holder.querySelector('.progress-status');
    async function copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        codeField.select();
        return document.execCommand('copy');
      }
    }
    holder.querySelector('.progress-generate').addEventListener('click', () => {
      try {
        codeField.value = S.exportProgress(nameInput.value);
        status.textContent = `Generated for ${nameInput.value || 'Student'}.`;
      } catch (e) {
        status.textContent = `Export failed: ${e.message}`;
      }
    });
    holder.querySelector('.progress-copy').addEventListener('click', async () => {
      if (!codeField.value.trim()) {
        status.textContent = 'Generate a code before copying.';
        return;
      }
      status.textContent = await copy(codeField.value) ? 'Copied to clipboard.' : 'Select the code and copy manually.';
    });
    holder.querySelector('.progress-import').addEventListener('click', () => {
      try {
        const payload = S.importProgress(codeField.value);
        status.textContent = `Imported progress for ${payload.studentName}.`;
      } catch (e) {
        status.textContent = `Import failed: ${e.message}`;
      }
    });
  }
  window.TS._pending.push(['progresskit', mount]);
})();
