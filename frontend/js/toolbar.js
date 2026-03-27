// Toolbar and tool switching
const Toolbar = (() => {
  let activeTool = 'select';
  let hoverGrid = null;
  let toolbarEl;

  const TOOLS = [
    { id: 'select', label: 'Select', icon: '&#9654;', dmOnly: false },
    { id: 'place', label: 'Place Token', icon: '&#9679;', dmOnly: true },
    { id: 'draw', label: 'Terrain', icon: '&#9632;', dmOnly: true },
    { id: 'freeform', label: 'Draw', icon: '&#9998;', dmOnly: true },
    { id: 'erase', label: 'Erase', icon: '&#9003;', dmOnly: true },
    { id: 'measure', label: 'Measure', icon: '&#8674;', dmOnly: false }
  ];

  function init() {
    toolbarEl = document.getElementById('toolbar');
    render();

    // Track hover position for grid highlight
    const cvs = Canvas.getCanvas();
    cvs.addEventListener('mousemove', (e) => {
      const cam = Canvas.getCamera();
      hoverGrid = screenToGrid(e.offsetX, e.offsetY, cam);
    });
    cvs.addEventListener('mouseleave', () => { hoverGrid = null; });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      switch (e.key.toLowerCase()) {
        case 'v': case '1': setActive('select'); break;
        case 'p': case '2': setActive('place'); break;
        case 't': case '3': setActive('draw'); break;
        case 'f': case '4': setActive('freeform'); break;
        case 'e': case '5': setActive('erase'); break;
        case 'm': case '6': setActive('measure'); break;
        case 'delete': case 'backspace':
          if (activeTool === 'select') Tokens.deleteSelected();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) State.redo();
            else State.undo();
          }
          break;
      }
    });
  }

  function render() {
    if (!toolbarEl) return;
    const isDM = App.getRole() === 'dm';

    let html = '<div class="toolbar-tools">';
    for (const tool of TOOLS) {
      if (tool.dmOnly && !isDM) continue;
      html += `
        <button class="tool-btn ${activeTool === tool.id ? 'active' : ''}"
                data-tool="${tool.id}" title="${tool.label}">
          <span class="tool-icon">${tool.icon}</span>
          <span class="tool-label">${tool.label}</span>
        </button>
      `;
    }
    html += '</div>';

    // Tool options
    html += '<div class="toolbar-options">';
    if (activeTool === 'place' && isDM) {
      const opts = Tokens.getPlacementOptions();
      html += `
        <input type="text" id="opt-token-name" value="${opts.name}" placeholder="Name" class="opt-input">
        <select id="opt-token-shape">
          <option value="circle" ${opts.shape === 'circle' ? 'selected' : ''}>Circle</option>
          <option value="square" ${opts.shape === 'square' ? 'selected' : ''}>Square</option>
          <option value="triangle" ${opts.shape === 'triangle' ? 'selected' : ''}>Triangle</option>
          <option value="diamond" ${opts.shape === 'diamond' ? 'selected' : ''}>Diamond</option>
        </select>
        <input type="color" id="opt-token-color" value="${opts.color}">
        <select id="opt-token-size">
          <option value="1" ${opts.size === 1 ? 'selected' : ''}>1x1</option>
          <option value="2" ${opts.size === 2 ? 'selected' : ''}>2x2</option>
          <option value="3" ${opts.size === 3 ? 'selected' : ''}>3x3</option>
        </select>
      `;
    } else if (activeTool === 'draw' && isDM) {
      const terrainType = Drawing.getTerrainType();
      html += `
        <select id="opt-terrain-type">
          ${Drawing.getTerrainTypes().map(t =>
            `<option value="${t}" ${terrainType === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
          ).join('')}
        </select>
      `;
    } else if (activeTool === 'freeform' && isDM) {
      html += `
        <input type="color" id="opt-freeform-color" value="#ffffff">
        <label>Width: <input type="range" id="opt-freeform-width" min="1" max="10" value="3"></label>
      `;
    }
    html += '</div>';

    // Right side: undo/redo + sync
    if (isDM) {
      html += `
        <div class="toolbar-right">
          <button class="tool-btn" id="btn-undo" title="Undo (Ctrl+Z)">&#8630;</button>
          <button class="tool-btn" id="btn-redo" title="Redo (Ctrl+Shift+Z)">&#8631;</button>
          <span class="toolbar-divider"></span>
          <button class="btn btn-primary" id="btn-push" title="Push state to players">Push</button>
        </div>
      `;
    }

    toolbarEl.innerHTML = html;
    bindToolbarEvents();
  }

  function bindToolbarEvents() {
    // Tool buttons
    toolbarEl.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => setActive(btn.dataset.tool));
    });

    // Placement options
    const nameInput = toolbarEl.querySelector('#opt-token-name');
    if (nameInput) nameInput.addEventListener('input', () => Tokens.setPlacementOptions({ name: nameInput.value }));

    const shapeSelect = toolbarEl.querySelector('#opt-token-shape');
    if (shapeSelect) shapeSelect.addEventListener('change', () => Tokens.setPlacementOptions({ shape: shapeSelect.value }));

    const colorInput = toolbarEl.querySelector('#opt-token-color');
    if (colorInput) colorInput.addEventListener('input', () => Tokens.setPlacementOptions({ color: colorInput.value }));

    const sizeSelect = toolbarEl.querySelector('#opt-token-size');
    if (sizeSelect) sizeSelect.addEventListener('change', () => Tokens.setPlacementOptions({ size: parseInt(sizeSelect.value) }));

    // Terrain type
    const terrainSelect = toolbarEl.querySelector('#opt-terrain-type');
    if (terrainSelect) terrainSelect.addEventListener('change', () => Drawing.setTerrainType(terrainSelect.value));

    // Freeform options
    const freeformColor = toolbarEl.querySelector('#opt-freeform-color');
    if (freeformColor) freeformColor.addEventListener('input', () => Drawing.setFreeformColor(freeformColor.value));

    const freeformWidth = toolbarEl.querySelector('#opt-freeform-width');
    if (freeformWidth) freeformWidth.addEventListener('input', () => Drawing.setFreeformWidth(parseInt(freeformWidth.value)));

    // Undo/redo
    const undoBtn = toolbarEl.querySelector('#btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', () => State.undo());

    const redoBtn = toolbarEl.querySelector('#btn-redo');
    if (redoBtn) redoBtn.addEventListener('click', () => State.redo());

    // Push button
    const pushBtn = toolbarEl.querySelector('#btn-push');
    if (pushBtn) pushBtn.addEventListener('click', () => Sync.push());
  }

  function setActive(toolId) {
    const isDM = App.getRole() === 'dm';
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return;
    if (tool.dmOnly && !isDM) return;

    activeTool = toolId;
    if (toolId !== 'measure') Measure.clear();
    render();
  }

  function getActive() { return activeTool; }
  function getHoverGrid() { return hoverGrid; }

  return { init, getActive, getHoverGrid, setActive, render };
})();
