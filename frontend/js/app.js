// Main application bootstrap
const App = (() => {
  let role = null;    // 'dm' or 'player'
  let mode = null;    // 'online' or 'offline'
  let playerTag = null;
  let dmToken = null;

  // The three PCs
  const PLAYERS = [
    { tag: 'benwull', name: 'Benwull', color: '#2ecc71', icon: '🍀' },
    { tag: 'asgar', name: 'Asgar', color: '#3498db', icon: '⚔️' },
    { tag: 'jack', name: 'Jack', color: '#e74c3c', icon: '🪣' }
  ];

  function init() {
    showLoginScreen();
  }

  function showLoginScreen() {
    const modal = document.getElementById('modal-overlay');
    modal.innerHTML = `
      <div class="modal login-modal">
        <h2>M3 Combat Tracker</h2>
        <p class="modal-subtitle">Choose your seat</p>

        <div class="login-grid">
          <button class="login-card login-dm" id="btn-login-dm">
            <div class="login-icon">🎲</div>
            <div class="login-name">Dungeon Master</div>
            <div class="login-hint">Full control</div>
          </button>

          ${PLAYERS.map(p => `
            <button class="login-card login-player" data-tag="${p.tag}" style="--player-color: ${p.color}">
              <div class="login-icon">${p.icon}</div>
              <div class="login-name">${p.name}</div>
              <div class="login-hint">Player view</div>
            </button>
          `).join('')}
        </div>

        <div id="dm-auth" class="dm-auth hidden">
          <input type="password" id="input-dm-pin" placeholder="DM Password" class="modal-input" autocomplete="off">
          <button class="btn btn-primary" id="btn-dm-submit">Enter</button>
          <p id="dm-auth-error" class="auth-error hidden">Wrong password</p>
        </div>

        <div class="login-footer">
          <button class="btn btn-sm" id="btn-offline-mode">Offline Mode</button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';

    // DM login
    document.getElementById('btn-login-dm').addEventListener('click', () => {
      const authBox = document.getElementById('dm-auth');
      authBox.classList.remove('hidden');
      document.getElementById('input-dm-pin').focus();
    });

    document.getElementById('btn-dm-submit').addEventListener('click', attemptDmLogin);
    document.getElementById('input-dm-pin').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptDmLogin();
    });

    // Player logins
    document.querySelectorAll('.login-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const player = PLAYERS.find(p => p.tag === tag);
        role = 'player';
        mode = 'online';
        playerTag = tag;
        modal.style.display = 'none';
        Sync.init();
        Sync.joinAsPlayer(tag);
        startApp();
      });
    });

    // Offline mode
    document.getElementById('btn-offline-mode').addEventListener('click', () => {
      role = 'dm';
      mode = 'offline';
      modal.style.display = 'none';
      // Load saved state if exists
      const saved = localStorage.getItem('m3combat_state');
      if (saved) {
        try { State.setState(JSON.parse(saved)); } catch(e) {}
      }
      startApp();
    });
  }

  async function attemptDmLogin() {
    const pin = document.getElementById('input-dm-pin').value;
    const errEl = document.getElementById('dm-auth-error');
    if (!pin) return;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        role = 'dm';
        mode = 'online';
        dmToken = data.token;
        document.getElementById('modal-overlay').style.display = 'none';
        Sync.init();
        Sync.setDmToken(dmToken);
        startApp();
      } else {
        errEl.classList.remove('hidden');
        document.getElementById('input-dm-pin').value = '';
        document.getElementById('input-dm-pin').focus();
      }
    } catch (e) {
      errEl.textContent = 'Connection error';
      errEl.classList.remove('hidden');
    }
  }

  function startApp() {
    Canvas.init(document.getElementById('grid-canvas'));
    Tokens.init();
    Drawing.init();
    Measure.init();
    Stats.init();
    Initiative.init();
    Toolbar.init();

    // Auto-save locally every 5 seconds
    if (mode === 'offline') {
      setInterval(() => {
        localStorage.setItem('m3combat_state', JSON.stringify(State.getState()));
      }, 5000);
    }

    // Update header info
    const roomDisplay = document.getElementById('room-code-display');
    if (roomDisplay) {
      if (mode === 'offline') roomDisplay.textContent = 'Offline';
      else if (role === 'dm') roomDisplay.textContent = 'DM';
      else roomDisplay.textContent = playerTag.charAt(0).toUpperCase() + playerTag.slice(1);
    }

    const statusEl = document.getElementById('sync-status');
    if (statusEl) statusEl.textContent = mode === 'offline' ? 'Auto-saving' : 'Connected';

    // Menu buttons
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', IO.exportState);

    const importBtn = document.getElementById('btn-import');
    if (importBtn) importBtn.addEventListener('click', IO.importState);

    const disconnectBtn = document.getElementById('btn-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
      if (mode === 'online') Sync.disconnect();
      State.reset();
      location.reload();
    });

    // Start polling for players
    if (mode === 'online' && role === 'player') {
      Sync.startPolling();
    }
  }

  function getRole() { return role; }
  function getMode() { return mode; }
  function getPlayerTag() { return playerTag; }
  function getDmToken() { return dmToken; }
  function getPlayers() { return PLAYERS; }

  return { init, getRole, getMode, getPlayerTag, getDmToken, getPlayers };
})();

document.addEventListener('DOMContentLoaded', App.init);
