// Distance measurement tool
const Measure = (() => {
  let measuring = false;
  let line = null; // { startX, startY, endX, endY }

  function init() {
    const cvs = Canvas.getCanvas();
    cvs.addEventListener('mousedown', onMouseDown);
    cvs.addEventListener('mousemove', onMouseMove);
    cvs.addEventListener('mouseup', onMouseUp);
  }

  function onMouseDown(e) {
    if (e.button !== 0 || e.altKey) return;
    if (Toolbar.getActive() !== 'measure') return;

    const cam = Canvas.getCamera();
    const grid = screenToGrid(e.offsetX, e.offsetY, cam);
    measuring = true;
    line = { startX: grid.gx, startY: grid.gy, endX: grid.gx, endY: grid.gy };
  }

  function onMouseMove(e) {
    if (!measuring || !line) return;
    const cam = Canvas.getCamera();
    const grid = screenToGrid(e.offsetX, e.offsetY, cam);
    line.endX = grid.gx;
    line.endY = grid.gy;
  }

  function onMouseUp(e) {
    if (measuring) {
      // Keep the line visible until next click or tool switch
      measuring = false;
    }
  }

  function clear() {
    line = null;
    measuring = false;
  }

  function getLine() { return line; }

  return { init, getLine, clear };
})();
