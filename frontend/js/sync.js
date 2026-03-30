// Single-room sync: DM pushes, players poll
const Sync = (() => {
  let dmToken = null;
  let playerTag = null;
  let pollInterval = null;
  let lastVersion = -1;
  let statusEl = null;

  function init() {
    statusEl = document.getElementById('sync-status');
  }

  function setDmToken(token) {
    dmToken = token;
  }

  function joinAsPlayer(tag) {
    playerTag = tag;
  }

  async function push() {
    if (!dmToken) {
      setStatus('Not authenticated');
      return;
    }
    try {
      setStatus('Pushing...');
      const state = State.getState();
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dmToken}`
        },
        body: JSON.stringify(state)
      });
      if (!res.ok) throw new Error('Push failed');
      const data = await res.json();
      setStatus(`Pushed v${data.version}`);
    } catch (e) {
      setStatus('Push error');
      console.error(e);
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    poll(); // immediate first poll
    pollInterval = setInterval(poll, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  async function poll() {
    try {
      // Check version first
      const vRes = await fetch('/api/version');
      if (!vRes.ok) return;
      const vData = await vRes.json();
      if (vData.version === lastVersion) return;

      // Fetch full state
      const sRes = await fetch(`/api/state?role=player`);
      if (!sRes.ok) return;
      const state = await sRes.json();

      lastVersion = state.version;
      State.setState(state);
      setStatus(`Synced v${state.version}`);
    } catch (e) {
      // Silent fail, will retry
    }
  }

  async function playerMove(tokenId, gx, gy) {
    if (!playerTag) return;
    try {
      await fetch('/api/player-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, x: gx, y: gy, playerTag })
      });
    } catch (e) {
      console.error('Player move failed:', e);
    }
  }

  function disconnect() {
    stopPolling();
    dmToken = null;
    playerTag = null;
    lastVersion = -1;
    setStatus('Disconnected');
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function getRoomCode() { return null; }
  function getDmToken() { return dmToken; }
  function getPlayerTag() { return playerTag; }
  function isDM() { return !!dmToken; }

  return {
    init, setDmToken, joinAsPlayer, push, startPolling, stopPolling,
    disconnect, playerMove, getRoomCode, getDmToken, getPlayerTag, isDM
  };
})();
