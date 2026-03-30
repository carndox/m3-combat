// Main application bootstrap
const App = (() => {
  let role = null; // 'dm' or 'player'
  let mode = null; // 'online' or 'offline'
  let playerTag = null;

  function init() {
    // Check localStorage for a saved session (auto-save)
    const saved = localStorage.getItem('m3combat_state');
    showRoleModal(!!saved);
  }

  function showRoleModal(hasSavedState) {
    const modal = document.getElementById('modal-overlay');
    modal.innerHTML = `
      <div class="modal">
        <h2>M3 Combat Tracker</h2>
        <p class="modal-subtitle">D&D 5e Battle Grid</p>

        <div class="modal-buttons">
          <div class="modal-section">
            <button class="btn btn-primary btn-lg" id="btn-role-dm-offline">
              Start Session
            </button>
            <p class="modal-hint">Local DM mode. Place tokens, track stats, run combat.</p>
          </div>

          ${hasSavedState ? `
            <div class="modal-section">
              <button class="btn btn-lg" id="btn-resume">
                Resume Last Session
              </button>
              <p class="modal-hint">Continue where you left off.</p>
            </div>
          ` : ''}

          <div class="modal-divider">multiplayer</div>

          <div class="modal-section">
            <button class="btn btn-lg" id="btn-role-dm-online">
              Host Room
            </button>
            <p class="modal-hint">Create a room. Share the code with players.</p>
          </div>

          <div class="modal-section modal-join">
            <input type="text" id="input-room-code" placeholder="Room code" class="modal-input" maxlength="6">
            <input type="text" id="input-player-tag" placeholder="Your name" class="modal-input">
            <button class="btn btn-lg" id="btn-role-player">Join Room</button>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'flex';

    // Start local session (main use case)
    document.getElementById('btn-role-dm-offline').addEventListener('click', () => {
      role = 'dm';
      mode = 'offline';
      modal.style.display = 'none';
      startApp();
    });

    // Resume saved session
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        role = 'dm';
        mode = 'offline';
        modal.style.display = 'none';
        const saved = localStorage.getItem('m3combat_state');
        if (saved) {
          try { State.setState(JSON.parse(saved)); } catch(e) {}
        }
        startApp();
      });
    }

    // Host online room
    document.getElementById('btn-role-dm-online').addEventListener('click', async () => {
      role = 'dm';
      mode = 'online';
      modal.style.display = 'none';
      Sync.init();
      await Sync.createRoom();
      startApp();
    });

    // Join as player
    document.getElementById('btn-role-player').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value.trim();
      const tag = document.getElementById('input-player-tag').value.trim();
      if (!code || !tag) return;
      role = 'player';
      mode = 'online';
      playerTag = tag;
      modal.style.display = 'none';
      Sync.init();
      Sync.joinRoom(code, tag);
      startApp();
    });
  }

  function startApp() {
    Canvas.init(document.getElementById('grid-canvas'));
    Tokens.init();
    Drawing.init();
    Measure.init();
    Stats.init();
    Initiative.init();
    Toolbar.init();

    // Auto-save to localStorage every 5 seconds (offline mode)
    if (mode === 'offline') {
      setInterval(() => {
        const state = State.getState();
        localStorage.setItem('m3combat_state', JSON.stringify(state));
      }, 5000);

      const el = document.getElementById('room-code-display');
      if (el) el.textContent = 'Local';
      const statusEl = document.getElementById('sync-status');
      if (statusEl) statusEl.textContent = 'Auto-saving';
    }

    // Show room code for online DM
    if (mode === 'online' && role === 'dm' && Sync.getRoomCode()) {
      const el = document.getElementById('room-code-display');
      if (el) el.textContent = Sync.getRoomCode();
    }

    // Menu buttons
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', IO.exportState);

    const importBtn = document.getElementById('btn-import');
    if (importBtn) importBtn.addEventListener('click', IO.importState);

    const disconnectBtn = document.getElementById('btn-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
      if (mode === 'online') Sync.disconnect();
      State.reset();
      localStorage.removeItem('m3combat_state');
      showRoleModal(false);
    });
  }

  function getRole() { return role; }
  function getMode() { return mode; }
  function getPlayerTag() { return playerTag || (Sync.getPlayerTag ? Sync.getPlayerTag() : null); }

  return { init, getRole, getMode, getPlayerTag };
})();

// Start
document.addEventListener('DOMContentLoaded', App.init);
