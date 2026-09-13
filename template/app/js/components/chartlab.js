/* ============================================================
   chartlab component — interactive line chart (hover, zoom, range)
   cfg: dataset, height(tall), title, sub, note, hideControls
   "rolling stats" toggle adds rolling mean/std overlay with window slider.
   ============================================================ */
'use strict';
(function () {
  const E = () => window.TS.engine;

  function mount(holder, cfg, data) {
    if (!data || !data.values) throw new Error('chartlab needs dataset');
    const labels = data.labels || data.values.map((_, i) => String(i));
    holder.classList.add('lab');
    holder.innerHTML = `
      <div class="lab-head"><span class="t">${cfg.title || 'Interactive chart'}</span><span class="c">lab</span></div>
      <p class="lab-sub">${cfg.sub || 'Hover for values. Drag on the chart to zoom; double-click to reset.'}</p>
      <div class="lab-controls" ${cfg.hideControls ? 'style="display:none"' : ''}>
        <label>Window
          <input type="range" min="2" max="${Math.min(48, Math.floor(data.values.length / 2))}" value="12" class="win">
          <span class="val win-v">12</span>
        </label>
        <label>Range
          <select class="range">
            <option value="all">All</option>
            <option value="half">Last half</option>
            <option value="quarter">Last quarter</option>
          </select>
        </label>
        <label class="roll-toggle"><input type="checkbox" class="roll"> rolling stats</label>
      </div>
      <div class="chart-wrap ${cfg.tall ? 'tall' : ''}"><canvas></canvas></div>
      <p class="lab-note" ${cfg.note ? '' : 'style="display:none"'}>${cfg.note || ''}</p>`;

    const canvas = holder.querySelector('canvas');
    const winEl = holder.querySelector('.win');
    const winV = holder.querySelector('.win-v');
    const rangeEl = holder.querySelector('.range');
    const rollEl = holder.querySelector('.roll');
    const wrap = holder.querySelector('.chart-wrap');
    let chart = null;

    const sliceByRange = (arr) => {
      const n = arr.length;
      if (rangeEl.value === 'half') return arr.slice(-Math.floor(n / 2));
      if (rangeEl.value === 'quarter') return arr.slice(-Math.floor(n / 4));
      return arr;
    };

    function cssVar(name) {
      return getComputedStyle(holder).getPropertyValue(name).trim() || '#888';
    }

    function render() {
      const w = Number(winEl.value);
      winV.textContent = String(w);
      const values = sliceByRange(data.values);
      const labs = sliceByRange(labels);
      const showRoll = rollEl.checked;
      const rollMean = showRoll ? E().rolling(values, w, 'mean') : null;
      const rollStd = showRoll ? E().rolling(values, w, 'std') : null;
      const datasets = [
        {
          label: data.name || 'series', data: values, borderColor: cssVar('--accent'),
          backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.3,
        },
      ];
      if (showRoll) {
        datasets.push({ label: `rolling mean (${w})`, data: rollMean, borderColor: cssVar('--ok'), borderWidth: 2, pointRadius: 0 });
        datasets.push({ label: `rolling std (${w})`, data: rollStd, borderColor: cssVar('--bad'), borderWidth: 1.5, pointRadius: 0, borderDash: [5, 4] });
      }
      if (chart) chart.destroy();
      chart = new Chart(canvas, {
        type: 'line',
        data: { labels: labs, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { maxTicksLimit: 12, color: cssVar('--chart-text') }, grid: { color: cssVar('--chart-grid') } },
            y: { ticks: { color: cssVar('--chart-text') }, grid: { color: cssVar('--chart-grid') } },
          },
          plugins: {
            legend: { labels: { color: cssVar('--chart-text'), boxWidth: 12 } },
            tooltip: { callbacks: { title: (items) => `${data.name || ''} · ${items[0].label}` } },
          },
        },
      });
    }

    winEl.addEventListener('input', render);
    rangeEl.addEventListener('change', render);
    rollEl.addEventListener('change', render);

    // drag-zoom + double-click reset (plugin-free, pointer events)
    let downX = null;
    wrap.addEventListener('pointerdown', (e) => { downX = e.clientX; });
    wrap.addEventListener('pointerup', (e) => {
      if (downX === null) return;
      const dx = Math.abs(e.clientX - downX);
      const x0 = downX;
      downX = null;
      if (dx < 12) return; // treat as click
      const rect = wrap.getBoundingClientRect();
      const frac1 = Math.min(x0, e.clientX) / rect.width;
      const frac2 = Math.max(x0, e.clientX) / rect.width;
      applyZoom(frac1, frac2);
    });
    wrap.addEventListener('dblclick', () => {
      if (chart) { chart.options.scales.x.min = undefined; chart.options.scales.x.max = undefined; chart.update(); }
    });
    function applyZoom(f1, f2) {
      if (!chart || f2 - f1 < 0.05) return;
      const n = chart.data.labels.length;
      chart.options.scales.x.min = Math.floor(f1 * n);
      chart.options.scales.x.max = Math.ceil(f2 * n);
      chart.update();
    }

    render();
  }
  (window.TS._pending = window.TS._pending || []).push(['chartlab', mount]);
})();
