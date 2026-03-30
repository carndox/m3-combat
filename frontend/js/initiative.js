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
    // Don't re-render if an initiative input is focused (user is typing)
    if (panel.querySelector('.init-input:focus')) return;

    const state = State.getState();
    const isDM = App.getRole() === 'dm';
    const order = state.initiative.order;
    const currentIdx = state.initiative.currentIndex;
    const round = state.initiative.round;

    const sortedTokens = order
      .map(id => state.tokens.find(t => t.id === id))
      .filter(Boolean);

    const currentTurnToken = sortedTokens[currentIdx];

    panel.innerHTML = `
      <div class="init-header">
        <span class="init-title">Initiative</span>
        <span class="init-round">Round ${round}</span>
      </div>
      ${currentTurnToken ? `
        <div class="init-current-turn">
          <div class="init-indicator-lg" style="background: ${currentTurnToken.color}"></div>
          <span>${escHtml(currentTurnToken.name)}'s Turn</span>
        </div>
      ` : ''}
      <div class="init-list">
        ${sortedTokens.length === 0 ? '<div class="init-empty">No combatants. Place tokens and click Add All.</div>' : ''}
        ${sortedTokens.map((token, i) => `
          <div class="init-entry ${i === currentIdx ? 'init-active' : ''} ${!token.visible ? 'init-hidden' : ''}"
               data-token-id="${token.id}" data-index="${i}">
            <div class="init-indicator" style="background: ${token.color}"></div>
            <span class="init-name">${escHtml(token.name)}</span>
            ${isDM ? `
              <input type="number" class="init-input" value="${token.stats.initiative}"
                     data-token-id="${token.id}" title="Initiative roll">
              <button class="init-remove" data-remove-id="${token.id}" title="Remove">&times;</button>
            ` : `
              <span class="init-value">${token.stats.initiative}</span>
            `}
          </div>
        `).join('')}
      </div>
      ${isDM ? `
        <div class="init-controls">
          <button class="btn btn-sm" id="btn-init-prev" title="Previous turn">&larr; Prev</button>
          <button class="btn btn-sm btn-primary" id="btn-init-next" title="Next turn">Next &rarr;</button>
        </div>
        <div class="init-controls">
          <button class="btn btn-sm" id="btn-init-sort" title="Sort highest to lowest">Sort</button>
          <button class="btn btn-sm" id="btn-init-add-all" title="Add all tokens to initiative">Add All</button>
          <button class="btn btn-sm" id="btn-init-roll" title="Roll d20 for all with initiative 0">Roll All</button>
          <button class="btn btn-sm btn-danger" id="btn-init-clear" title="Clear initiative order">Clear</button>
        </div>
      ` : ''}
    `;

    bindEvents();
  }

  function bindEvents() {
    if (!panel) return;

    // Click entry to select token on canvas
    panel.querySelectorAll('.init-entry').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('init-remove') || e.target.classList.contains('init-input')) return;
        const id = el.dataset.tokenId;
        Tokens.setSelected(id);
        const state = State.getState();
        const token = state.tokens.find(t => t.id === id);
        if (token) Stats.show(token);
      });
    });

    // Inline initiative editing
    panel.querySelectorAll('.init-input').forEach(el => {
      el.addEventListener('change', () => {
        const tokenId = el.dataset.tokenId;
        const newVal = parseInt(el.value) || 0;
        State.mutate(s => {
          const token = s.tokens.find(t => t.id === tokenId);
          if (token) token.stats.initiative = newVal;
        });
      });
      // Select all text on focus for easy overwrite
      el.addEventListener('focus', () => el.select());
      // Enter key moves to next input
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.target.blur();
          const entries = [...panel.querySelectorAll('.init-input')];
          const idx = entries.indexOf(e.target);
          if (idx < entries.length - 1) entries[idx + 1].focus();
        }
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
              s.initiative.currentIndex = Math.max(0, s.initiative.order.length - 1);
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

    const rollBtn = panel.querySelector('#btn-init-roll');
    if (rollBtn) rollBtn.addEventListener('click', rollAllInitiative);

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
      // Save current turn token ID to preserve whose turn it is
      const currentId = s.initiative.order[s.initiative.currentIndex];

      s.initiative.order.sort((a, b) => {
        const ta = tokens.find(t => t.id === a);
        const tb = tokens.find(t => t.id === b);
        return (tb ? tb.stats.initiative : 0) - (ta ? ta.stats.initiative : 0);
      });

      // Restore current turn to the same token
      if (currentId) {
        const newIdx = s.initiative.order.indexOf(currentId);
        s.initiative.currentIndex = newIdx >= 0 ? newIdx : 0;
      }
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

  function rollAllInitiative() {
    State.mutate(s => {
      // Roll d20 for tokens that have initiative 0 (unset)
      for (const tokenId of s.initiative.order) {
        const token = s.tokens.find(t => t.id === tokenId);
        if (token && token.stats.initiative === 0) {
          token.stats.initiative = Math.floor(Math.random() * 20) + 1;
        }
      }
      // Auto-sort after rolling
      s.initiative.order.sort((a, b) => {
        const ta = s.tokens.find(t => t.id === a);
        const tb = s.tokens.find(t => t.id === b);
        return (tb ? tb.stats.initiative : 0) - (ta ? ta.stats.initiative : 0);
      });
      s.initiative.currentIndex = 0;
    });
  }

  function clearInitiative() {
    State.mutate(s => {
      // Reset all token initiative values back to 0
      for (const tokenId of s.initiative.order) {
        const token = s.tokens.find(t => t.id === tokenId);
        if (token) token.stats.initiative = 0;
      }
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
