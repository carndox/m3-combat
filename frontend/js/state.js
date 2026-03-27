// Central state management
const State = (() => {
  let state = createEmptyState();
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO = 50;
  let listeners = [];

  function createEmptyState() {
    return {
      version: 0,
      grid: {
        terrain: {},    // "x,y" -> { type: "wall"|"difficult"|"water"|"cover", color: null }
        drawings: []    // { id, points:[[x,y],...], color, width }
      },
      tokens: [],       // { id, name, shape, color, size, x, y, owner, visible, conditions, stats }
      initiative: {
        order: [],      // [tokenId, ...]
        currentIndex: 0,
        round: 1
      }
    };
  }

  function createToken(gx, gy, overrides = {}) {
    return {
      id: generateId(),
      name: overrides.name || 'Token',
      shape: overrides.shape || 'circle',
      color: overrides.color || '#e74c3c',
      size: overrides.size || 1,
      x: gx,
      y: gy,
      owner: overrides.owner || null,
      visible: overrides.visible !== undefined ? overrides.visible : true,
      conditions: [],
      stats: {
        hpCurrent: overrides.hpMax || 10,
        hpMax: overrides.hpMax || 10,
        ac: overrides.ac || 10,
        initiative: overrides.initiative || 0,
        speed: overrides.speed || 30,
        spellSlots: {},
        notes: ''
      }
    };
  }

  function pushUndo() {
    undoStack.push(deepClone(state));
    redoStack = [];
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(deepClone(state));
    state = undoStack.pop();
    notify();
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(deepClone(state));
    state = redoStack.pop();
    notify();
  }

  function getState() { return state; }

  function setState(newState) {
    state = newState;
    notify();
  }

  function mutate(fn) {
    pushUndo();
    fn(state);
    state.version++;
    notify();
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  function notify() {
    listeners.forEach(fn => fn(state));
  }

  function getPublicState() {
    const s = deepClone(state);
    s.tokens = s.tokens.filter(t => t.visible);
    s.tokens.forEach(t => {
      t.stats.notes = '';
    });
    return s;
  }

  function reset() {
    state = createEmptyState();
    undoStack = [];
    redoStack = [];
    notify();
  }

  return {
    getState, setState, mutate, undo, redo,
    createToken, getPublicState, reset,
    subscribe, createEmptyState
  };
})();
