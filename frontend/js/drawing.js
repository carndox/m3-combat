// Terrain painting and drawing tools
const Drawing = (() => {
  let currentTerrainType = 'wall';
  let isDrawing = false;
  let freeformPoints = [];
  let freeformColor = '#ffffff';
  let freeformWidth = 3;

  const TERRAIN_TYPES = ['wall', 'difficult', 'water', 'cover'];

  function init() {
    const cvs = Canvas.getCanvas();
    cvs.addEventListener('mousedown', onMouseDown);
    cvs.addEventListener('mousemove', onMouseMove);
    cvs.addEventListener('mouseup', onMouseUp);
  }

  function onMouseDown(e) {
    if (e.button !== 0 || e.altKey) return;
    if (App.getRole() !== 'dm') return;

    const tool = Toolbar.getActive();
    const cam = Canvas.getCamera();
    const grid = screenToGrid(e.offsetX, e.offsetY, cam);

    if (tool === 'draw') {
      isDrawing = true;
      paintTerrain(grid.gx, grid.gy);
    } else if (tool === 'erase') {
      isDrawing = true;
      eraseTerrain(grid.gx, grid.gy);
    } else if (tool === 'freeform') {
      isDrawing = true;
      const world = screenToWorld(e.offsetX, e.offsetY, cam);
      freeformPoints = [[world.wx, world.wy]];
    }
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    const tool = Toolbar.getActive();
    const cam = Canvas.getCamera();

    if (tool === 'draw') {
      const grid = screenToGrid(e.offsetX, e.offsetY, cam);
      paintTerrain(grid.gx, grid.gy);
    } else if (tool === 'erase') {
      const grid = screenToGrid(e.offsetX, e.offsetY, cam);
      eraseTerrain(grid.gx, grid.gy);
    } else if (tool === 'freeform') {
      const world = screenToWorld(e.offsetX, e.offsetY, cam);
      freeformPoints.push([world.wx, world.wy]);
      // Live preview: temporarily add to state
      const state = State.getState();
      const existing = state.grid.drawings.find(d => d.id === '__preview__');
      if (existing) {
        existing.points = freeformPoints;
      } else {
        state.grid.drawings.push({
          id: '__preview__',
          points: [...freeformPoints],
          color: freeformColor,
          width: freeformWidth
        });
      }
    }
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    const tool = Toolbar.getActive();

    if (tool === 'freeform' && freeformPoints.length > 1) {
      // Remove preview and commit
      State.mutate(s => {
        s.grid.drawings = s.grid.drawings.filter(d => d.id !== '__preview__');
        s.grid.drawings.push({
          id: generateId(),
          points: [...freeformPoints],
          color: freeformColor,
          width: freeformWidth
        });
      });
      freeformPoints = [];
    } else {
      // Remove any lingering preview
      const state = State.getState();
      state.grid.drawings = state.grid.drawings.filter(d => d.id !== '__preview__');
    }

    isDrawing = false;
  }

  function paintTerrain(gx, gy) {
    const key = `${gx},${gy}`;
    const state = State.getState();
    if (state.grid.terrain[key] && state.grid.terrain[key].type === currentTerrainType) return;
    State.mutate(s => {
      s.grid.terrain[key] = { type: currentTerrainType };
    });
  }

  function eraseTerrain(gx, gy) {
    const key = `${gx},${gy}`;
    const state = State.getState();
    if (!state.grid.terrain[key]) return;
    State.mutate(s => {
      delete s.grid.terrain[key];
    });
  }

  function setTerrainType(type) {
    if (TERRAIN_TYPES.includes(type)) currentTerrainType = type;
  }

  function getTerrainType() { return currentTerrainType; }
  function getTerrainTypes() { return [...TERRAIN_TYPES]; }

  function setFreeformColor(color) { freeformColor = color; }
  function setFreeformWidth(width) { freeformWidth = width; }

  function clearAllDrawings() {
    State.mutate(s => {
      s.grid.drawings = [];
    });
  }

  function clearAllTerrain() {
    State.mutate(s => {
      s.grid.terrain = {};
    });
  }

  return {
    init, setTerrainType, getTerrainType, getTerrainTypes,
    setFreeformColor, setFreeformWidth,
    clearAllDrawings, clearAllTerrain
  };
})();
