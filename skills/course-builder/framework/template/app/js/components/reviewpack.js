'use strict';
(function () {
  function mount(holder) {
    const key = `${window.TS.shell.COURSE_META.id}-flashcards-v1`;
    const state = JSON.parse(window.localStorage.getItem(key) || '{}');
    const cards = Object.values(state);
    const due = cards.filter(card => window.TS.engine.isCardDue(card, 0));
    holder.classList.add('lab');
    holder.innerHTML = `
      <div class="lab-head"><span class="t">Review pack</span><span class="c">lab</span></div>
      <p class="lab-sub">Cards scheduled for today appear here.</p>
      <div class="review-count">${due.length} card${due.length === 1 ? '' : 's'} due</div>
      <div class="review-list">
        ${due.length ? due.map(card => `<a class="review-item" href="#/module/${card.id.split(':')[0]}">Review ${card.id}</a>`).join('') : '<p>No cards are due today. Flip a flashcard to schedule your next review.</p>'}
      </div>`;
  }
  window.TS._pending.push(['reviewpack', mount]);
})();
