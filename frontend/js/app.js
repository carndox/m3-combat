// Main application bootstrap
const App = (() => {
  let role = null; // 'dm' or 'player'
  let playerTag = null;

  function init() {
    // Show role selection modal
    showRoleModal();
  }

  function showRoleModal() {
    const modal = document.getElementById('modal-overlay');
    modal.innerHTML = `
      <div class="modal">
        <h2>M3 Combat Tracker</h2>
        <div class="modal-buttons">
          <div class="modal-section">
            <button class="btn btn-primary btn-lg" id="btn-role-dm">DM (Create Room)</button>
            <p class="modal-hint">Create a new combat session</p>
          </div>
          <div class="modal-section">
            <button class="btn btn-lg" id="btn-role-dm-offline">DM (Offline)</button>
            <p class="modal-hint">No sync, local only</p>
          </div>
          <div class="modal-divider">or</div>
          <div class="modal-section">
            <input type="text" id="input-room-code" placeholder="Room code" class="modal-input" maxlength="6">
            <input type="text" id="input-player-tag" placeholder="Your name" class="modal-input">
            <button class="btn btn-lg" id="btn-role-player">Join as Player</button>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'flex';

    document.getElementById('btn-role-dm').addEventListener('click', async () => {
      role = 'dm';
      modal.style.display = 'none';
      Sync.init();
      await Sync.createRoom();
      startApp();
    });

    document.getElementById('btn-role-dm-offline').addEventListener('click', () => {
      role = 'dm';
      modal.style.display = 'none';
      startApp();
    });

    document.getElementById('btn-role-player').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value.trim();
      const tag = document.getElementById('input-player-tag').value.trim();
      if (!code || !tag) return;
      role = 'player';
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

    // Menu buttons
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', IO.exportState);

    const importBtn = document.getElementById('btn-import');
    if (importBtn) importBtn.addEventListener('click', IO.importState);

    const disconnectBtn = document.getElementById('btn-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
      Sync.disconnect();
      State.reset();
      showRoleModal();
    });

    // Show room code for DM
    if (role === 'dm' && Sync.getRoomCode()) {
      const el = document.getElementById('room-code-display');
      if (el) el.textContent = Sync.getRoomCode();
    }
  }

  function getRole() { return role; }
  function getPlayerTag() { return playerTag || (Sync.getPlayerTag ? Sync.getPlayerTag() : null); }

  return { init, getRole, getPlayerTag };
})();

// Start
document.addEventListener('DOMContentLoaded', App.init);
