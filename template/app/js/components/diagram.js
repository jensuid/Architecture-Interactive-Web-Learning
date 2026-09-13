/* Generic accessible diagram component. Input is compact JSON:
   { title, description, groups: [{ label, nodes: [...] }] } */
'use strict';
(function () {
  function mount(holder, config) {
    if (!config || !Array.isArray(config.groups)) throw new Error('diagram needs groups');
    const title = config.title || 'Diagram';
    const description = config.description || 'A structured diagram.';
    holder.classList.add('lab', 'diagram');
    holder.innerHTML = `
      <div class="lab-head"><span class="t">${title}</span><span class="c">diagram</span></div>
      <div class="diagram-groups" role="group" aria-label="${title}">
        ${config.groups.map((group) => `
          <section class="diagram-group">
            <h3>${group.label || 'Group'}</h3>
            <ul>${(group.nodes || []).map((node) => `<li>${node}</li>`).join('')}</ul>
          </section>
        `).join('')}
      </div>
      <p class="diagram-description">${description}</p>`;
  }
  window.TS._pending.push(['diagram', mount]);
})();
