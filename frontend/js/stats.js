// Sidebar stat card for selected token
const Stats = (() => {
  let panel;
  let currentTokenId = null;

  const CONDITIONS = [
    'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled',
    'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
    'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
    'Exhaustion 1', 'Exhaustion 2', 'Exhaustion 3',
    'Exhaustion 4', 'Exhaustion 5', 'Exhaustion 6',
    'Concentrating'
  ];

  function init() {
    panel = document.getElementById('stats-panel');
  }

  function show(token) {
    if (!panel) return;
    currentTokenId = token.id;
    const isDM = App.getRole() === 'dm';
    const isOwner = token.owner === App.getPlayerTag();

    panel.innerHTML = `
      <div class="stat-card">
        <div class="stat-header" style="border-left: 4px solid ${token.color}">
          <input type="text" class="stat-name" value="${escHtml(token.name)}"
                 ${isDM ? '' : 'readonly'} data-field="name">
          <div class="stat-shape-color">
            ${isDM ? `
              <select data-field="shape">
                <option value="circle" ${token.shape === 'circle' ? 'selected' : ''}>Circle</option>
                <option value="square" ${token.shape === 'square' ? 'selected' : ''}>Square</option>
                <option value="triangle" ${token.shape === 'triangle' ? 'selected' : ''}>Triangle</option>
                <option value="diamond" ${token.shape === 'diamond' ? 'selected' : ''}>Diamond</option>
              </select>
              <input type="color" value="${token.color}" data-field="color">
              <select data-field="size">
                <option value="1" ${token.size === 1 ? 'selected' : ''}>1x1 (Medium)</option>
                <option value="2" ${token.size === 2 ? 'selected' : ''}>2x2 (Large)</option>
                <option value="3" ${token.size === 3 ? 'selected' : ''}>3x3 (Huge)</option>
              </select>
            ` : `<span class="stat-label">${token.shape} ${token.size}x${token.size}</span>`}
          </div>
        </div>

        <div class="stat-row">
          <label>HP</label>
          <div class="hp-group">
            <input type="number" class="stat-input hp-current" value="${token.stats.hpCurrent}"
                   ${isDM || isOwner ? '' : 'readonly'} data-field="hpCurrent">
            <span>/</span>
            <input type="number" class="stat-input hp-max" value="${token.stats.hpMax}"
                   ${isDM ? '' : 'readonly'} data-field="hpMax">
          </div>
          <div class="hp-bar-container">
            <div class="hp-bar" style="width: ${(token.stats.hpCurrent / Math.max(1, token.stats.hpMax)) * 100}%"></div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-box">
            <label>AC</label>
            <input type="number" class="stat-input" value="${token.stats.ac}"
                   ${isDM ? '' : 'readonly'} data-field="ac">
          </div>
          <div class="stat-box">
            <label>Initiative</label>
            <input type="number" class="stat-input" value="${token.stats.initiative}"
                   ${isDM || isOwner ? '' : 'readonly'} data-field="initiative">
          </div>
          <div class="stat-box">
            <label>Speed</label>
            <input type="number" class="stat-input" value="${token.stats.speed}"
                   ${isDM ? '' : 'readonly'} data-field="speed" step="5">
          </div>
        </div>

        ${isDM ? `
          <div class="stat-row">
            <label>Owner</label>
            <input type="text" class="stat-input" value="${token.owner || ''}"
                   data-field="owner" placeholder="player tag">
          </div>
          <div class="stat-row">
            <label>
              <input type="checkbox" data-field="visible" ${token.visible ? 'checked' : ''}>
              Visible to players
            </label>
          </div>
        ` : ''}

        <div class="stat-row">
          <label>Conditions</label>
          <div class="conditions-list">
            ${CONDITIONS.map(c => `
              <label class="condition-tag ${token.conditions.includes(c) ? 'active' : ''}">
                <input type="checkbox" data-condition="${c}"
                       ${token.conditions.includes(c) ? 'checked' : ''}
                       ${isDM || isOwner ? '' : 'disabled'}>
                ${c}
              </label>
            `).join('')}
          </div>
        </div>

        ${isDM ? `
          <div class="stat-row">
            <label>Spell Slots</label>
            <div class="spell-slots">
              ${[1,2,3,4,5,6,7,8,9].map(level => {
                const slots = token.stats.spellSlots[level] || [];
                if (slots.length === 0 && level > 1) return '';
                return `
                  <div class="slot-row">
                    <span>Lv${level}</span>
                    <button class="slot-add" data-slot-level="${level}">+</button>
                    <button class="slot-remove" data-slot-level="${level}">-</button>
                    ${slots.map((used, i) => `
                      <input type="checkbox" class="slot-check"
                             data-slot-level="${level}" data-slot-index="${i}"
                             ${used ? 'checked' : ''}>
                    `).join('')}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="stat-row">
            <label>Notes (DM only)</label>
            <textarea class="stat-notes" data-field="notes" rows="3">${escHtml(token.stats.notes)}</textarea>
          </div>

          <div class="stat-actions">
            <button class="btn btn-danger" id="btn-delete-token">Delete</button>
            <button class="btn" id="btn-duplicate-token">Duplicate</button>
          </div>
        ` : ''}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    if (!panel) return;
    const isDM = App.getRole() === 'dm';

    // Field changes
    panel.querySelectorAll('[data-field]').forEach(el => {
      const event = el.type === 'checkbox' ? 'change' :
                    el.tagName === 'SELECT' ? 'change' :
                    el.tagName === 'TEXTAREA' ? 'input' : 'change';
      el.addEventListener(event, () => updateField(el.dataset.field, el));
    });

    // Conditions
    panel.querySelectorAll('[data-condition]').forEach(el => {
      el.addEventListener('change', () => {
        const cond = el.dataset.condition;
        State.mutate(s => {
          const t = s.tokens.find(t => t.id === currentTokenId);
          if (!t) return;
          if (el.checked) {
            if (!t.conditions.includes(cond)) t.conditions.push(cond);
          } else {
            t.conditions = t.conditions.filter(c => c !== cond);
          }
        });
      });
    });

    // Spell slot checkboxes
    panel.querySelectorAll('.slot-check').forEach(el => {
      el.addEventListener('change', () => {
        const level = el.dataset.slotLevel;
        const index = parseInt(el.dataset.slotIndex);
        State.mutate(s => {
          const t = s.tokens.find(t => t.id === currentTokenId);
          if (t && t.stats.spellSlots[level]) {
            t.stats.spellSlots[level][index] = el.checked;
          }
        });
      });
    });

    // Spell slot add/remove
    panel.querySelectorAll('.slot-add').forEach(el => {
      el.addEventListener('click', () => {
        const level = el.dataset.slotLevel;
        State.mutate(s => {
          const t = s.tokens.find(t => t.id === currentTokenId);
          if (!t) return;
          if (!t.stats.spellSlots[level]) t.stats.spellSlots[level] = [];
          t.stats.spellSlots[level].push(false);
        });
        refreshCurrent();
      });
    });

    panel.querySelectorAll('.slot-remove').forEach(el => {
      el.addEventListener('click', () => {
        const level = el.dataset.slotLevel;
        State.mutate(s => {
          const t = s.tokens.find(t => t.id === currentTokenId);
          if (!t || !t.stats.spellSlots[level]) return;
          t.stats.spellSlots[level].pop();
        });
        refreshCurrent();
      });
    });

    // Delete/duplicate buttons
    const delBtn = panel.querySelector('#btn-delete-token');
    if (delBtn) delBtn.addEventListener('click', () => { Tokens.deleteSelected(); });

    const dupBtn = panel.querySelector('#btn-duplicate-token');
    if (dupBtn) dupBtn.addEventListener('click', () => {
      Tokens.duplicateSelected();
      refreshCurrent();
    });
  }

  function updateField(field, el) {
    State.mutate(s => {
      const t = s.tokens.find(t => t.id === currentTokenId);
      if (!t) return;

      switch (field) {
        case 'name': t.name = el.value; break;
        case 'shape': t.shape = el.value; break;
        case 'color': t.color = el.value; break;
        case 'size': t.size = parseInt(el.value); break;
        case 'hpCurrent': t.stats.hpCurrent = parseInt(el.value) || 0; break;
        case 'hpMax': t.stats.hpMax = parseInt(el.value) || 0; break;
        case 'ac': t.stats.ac = parseInt(el.value) || 0; break;
        case 'initiative': t.stats.initiative = parseInt(el.value) || 0; break;
        case 'speed': t.stats.speed = parseInt(el.value) || 0; break;
        case 'owner': t.owner = el.value || null; break;
        case 'visible': t.visible = el.checked; break;
        case 'notes': t.stats.notes = el.value; break;
      }
    });
  }

  function refreshCurrent() {
    if (!currentTokenId) return;
    const state = State.getState();
    const token = state.tokens.find(t => t.id === currentTokenId);
    if (token) show(token);
  }

  function hide() {
    if (panel) panel.innerHTML = '<div class="stat-empty">Select a token</div>';
    currentTokenId = null;
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  return { init, show, hide, refreshCurrent };
})();
