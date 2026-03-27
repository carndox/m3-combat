// Token placement, selection, dragging
const Tokens = (() => {
  let selectedId = null;
  let dragging = null; // { tokenId, offsetGx, offsetGy }
  let placementOptions = {
    shape: 'circle',
    color: '#e74c3c',
    size: 1,
    name: 'Token'
  };

  function init() {
    const cvs = Canvas.getCanvas();
    cvs.addEventListener('mousedown', onMouseDown);
    cvs.addEventListener('mousemove', onMouseMove);
    cvs.addEventListener('mouseup', onMouseUp);
  }

  function onMouseDown(e) {
    if (e.button !== 0 || e.altKey) return;
    const tool = Toolbar.getActive();
    const cam = Canvas.getCamera();
    const grid = screenToGrid(e.offsetX, e.offsetY, cam);

    if (tool === 'select') {
      const token = findTokenAt(grid.gx, grid.gy);
      if (token) {
        // Check if player can interact with this token
        if (App.getRole() === 'player' && token.owner !== App.getPlayerTag()) {
          selectedId = token.id;
          Stats.show(token);
          return;
        }
        selectedId = token.id;
        dragging = { tokenId: token.id, startGx: token.x, startGy: token.y };
        Stats.show(token);
      } else {
        selectedId = null;
        Stats.hide();
      }
    } else if (tool === 'place' && App.getRole() === 'dm') {
      placeToken(grid.gx, grid.gy);
    }
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const cam = Canvas.getCamera();
    const grid = screenToGrid(e.offsetX, e.offsetY, cam);
    const state = State.getState();
    const token = state.tokens.find(t => t.id === dragging.tokenId);
    if (token) {
      token.x = grid.gx;
      token.y = grid.gy;
    }
  }

  function onMouseUp(e) {
    if (dragging) {
      const state = State.getState();
      const token = state.tokens.find(t => t.id === dragging.tokenId);
      if (token && (token.x !== dragging.startGx || token.y !== dragging.startGy)) {
        // Token actually moved, record for undo
        const finalX = token.x;
        const finalY = token.y;
        token.x = dragging.startGx;
        token.y = dragging.startGy;
        State.mutate(s => {
          const t = s.tokens.find(t => t.id === dragging.tokenId);
          if (t) { t.x = finalX; t.y = finalY; }
        });
      }
      dragging = null;
    }
  }

  function findTokenAt(gx, gy) {
    const state = State.getState();
    // Search in reverse so topmost tokens are found first
    for (let i = state.tokens.length - 1; i >= 0; i--) {
      const t = state.tokens[i];
      if (gx >= t.x && gx < t.x + (t.size || 1) &&
          gy >= t.y && gy < t.y + (t.size || 1)) {
        return t;
      }
    }
    return null;
  }

  function placeToken(gx, gy) {
    State.mutate(s => {
      const token = State.createToken(gx, gy, {
        shape: placementOptions.shape,
        color: placementOptions.color,
        size: placementOptions.size,
        name: placementOptions.name
      });
      s.tokens.push(token);
      selectedId = token.id;
      Stats.show(token);
    });
  }

  function deleteSelected() {
    if (!selectedId) return;
    State.mutate(s => {
      s.tokens = s.tokens.filter(t => t.id !== selectedId);
      s.initiative.order = s.initiative.order.filter(id => id !== selectedId);
    });
    selectedId = null;
    Stats.hide();
  }

  function duplicateSelected() {
    if (!selectedId) return;
    const state = State.getState();
    const original = state.tokens.find(t => t.id === selectedId);
    if (!original) return;
    State.mutate(s => {
      const copy = deepClone(original);
      copy.id = generateId();
      copy.x += 1;
      copy.name = original.name + ' (copy)';
      s.tokens.push(copy);
    });
  }

  function getSelected() { return selectedId; }
  function setSelected(id) { selectedId = id; }

  function setPlacementOptions(opts) {
    Object.assign(placementOptions, opts);
  }

  function getPlacementOptions() { return { ...placementOptions }; }

  return {
    init, getSelected, setSelected,
    deleteSelected, duplicateSelected,
    findTokenAt, setPlacementOptions, getPlacementOptions
  };
})();
