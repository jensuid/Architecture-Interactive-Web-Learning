'use strict';
(function () {
  function storageKey() {
    return `${window.TS.shell.COURSE_META.id}-flashcards-v1`;
  }

  function readState() {
    try { return JSON.parse(window.localStorage.getItem(storageKey())) || {}; }
    catch (e) { return {}; }
  }
  function writeState(state) {
    try { window.localStorage.setItem(storageKey(), JSON.stringify(state)); }
    catch (e) {}
  }

  function mount(holder, content, moduleId) {
    const cfg = window.TS.renderer.parseMiniYaml(content.split('\n'));
    const card = { id: cfg.id, front: cfg.front, back: cfg.back, moduleId };
    const state = readState();
    const current = state[card.id] || { id: card.id, box: 0, dueOn: 0 };
    holder.classList.add('flashcard-holder');
    holder.innerHTML = `
      <div class="flashcard">
        <div class="flashcard-face front">${card.front}</div>
        <div class="flashcard-face back" hidden>${card.back}</div>
        <div class="flashcard-actions">
          <button class="flash-flip btn secondary">Flip</button>
          <button class="flash-miss btn secondary" hidden>Miss</button>
          <button class="flash-hit btn" hidden>Got it</button>
        </div>
        <div class="flash-status">Box ${(current.box || 0) + 1} · due day ${current.dueOn || 0}</div>
      </div>`;
    const front = holder.querySelector('.front');
    const back = holder.querySelector('.back');
    const flip = holder.querySelector('.flash-flip');
    const miss = holder.querySelector('.flash-miss');
    const hit = holder.querySelector('.flash-hit');
    const status = holder.querySelector('.flash-status');

    function reveal() {
      front.hidden = true;
      back.hidden = false;
      flip.textContent = 'Hide';
      miss.hidden = false;
      hit.hidden = false;
    }
    function hide() {
      front.hidden = false;
      back.hidden = true;
      flip.textContent = 'Flip';
      miss.hidden = true;
      hit.hidden = true;
    }
    function grade(gotIt) {
      const next = window.TS.engine.advanceCard(current, gotIt, 0);
      state[card.id] = next;
      writeState(state);
      status.textContent = `Box ${next.box + 1} · due day ${next.dueOn}`;
      hide();
    }
    flip.addEventListener('click', () => (back.hidden ? reveal() : hide()));
    miss.addEventListener('click', () => grade(false));
    hit.addEventListener('click', () => grade(true));
  }

  window.TS._pending.push(['flashcard', mount]);
})();
