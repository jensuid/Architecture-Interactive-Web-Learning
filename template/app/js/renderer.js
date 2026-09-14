/* ============================================================
   TS.renderer — markdown → HTML: front-matter + fenced blocks
   Content contract: content/*.md fetched at runtime; ONE source.
   ============================================================ */
'use strict';
(function () {
  const R = {};
  const CONTENT_DIR = 'content/';

  // ---------- front-matter ----------
  function parseFrontMatter(text) {
    const fm = {};
    const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
    let body = text;
    if (m) {
      body = text.slice(m[0].length);
      m[1].split('\n').forEach((line) => {
        const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
        if (kv) fm[kv[1]] = kv[2].trim();
      });
    }
    return { fm, body };
  }
  R.parseFrontMatter = parseFrontMatter;

  // ---------- mini-YAML for interactive configs ----------
  function parseMiniYaml(lines) {
    const out = {};
    let listMode = null; // key currently collecting list items
    for (let raw of lines) {
      const line = raw.replace(/\s+$/, '');
      if (!line) continue;
      if (/^ {2}- /.test(raw) && listMode) { out[listMode].push(raw.replace(/^ {2}- /, '').trim()); continue; }
      const kv = line.match(/^([\w-]+):\s*(.*)$/);
      if (kv) {
        const k = kv[1]; let v = kv[2];
        listMode = null;
        if (v === '') { out[k] = []; listMode = k; }
        else if (/^-?\d*\.\d+$/.test(v)) out[k] = parseFloat(v);
        else if (/^-?\d+$/.test(v)) out[k] = parseInt(v, 10);
        else if (/^(true|false)$/.test(v)) out[k] = v === 'true';
        else out[k] = v.replace(/^["']|["']$/g, '');
      }
    }
    return out;
  }
  R.parseMiniYaml = parseMiniYaml;

  // ---------- fenced-block extraction ----------
  // Extracts ```python, ```anno, ```interactive, ```quiz blocks BEFORE markdown parse,
  // so marked never touches their content; placeholders are re-inserted after.
  // Also extracts $$...$$ and $...$ math (marked would otherwise eat the _ in LaTeX
  // subscripts as emphasis, e.g. \underbrace{T_t}_{...} → <em> corruption).
  const CODE_FENCES = ['python', 'sql', 'bash', 'shell', 'javascript', 'js', 'json', 'yaml'];
  const PROMPT_FENCES = ['prompt'];
  const FENCES = [...CODE_FENCES, ...PROMPT_FENCES, 'anno', 'interactive', 'quiz', 'media', 'flash'];
  const isCodeKind = (kind) => CODE_FENCES.includes(kind) || PROMPT_FENCES.includes(kind);
  function extractFences(body) {
    const store = [];
    const re = new RegExp('```(' + FENCES.join('|') + ')\\n([\\s\\S]*?)```', 'g');
    const mathRe = /\$\$[\s\S]*?\$\$|\$(?!\$)(?!\d)(?!\s)[^$\n]+?(?<!\s)\$(?!\$)(?!\d)/g;
    const stash = (s) => { store.push({ kind: 'raw', content: s }); return `%%RAW${store.length - 1}%%`; };
    const text = body
      .replace(re, (full, kind, content) => {
        store.push({ kind, content: content.replace(/\n$/, '') });
        return `\n<div class="fence-placeholder" data-i="${store.length - 1}"></div>\n`;
      })
      .replace(mathRe, stash);
    return { text, store };
  }
  function restoreMath(root, store) {
    if (!store.some((s) => s.kind === 'raw')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) {
      const m = walker.currentNode.data.match(/%%RAW(\d+)%%/);
      if (m) hits.push({ node: walker.currentNode, idx: Number(m[1]) });
    }
    hits.forEach(({ node, idx }) => {
      const frag = document.createElement('span');
      try {
        if (window.katex) {
          const raw = store[idx].content;
          const isDisplay = raw.startsWith('$$');
          const tex = isDisplay ? raw.slice(2, -2) : raw.slice(1, -1);
          frag.innerHTML = window.katex.renderToString(tex, { displayMode: isDisplay, throwOnError: false });
          if (isDisplay) frag.className = 'katex-display';
        } else {
          frag.textContent = store[idx].content;
        }
      } catch (e) { frag.textContent = store[idx].content; }
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ---------- quiz parsing ----------
  function parseQuiz(content) {
    // fields: id, q, opts (list), answer, expl, type
    const lines = content.split('\n');
    const cfg = parseMiniYaml(lines.filter((l) => !/^ {2}- /.test(l)));
    cfg.opts = [];
    cfg.objectives = [];
    let inOpts = false;
    let inObjectives = false;
    for (const raw of lines) {
      if (/^opts:/.test(raw)) { inOpts = true; inObjectives = false; continue; }
      if (/^objectives:/.test(raw)) { inObjectives = true; inOpts = false; continue; }
      if (/^ {2}- /.test(raw)) {
        if (inObjectives) cfg.objectives.push(raw.replace(/^ {2}- /, '').trim());
        else if (inOpts) cfg.opts.push(raw.replace(/^ {2}- /, '').trim());
        continue;
      }
      inOpts = false;
      inObjectives = false;
    }
    if (!cfg.objectives.length) delete cfg.objectives;
    // answer: may be "1" or "B" or "1" 0-based index
    let ans = cfg.answer;
    if (typeof ans === 'string' && /^[A-F]$/i.test(ans.trim())) ans = ans.trim().toUpperCase().charCodeAt(0) - 65;
    cfg.answer = Number(ans);
    return cfg;
  }
  R.parseQuiz = parseQuiz;

  // Math is extracted pre-markdown (see extractFences) and restored post-mount,
  // so no auto-render pass is needed — placeholders never enter marked's parser.

  // ---------- module rendering ----------
  // Cache token: per-boot timestamp, so every page load fetches fresh content.
  // (Content md/json is tiny; correctness beats caching here. Hard-code a number
  // in TS_CACHE to pin instead.)
  if (!window.TS_CACHE) window.TS_CACHE = 'b' + Date.now();

  R.loadText = async (path) => {
    const res = await fetch(path + `?v=${window.TS_CACHE}`);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.text();
  };

  // Mounts all fenced-block components for a parsed doc into placeholders.
  // Handles python+anno pairing (anno attaches to preceding python and is consumed).
  async function mountAll(root, store, moduleId) {
    for (let i = 0; i < store.length; i++) {
      if (store[i].consumed) continue;
      const holder = root.querySelector(`[data-i="${i}"]`);
      if (!holder) continue;
      const { kind, content } = store[i];
      try {
        if (isCodeKind(kind)) {
          mountCode(store, i, holder);
        } else if (kind === 'anno') {
          mountAnno(content, holder);
        } else if (kind === 'interactive') {
          await mountInteractive(content, holder);
        } else if (kind === 'quiz') {
          mountQuiz(content, holder, moduleId);
      } else if (kind === 'media') {
        mountMedia(content, holder);
      } else if (kind === 'flash') {
        window.TS.components.flashcard(holder, content, moduleId);
      }
      } catch (e) {
        holder.outerHTML = `<div class="lab">⚠️ component error: ${e.message}</div>`;
      }
    }
  }
  R.mountAll = mountAll;

  R.mountPlaceholder = async function(deck, holder) {
    const index = Number(holder.dataset.i);
    const store = JSON.parse(deck.dataset.store || '[]');
    const moduleId = deck.dataset.moduleId;
    const item = store[index];
    if (!item) return;
    try {
      if (isCodeKind(item.kind)) {
        if (store[index + 1] && store[index + 1].kind === 'anno') {
          mountCode(store, index, holder);
          const annoHolder = deck.querySelector(`[data-i="${index + 1}"]`);
          if (annoHolder) {
            annoHolder.dataset.mounted = 'true';
            annoHolder.hidden = true;
          }
        } else {
          mountCode(store, index, holder);
        }
      } else if (item.kind === 'anno') {
        mountAnno(item.content, holder);
      } else if (item.kind === 'interactive') {
        await mountInteractive(item.content, holder);
      } else if (item.kind === 'quiz') {
        mountQuiz(item.content, holder, moduleId);
      } else if (item.kind === 'media') {
        mountMedia(item.content, holder);
      } else if (item.kind === 'flash') {
        window.TS.components.flashcard(holder, item.content, moduleId);
      }
    } catch (e) {
      holder.outerHTML = `<div class="lab">⚠️ component error: ${e.message}</div>`;
    }
  };
  R.mountReadMode = async function(readBody, deck, id) {
    if (readBody.querySelector('.fence-placeholder')) return;
    const store = JSON.parse(deck.dataset.store || '[]');
    let mounts = readBody.querySelector('.read-mounts');
    if (!mounts) {
      const actions = readBody.querySelector('.read-body-actions');
      mounts = document.createElement('div');
      mounts.className = 'read-mounts';
      readBody.insertBefore(mounts, actions ? actions.nextSibling : readBody.firstChild);
    }
    for (let i = 0; i < store.length; i++) {
    if (store[i].kind === 'raw') continue;
      const holder = document.createElement('div');
      holder.className = 'fence-placeholder';
      holder.dataset.i = String(i);
      mounts.appendChild(holder);
      await R.mountPlaceholder(deck, holder);
    }
    restoreMath(readBody, store);
  };

  R.renderModule = async function (root, id) {
    const md = await R.loadText(`${CONTENT_DIR}${id}.md`);
    const { fm, body } = parseFrontMatter(md);
    const extracted = extractFences(body);
    const slideTexts = window.TS.deck.splitSlides(extracted.text);
    if (slideTexts.length < 2) {
      const html = window.marked.parse(extracted.text);
      root.innerHTML = `
        <article class="doc">
          <p class="kicker">${fm.kicker || 'Module'}</p>
          <h1>${fm.title || id}</h1>
          ${fm.subtitle ? `<p class="subtitle">${fm.subtitle}</p>` : ''}
          ${html}
        </article>`;
      await mountAll(root, extracted.store, id);
      restoreMath(root.querySelector('.doc') || root, extracted.store);
      return;
    }

    const slides = slideTexts.map((markdown, index) => {
      const directives = window.TS.deck.parseSlideDirectives(markdown);
      return { markdown, directives, title: window.TS.deck.slideTitle(markdown) || `Step ${index + 1}` };
    });
    const serializedStore = JSON.stringify(extracted.store);
    root.innerHTML = `
      <article class="doc deck-mode">
        <p class="kicker">${fm.kicker || 'Module'}</p>
        <h1>${fm.title || id}</h1>
        ${fm.subtitle ? `<p class="subtitle">${fm.subtitle}</p>` : ''}
        <div class="deck" data-module-id="${id}" data-store='${serializedStore.replace(/'/g, "&#39;")}'>
          <div class="deck-topbar">
            <span class="deck-indicator">Slide 1 / ${slides.length}</span>
            <div class="deck-dots">${slides.map((slide, index) => `<button class="deck-dot" data-index="${index}" aria-label="Go to ${slide.title}"></button>`).join('')}</div>
            <div class="deck-mode-actions">
              <button class="btn secondary read-toggle">Read mode</button>
              <button class="btn secondary present-toggle">Present</button>
            </div>
          </div>
          <div class="deck-slides">
            ${slides.map(slide => `<section class="slide" hidden data-note="${slide.directives.note || ''}">${window.marked.parse(slide.markdown)}</section>`).join('')}
          </div>
        <div class="deck-controls">
          <button class="btn secondary deck-prev">← Back</button>
          <button class="btn deck-next">Next →</button>
        </div>
        </div>
        <div class="read-body" hidden>
          <div class="read-body-actions">
            <button class="btn secondary read-toggle">Flow mode</button>
          </div>
          ${slides.map(slide => window.marked.parse(slide.markdown)).join('')}
        </div>
      </article>`;
    const active = window.TS.shell.currentSlide(id);
    const deck = root.querySelector('.deck');
    window.TS.deck.activateSlide(deck, active);
    window.TS.renderer.restoreSlideMath(deck, extracted.store);
    window.TS.shell.bindDeck(deck, id);
    const deckRoot = root.querySelector('.doc');
    const readBody = root.querySelector('.read-body');
    const readToggle = deck.querySelector('.deck-topbar .read-toggle');
    const readMode = deckRoot.classList.contains('read-mode');
    deck.hidden = readMode;
    readBody.hidden = !readMode;
    readToggle.textContent = readMode ? 'Flow mode' : 'Read mode';
  };

  R.restoreSlideMath = function(deck, store) {
    const slide = deck.querySelector('.slide.active');
    if (!slide) return;
    restoreMath(slide, store);
  };

  // Datasets are fetched lazily by NAME (no hardcoded list): any JSON you drop
  // into content/data/ is usable via `dataset: <name>` in an interactive block.
  // A missing file yields a visible component error, not a crash.
  R.getData = async (name) => {
    if (!R._dataCache) R._dataCache = {};
    if (R._dataCache[name]) return R._dataCache[name];
    const d = await (await fetch(`${CONTENT_DIR}data/${name}.json?v=${window.TS_CACHE}`)).json();
    R._dataCache[name] = d;
    return d;
  };

  // ---------- python + anno ----------
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function codeviewMeta(kind) {
    if (kind === 'python') return { label: '🐍 Python — runs on your machine', language: 'python' };
    if (kind === 'sql') return { label: '🗄 SQL', language: 'sql' };
    if (kind === 'bash' || kind === 'shell') return { label: '⌨ Shell script', language: 'bash' };
    if (kind === 'prompt') return { label: '✍ Prompt template', language: null };
    return { label: kind.toUpperCase(), language: kind === 'javascript' ? 'javascript' : kind };
  }

  function mountCode(store, i, holder) {
    // find anno block immediately after this python block
    let annoLines = null;
    if (store[i + 1] && store[i + 1].kind === 'anno') annoLines = parseAnno(store[i + 1].content);
    const code = store[i].content;
    const meta = codeviewMeta(store[i].kind);
    const hl = meta.language && window.hljs.getLanguage(meta.language)
      ? window.hljs.highlight(code, { language: meta.language }).value
      : escapeHtml(code);
    const lines = code.split('\n');
    const gutter = lines.map((_, j) => j + 1).join('\n');
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'btn copy-code';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', `Copy ${meta.label}`);
    copyButton.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(code);
        copyButton.textContent = 'Copied';
      } catch (error) {
        copyButton.textContent = 'Copy failed';
      }
      copyButton.classList.add(copyButton.textContent === 'Copied' ? 'copy-success' : 'copy-failure');
      window.setTimeout(() => {
        copyButton.textContent = 'Copy';
        copyButton.classList.remove('copy-success', 'copy-failure');
      }, 1600);
    });
    holder.innerHTML = `
      <div class="codeview codeview-${store[i].kind}">
        <div class="codeview-head"><span>${meta.label}</span><span>${lines.length} lines</span></div>
        <div class="codeview-body">
          <pre class="gutter">${gutter}</pre>
          <pre><code class="${meta.language ? `hljs language-${meta.language}` : 'plain-code'}">${hl}</code></pre>
        </div>
      </div>${annoLines ? annoHTML(annoLines) : ''}`;
    holder.querySelector('.codeview-head').appendChild(copyButton);
    if (annoLines) {
      store[i + 1].consumed = true; // anno attached; skip its placeholder
      const nextHolder = holder.closest('.doc').querySelector(`[data-i="${i + 1}"]`);
      if (nextHolder) nextHolder.style.display = 'none';
    }
  }
  function parseAnno(content) {
    return content.split('\n').filter((l) => l.trim()).map((l) => {
      const m = l.match(/^(\d+)\|(.*)$/);
      return m ? { line: Number(m[1]), text: m[2] } : null;
    }).filter(Boolean);
  }
  function annoHTML(rows) {
    return `<div class="anno">${rows.map((r) =>
      `<div class="anno-row"><span class="ln">L${r.line}</span><span class="tx">${r.text}</span></div>`).join('')}</div>`;
  }
  // anno left standalone (no preceding python)
  function mountAnno(content, holder) {
    const rows = parseAnno(content);
    holder.outerHTML = `<div>${annoHTML(rows)}</div>`;
  }

  // ---------- media (images / self-hosted video / YouTube embeds) ----------
  // ```media
  // type: image | video | youtube
  // src: media/foo.mp4        (image/video — relative to app/, i.e. content/media/…)
  // youtube: VIDEO_ID          (youtube only)
  // caption: Optional caption line
  // width: 560               (optional max px)
  // ```
  function mountMedia(content, holder) {
    const cfg = parseMiniYaml(content.split('\n'));
    const { type, src, youtube, caption, width } = cfg;
    if (!type) throw new Error('media block needs a type: image | video | youtube');
    let inner = '';
    if (type === 'image') {
      if (!src) throw new Error('image needs src: (path relative to app/)');
      inner = `<img src="${src}" alt="${caption || ''}" loading="lazy">`;
    } else if (type === 'video') {
      if (!src) throw new Error('video needs src: (path relative to app/)');
      inner = `<video controls preload="metadata" ${width ? `style="max-width:${width}px"` : ''}>
        <source src="${src}"></video>`;
    } else if (type === 'youtube') {
      if (!youtube) throw new Error('youtube needs youtube: VIDEO_ID (the part after watch?v=)');
      // Click-to-load facade: YouTube's ~1MB player JS only loads when the
      // learner clicks play. Faster pages, privacy-friendly, test-hermetic.
      inner = `<div class="yt-facade" data-yt="${youtube}" role="button" tabindex="0"
        aria-label="Play video"><span class="yt-play">▶</span><span class="yt-hint">Load video</span></div>`;
    } else {
      throw new Error(`unknown media type "${type}"`);
    }
    const fig = document.createElement('figure');
    fig.className = `media ${type}`;
    fig.innerHTML = `${inner}${caption ? `<figcaption>${caption}</figcaption>` : ''}`;
    const facade = fig.querySelector('.yt-facade');
    if (facade) {
      const activate = () => {
        fig.innerHTML = `<div class="yt-embed"><iframe
          src="https://www.youtube-nocookie.com/embed/${facade.dataset.yt}?rel=0&autoplay=1"
          title="${caption || 'YouTube video'}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen frameborder="0"></iframe></div>${caption ? `<figcaption>${caption}</figcaption>` : ''}`;
      };
      facade.addEventListener('click', activate);
      facade.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    }
    holder.replaceWith(fig);
  }

  // ---------- interactive ----------
  async function mountInteractive(content, holder) {
    const cfg = parseMiniYaml(content.split('\n'));
    const name = cfg.component;
    if (!name || !window.TS.components[name]) {
      throw new Error(`unknown component "${name}"`);
    }
    const data = cfg.dataset ? await R.getData(cfg.dataset) : null;
    window.TS.components[name](holder, cfg, data);
  }
  R.mountInteractive = mountInteractive;

  // ---------- quiz ----------
  function mountQuiz(content, holder, moduleId) {
    const cfg = parseQuiz(content);
    // mount via component registry (keeps quiz logic in one place)
    if (window.TS.components.quiz) window.TS.components.quiz(holder, cfg, null, moduleId);
  }

  // ---------- home ----------
  R.renderHome = async function (root) {
    const md = await R.loadText(`${CONTENT_DIR}home.md`);
    const { fm, body } = parseFrontMatter(md);
    const { text, store } = extractFences(body);
    const html = window.marked.parse(text);
    root.innerHTML = `
      <article class="doc">
        <p class="kicker">${fm.kicker || ''}</p>
        <h1>${fm.title || 'Time Series Lab'}</h1>
        ${fm.subtitle ? `<p class="subtitle">${fm.subtitle}</p>` : ''}
        ${html}
      </article>`;
    await mountAll(root, store, 'home');
    restoreMath(root.querySelector('.doc') || root, store);
  };

  window.TS = window.TS || {};
  window.TS.renderer = R;
})();
