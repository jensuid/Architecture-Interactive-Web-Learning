'use strict';
(function () {
  const D = {};

  function parseSlideDirectives(markdown) {
    const directives = {};
    const match = markdown.match(/<!--\s*slide:([^>]+?)-->/i);
    if (match) {
      const directiveText = match[1].replace(/(\w+):"([^"]*)"/g, (all, key, value) => {
        directives[key] = value;
        return '';
      });
      directiveText.split(/\s+/).forEach((pair) => {
        if (!pair) return;
        const [key, value] = pair.split(':');
        if (key) directives[key] = value === undefined ? true : value;
      });
    }
    return directives;
  }
  D.parseSlideDirectives = parseSlideDirectives;

  function splitSlides(text) {
    return text.split(/(?:^|\n)---(?:\n|$)/g)
      .map(part => part.trim())
      .filter(Boolean);
  }
  D.splitSlides = splitSlides;

  function slideTitle(markdown) {
    const heading = markdown.match(/^##\s+(.*)$/m);
    return heading ? heading[1].trim() : null;
  }
  D.slideTitle = slideTitle;

  function activateSlide(deck, index) {
    const slides = Array.from(deck.querySelectorAll('.slide'));
    if (!slides.length) return 0;
    const active = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('active', slideIndex === active);
      slide.hidden = slideIndex !== active;
      if (slideIndex !== active) return;
      if (!slide.dataset.mounted) {
        slide.dataset.mounted = 'true';
        slide.querySelectorAll('.fence-placeholder').forEach((holder) => {
          if (holder.dataset.mounted === 'true') return;
          holder.dataset.mounted = 'true';
          Promise.resolve(window.TS.renderer.mountPlaceholder(deck, holder)).catch(() => {
            holder.innerHTML = '<div class="lab">⚠️ component error: mount failed</div>';
          });
        });
      }
    });
    const indicator = deck.querySelector('.deck-indicator');
    if (indicator) indicator.textContent = `Slide ${active + 1} / ${slides.length}`;
    const dots = Array.from(deck.querySelectorAll('.deck-dot'));
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === active));
    const previous = deck.querySelector('.deck-prev');
    const next = deck.querySelector('.deck-next');
    if (previous) previous.disabled = active === 0;
    if (next) next.disabled = active === slides.length - 1;
    return active;
  }
  D.activateSlide = activateSlide;

  window.TS.deck = D;
})();
