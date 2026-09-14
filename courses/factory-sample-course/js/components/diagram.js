/* Generic accessible diagram component. Input is compact JSON:
   { title, description, groups: [{ id, label, nodes: [...] }],
     relationships: [{ from, to, label }] } */
'use strict';
(function () {
  let instanceCount = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function mount(holder, config) {
    if (!config || !Array.isArray(config.groups)) throw new Error('diagram needs groups');
    const instanceId = `diagram-${++instanceCount}`;
    const nodes = config.groups.flatMap((group, groupIndex) => {
      if (typeof group === 'string') {
        const [label, nodeText] = group.split(':');
        return nodeText.split(',').map((node) => node.trim()).filter(Boolean).map((node, nodeIndex) => ({
          id: `${groupIndex + 1}-${nodeIndex + 1}`,
          label: node,
          group: label.trim(),
          x: 90,
          y: 45 + groupIndex * 125 + nodeIndex * 40,
        }));
      }
      return (group.nodes || []).map((node, nodeIndex) => ({
      id: `${group.id || `g${groupIndex + 1}`}-${nodeIndex + 1}`,
      label: node,
      x: 90,
      y: 45 + groupIndex * 125 + nodeIndex * 40,
      }));
    });
    const nodeMap = new Map(nodes.map((node) => [node.label, node]));
    const relationships = (config.relationships || []).map((relationship) => {
      if (typeof relationship !== 'string') return relationship;
      const [route, label] = relationship.split(':');
      const [from, to] = route.split('->').map((node) => node.trim());
      return { from, to, label: label ? label.trim() : 'connects to' };
    }).filter((relationship) => nodeMap.has(relationship.from) && nodeMap.has(relationship.to));
    const width = 560;
    const height = Math.max(190, config.groups.length * 125 + 65);
    const title = config.title || 'Diagram';
    const description = config.description || 'A structured diagram.';
    const normalizedGroups = config.groups.map((group, groupIndex) => {
      if (typeof group === 'string') {
        const [label, nodeText] = group.split(':');
        return { label: label.trim(), nodes: nodeText.split(',').map((node) => node.trim()).filter(Boolean) };
      }
      return { label: group.label || `Group ${groupIndex + 1}`, nodes: group.nodes || [] };
    });
    holder.classList.add('lab', 'diagram');
    holder.innerHTML = `
      <div class="lab-head"><span class="t">${title}</span><span class="c">diagram</span></div>
      <div class="diagram-canvas">
        <svg class="diagram-svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${instanceId}-title ${instanceId}-desc">
          <title id="${instanceId}-title">${escapeHtml(title)}</title>
          <desc id="${instanceId}-desc">${escapeHtml(description)}</desc>
          <defs><marker id="${instanceId}-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z"></path></marker></defs>
          ${relationships.map((relationship) => {
            const from = nodeMap.get(relationship.from);
            const to = nodeMap.get(relationship.to);
            const labelX = (from.x + to.x + 150) / 2;
            const labelY = (from.y + to.y) / 2 + 20;
            return `<g class="relationship" aria-label="${escapeHtml(`${relationship.from} ${relationship.label || 'connects to'} ${relationship.to}`)}">
              <path d="M${from.x + 150},${from.y + 21} C${from.x + 230},${from.y + 21} ${to.x - 80},${to.y + 21} ${to.x - 6},${to.y + 21}"></path>
              <rect x="${labelX - 30}" y="${labelY - 10}" width="60" height="18" rx="4"></rect>
              <text x="${labelX}" y="${labelY + 4}" text-anchor="middle">${escapeHtml(relationship.label || 'connects to')}</text>
            </g>`;
          }).join('')}
          ${nodes.map((node) => `<g class="node" aria-label="${escapeHtml(node.label)}">
            <rect x="${node.x}" y="${node.y}" width="150" height="42" rx="10"></rect>
            <text x="${node.x + 12}" y="${node.y + 27}">${escapeHtml(node.label)}</text>
          </g>`).join('')}
        </svg>
      </div>
      <ul class="sr-only" aria-label="${escapeHtml(title)} structure">
        ${normalizedGroups.map((group) => `<li><strong>${escapeHtml(group.label)}:</strong> ${escapeHtml(group.nodes.join(', '))}</li>`).join('')}
        ${relationships.map((relationship) => `<li>${escapeHtml(`${relationship.from} ${relationship.label || 'connects to'} ${relationship.to}`)}</li>`).join('')}
      </ul>
      <p class="diagram-description">${escapeHtml(description)}</p>`;
  }
  window.TS._pending.push(['diagram', mount]);
})();
