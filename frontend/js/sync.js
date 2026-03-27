// Room sync: create, join, push, poll
const Sync = (() => {
  let roomCode = null;
  let dmSecret = null;
  let playerTag = null;
  let pollInterval = null;
  let lastVersion = -1;
  let statusEl = null;

  function init() {
    statusEl = document.getElementById('sync-status');
    // Check localStorage for existing session
    const saved = localStorage.getItem('m3combat_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        roomCode = session.roomCode;
        dmSecret = session.dmSecret;
        playerTag = session.playerTag;
      } catch (e) {}
    }
  }

  async function createRoom() {
    try {
      setStatus('Creating room...');
      const res = await fetch('/api/room/create', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      roomCode = data.roomCode;
      dmSecret = data.dmSecret;
      saveSession();
      setStatus(`Room: ${roomCode}`);
      updateRoomDisplay();
      return data;
    } catch (e) {
      setStatus('Error: ' + e.message);
      console.error(e);
    }
  }

  async function joinRoom(code, tag) {
    roomCode = code.toUpperCase();
    playerTag = tag;
    dmSecret = null;
    saveSession();
    setStatus(`Joined: ${roomCode}`);
    updateRoomDisplay();
    startPolling();
  }

  async function push() {
    if (!roomCode || !dmSecret) {
      setStatus('No room or not DM');
      return;
    }
    try {
      setStatus('Pushing...');
      const state = State.getState();
      const res = await fetch(`/api/room/${roomCode}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DM-Secret': dmSecret
        },
        body: JSON.stringify(state)
      });
      if (!res.ok) throw new Error('Push failed');
      const data = await res.json();
      setStatus(`Pushed v${data.version}`);
    } catch (e) {
      setStatus('Push error: ' + e.message);
      console.error(e);
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(poll, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  async function poll() {
    if (!roomCode) return;
    try {
      // Check version first (lightweight)
      const vRes = await fetch(`/api/room/${roomCode}/version`);
      if (!vRes.ok) return;
      const vData = await vRes.json();

      if (vData.version === lastVersion) return;

      // Version changed, fetch full state
      const role = dmSecret ? 'dm' : 'player';
      const headers = dmSecret ? { 'X-DM-Secret': dmSecret } : {};
      const sRes = await fetch(`/api/room/${roomCode}/state?role=${role}`, { headers });
      if (!sRes.ok) return;
      const state = await sRes.json();

      lastVersion = state.version;
      State.setState(state);
      setStatus(`Synced v${state.version}`);
    } catch (e) {
      // Silent fail on poll, will retry
    }
  }

  async function playerMove(tokenId, gx, gy) {
    if (!roomCode || !playerTag) return;
    try {
      await fetch(`/api/room/${roomCode}/player-move`, {
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
    roomCode = null;
    dmSecret = null;
    playerTag = null;
    lastVersion = -1;
    localStorage.removeItem('m3combat_session');
    setStatus('Disconnected');
    updateRoomDisplay();
  }

  function saveSession() {
    localStorage.setItem('m3combat_session', JSON.stringify({ roomCode, dmSecret, playerTag }));
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function updateRoomDisplay() {
    const el = document.getElementById('room-code-display');
    if (el) el.textContent = roomCode || 'No room';
  }

  function getRoomCode() { return roomCode; }
  function getDmSecret() { return dmSecret; }
  function getPlayerTag() { return playerTag; }
  function isDM() { return !!dmSecret; }

  return {
    init, createRoom, joinRoom, push, startPolling, stopPolling,
    disconnect, playerMove,
    getRoomCode, getDmSecret, getPlayerTag, isDM
  };
})();
