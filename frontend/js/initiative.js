// Initiative tracker panel
const Initiative = (() => {
  let panel;

  function init() {
    panel = document.getElementById('initiative-panel');
    render();
    State.subscribe(render);
  }

  function render() {
    if (!panel) return;
    const state = State.getState();
    const isDM = App.getRole() === 'dm';
    const order = state.initiative.order;
    const currentIdx = state.initiative.currentIndex;
    const round = state.initiative.round;

    const sortedTokens = order
      .map(id => state.tokens.find(t => t.id === id))
      .filter(Boolean);

    panel.innerHTML = `
      <div class="init-header">
        <span class="init-title">Initiative</span>
        <span class="init-round">Round ${round}</span>
      </div>
      <div class="init-list">
        ${sortedTokens.length === 0 ? '<div class="init-empty">No combatants</div>' : ''}
        ${sortedTokens.map((token, i) => `
          <div class="init-entry ${i === currentIdx ? 'init-active' : ''} ${!token.visible ? 'init-hidden' : ''}"
               data-token-id="${token.id}">
            <div class="init-indicator" style="background: ${token.color}"></div>
            <span class="init-name">${escHtml(token.name)}</span>
            <span class="init-value">${token.stats.initiative}</span>
            ${isDM ? `<button class="init-remove" data-remove-id="${token.id}" title="Remove">&times;</button>` : ''}
          </div>
        `).join('')}
      </div>
      ${isDM ? `
        <div class="init-controls">
          <button class="btn btn-sm" id="btn-init-prev" title="Previous turn">Prev</button>
          <button class="btn btn-sm btn-primary" id="btn-init-next" title="Next turn">Next</button>
          <button class="btn btn-sm" id="btn-init-sort" title="Sort by initiative">Sort</button>
          <button class="btn btn-sm" id="btn-init-add-all" title="Add all tokens">Add All</button>
          <button class="btn btn-sm btn-danger" id="btn-init-clear" title="Clear initiative">Clear</button>
        </div>
      ` : ''}
    `;

    bindEvents();
  }

  function bindEvents() {
    if (!panel) return;

    // Click entry to select token
    panel.querySelectorAll('.init-entry').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('init-remove')) return;
        const id = el.dataset.tokenId;
        Tokens.setSelected(id);
        const state = State.getState();
        const token = state.tokens.find(t => t.id === id);
        if (token) Stats.show(token);
      });
    });

    // Remove buttons
    panel.querySelectorAll('.init-remove').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.removeId;
        State.mutate(s => {
          const idx = s.initiative.order.indexOf(id);
          if (idx > -1) {
            s.initiative.order.splice(idx, 1);
            if (s.initiative.currentIndex >= s.initiative.order.length) {
              s.initiative.currentIndex = 0;
            }
          }
        });
      });
    });

    // Control buttons
    const nextBtn = panel.querySelector('#btn-init-next');
    if (nextBtn) nextBtn.addEventListener('click', nextTurn);

    const prevBtn = panel.querySelector('#btn-init-prev');
    if (prevBtn) prevBtn.addEventListener('click', prevTurn);

    const sortBtn = panel.querySelector('#btn-init-sort');
    if (sortBtn) sortBtn.addEventListener('click', sortByInitiative);

    const addAllBtn = panel.querySelector('#btn-init-add-all');
    if (addAllBtn) addAllBtn.addEventListener('click', addAllTokens);

    const clearBtn = panel.querySelector('#btn-init-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearInitiative);
  }

  function nextTurn() {
    State.mutate(s => {
      if (s.initiative.order.length === 0) return;
      s.initiative.currentIndex++;
      if (s.initiative.currentIndex >= s.initiative.order.length) {
        s.initiative.currentIndex = 0;
        s.initiative.round++;
      }
    });
  }

  function prevTurn() {
    State.mutate(s => {
      if (s.initiative.order.length === 0) return;
      s.initiative.currentIndex--;
      if (s.initiative.currentIndex < 0) {
        s.initiative.currentIndex = s.initiative.order.length - 1;
        s.initiative.round = Math.max(1, s.initiative.round - 1);
      }
    });
  }

  function sortByInitiative() {
    State.mutate(s => {
      const tokens = s.tokens;
      s.initiative.order.sort((a, b) => {
        const ta = tokens.find(t => t.id === a);
        const tb = tokens.find(t => t.id === b);
        return (tb ? tb.stats.initiative : 0) - (ta ? ta.stats.initiative : 0);
      });
      s.initiative.currentIndex = 0;
    });
  }

  function addAllTokens() {
    State.mutate(s => {
      const existing = new Set(s.initiative.order);
      for (const token of s.tokens) {
        if (!existing.has(token.id)) {
          s.initiative.order.push(token.id);
        }
      }
    });
  }

  function clearInitiative() {
    State.mutate(s => {
      s.initiative.order = [];
      s.initiative.currentIndex = 0;
      s.initiative.round = 1;
    });
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  return { init, render };
})();
