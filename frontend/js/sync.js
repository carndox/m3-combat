// Single-room sync with auto-push for DM
const Sync = (() => {
  let dmToken = null;
  let playerTag = null;
  let pollInterval = null;
  let lastVersion = -1;
  let statusEl = null;
  let pushTimeout = null;
  let isDirty = false;
  let isPushing = false;
  let unsubscribe = null;

  const AUTO_PUSH_DELAY = 1500; // ms after last change before auto-push

  function init() {
    statusEl = document.getElementById('sync-status');
  }

  function setDmToken(token) {
    dmToken = token;
    // Subscribe to state changes for auto-push
    if (unsubscribe) unsubscribe();
    unsubscribe = State.subscribe(() => {
      if (!dmToken) return; // Only DM auto-pushes
      isDirty = true;
      updateDirtyIndicator();
      schedulePush();
    });
  }

  function joinAsPlayer(tag) {
    playerTag = tag;
  }

  function schedulePush() {
    if (pushTimeout) clearTimeout(pushTimeout);
    pushTimeout = setTimeout(() => {
      push();
    }, AUTO_PUSH_DELAY);
  }

  async function push() {
    if (!dmToken || isPushing) return;
    isPushing = true;
    try {
      setStatus('Syncing...');
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
      isDirty = false;
      updateDirtyIndicator();
      setStatus(`Synced v${data.version}`);
    } catch (e) {
      setStatus('Sync error');
      console.error(e);
      // Retry in 3 seconds
      setTimeout(() => { if (isDirty) push(); }, 3000);
    } finally {
      isPushing = false;
    }
  }

  function updateDirtyIndicator() {
    const indicator = document.getElementById('sync-dirty');
    if (indicator) {
      indicator.style.display = isDirty ? 'inline-block' : 'none';
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    poll();
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
      const vRes = await fetch('/api/version');
      if (!vRes.ok) return;
      const vData = await vRes.json();
      if (vData.version === lastVersion) return;

      const sRes = await fetch(`/api/state?role=player`);
      if (!sRes.ok) return;
      const state = await sRes.json();

      lastVersion = state.version;
      State.setState(state);
      setStatus(`Synced v${state.version}`);
    } catch (e) {
      // Silent retry
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
    if (pushTimeout) clearTimeout(pushTimeout);
    if (unsubscribe) unsubscribe();
    dmToken = null;
    playerTag = null;
    lastVersion = -1;
    isDirty = false;
    setStatus('Disconnected');
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function getDmToken() { return dmToken; }
  function getPlayerTag() { return playerTag; }
  function isDM() { return !!dmToken; }

  return {
    init, setDmToken, joinAsPlayer, push, startPolling, stopPolling,
    disconnect, playerMove, getDmToken, getPlayerTag, isDM
  };
})();
