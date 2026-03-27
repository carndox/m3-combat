// Infinite grid canvas with pan, zoom, and rendering
const Canvas = (() => {
  let cvs, ctx;
  let camera = { offsetX: 0, offsetY: 0, zoom: 1 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let animFrameId = null;

  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 3;
  const GRID_COLOR_LIGHT = 'rgba(255,255,255,0.08)';
  const GRID_COLOR_ORIGIN = 'rgba(255,255,255,0.2)';

  const TERRAIN_COLORS = {
    wall: 'rgba(80, 80, 80, 0.8)',
    difficult: 'rgba(139, 119, 42, 0.5)',
    water: 'rgba(30, 100, 180, 0.5)',
    cover: 'rgba(34, 139, 34, 0.5)'
  };

  const SHAPE_RENDERERS = {
    circle(ctx, cx, cy, r) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    },
    square(ctx, cx, cy, r) {
      ctx.beginPath();
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
    },
    triangle(ctx, cx, cy, r) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx - r, cy + r * 0.7);
      ctx.lineTo(cx + r, cy + r * 0.7);
      ctx.closePath();
    },
    diamond(ctx, cx, cy, r) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
    }
  };

  function init(canvasEl) {
    cvs = canvasEl;
    ctx = cvs.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    cvs.addEventListener('wheel', onWheel, { passive: false });
    cvs.addEventListener('mousedown', onMouseDown);
    cvs.addEventListener('mousemove', onMouseMove);
    cvs.addEventListener('mouseup', onMouseUp);
    cvs.addEventListener('mouseleave', onMouseUp);
    cvs.addEventListener('contextmenu', e => e.preventDefault());
    startRenderLoop();
  }

  function resize() {
    const rect = cvs.parentElement.getBoundingClientRect();
    cvs.width = rect.width;
    cvs.height = rect.height;
  }

  function onWheel(e) {
    e.preventDefault();
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * zoomFactor));
    // Zoom toward cursor
    camera.offsetX = mouseX - (mouseX - camera.offsetX) * (newZoom / camera.zoom);
    camera.offsetY = mouseY - (mouseY - camera.offsetY) * (newZoom / camera.zoom);
    camera.zoom = newZoom;
  }

  function onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning = true;
      panStart = { x: e.clientX - camera.offsetX, y: e.clientY - camera.offsetY };
      cvs.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    if (isPanning) {
      camera.offsetX = e.clientX - panStart.x;
      camera.offsetY = e.clientY - panStart.y;
    }
  }

  function onMouseUp(e) {
    if (isPanning) {
      isPanning = false;
      cvs.style.cursor = '';
    }
  }

  function startRenderLoop() {
    function frame() {
      render();
      animFrameId = requestAnimationFrame(frame);
    }
    animFrameId = requestAnimationFrame(frame);
  }

  function render() {
    const state = State.getState();
    const w = cvs.width;
    const h = cvs.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(camera.offsetX, camera.offsetY);
    ctx.scale(camera.zoom, camera.zoom);

    drawGrid(w, h);
    drawTerrain(state.grid.terrain);
    drawDrawings(state.grid.drawings);
    drawTokens(state.tokens);
    drawMeasure();
    drawHover();

    ctx.restore();
  }

  function drawGrid(w, h) {
    const gs = GRID_SIZE;
    const startX = Math.floor(-camera.offsetX / camera.zoom / gs) - 1;
    const startY = Math.floor(-camera.offsetY / camera.zoom / gs) - 1;
    const endX = startX + Math.ceil(w / camera.zoom / gs) + 2;
    const endY = startY + Math.ceil(h / camera.zoom / gs) + 2;

    ctx.lineWidth = 1 / camera.zoom;

    for (let x = startX; x <= endX; x++) {
      ctx.strokeStyle = x === 0 ? GRID_COLOR_ORIGIN : GRID_COLOR_LIGHT;
      ctx.beginPath();
      ctx.moveTo(x * gs, startY * gs);
      ctx.lineTo(x * gs, endY * gs);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y++) {
      ctx.strokeStyle = y === 0 ? GRID_COLOR_ORIGIN : GRID_COLOR_LIGHT;
      ctx.beginPath();
      ctx.moveTo(startX * gs, y * gs);
      ctx.lineTo(endX * gs, y * gs);
      ctx.stroke();
    }
  }

  function drawTerrain(terrain) {
    const gs = GRID_SIZE;
    for (const key in terrain) {
      const [gx, gy] = key.split(',').map(Number);
      const t = terrain[key];
      ctx.fillStyle = t.color || TERRAIN_COLORS[t.type] || 'rgba(128,128,128,0.4)';
      ctx.fillRect(gx * gs, gy * gs, gs, gs);
    }
  }

  function drawDrawings(drawings) {
    for (const d of drawings) {
      if (d.points.length < 2) continue;
      ctx.strokeStyle = d.color || '#fff';
      ctx.lineWidth = (d.width || 2) / camera.zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(d.points[0][0], d.points[0][1]);
      for (let i = 1; i < d.points.length; i++) {
        ctx.lineTo(d.points[i][0], d.points[i][1]);
      }
      ctx.stroke();
    }
  }

  function drawTokens(tokens) {
    const gs = GRID_SIZE;
    const role = App ? App.getRole() : 'dm';

    for (const token of tokens) {
      if (!token.visible && role !== 'dm') continue;

      const size = token.size || 1;
      const px = token.x * gs + (size * gs) / 2;
      const py = token.y * gs + (size * gs) / 2;
      const radius = (size * gs) / 2 - 4;

      // Draw shape
      const renderer = SHAPE_RENDERERS[token.shape] || SHAPE_RENDERERS.circle;
      renderer(ctx, px, py, radius);

      ctx.fillStyle = token.color || '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = Tokens.getSelected() === token.id ? '#fff' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = Tokens.getSelected() === token.id ? 3 / camera.zoom : 1.5 / camera.zoom;
      ctx.stroke();

      // Hidden indicator for DM
      if (!token.visible && role === 'dm') {
        ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        ctx.strokeStyle = 'rgba(255,255,0,0.6)';
        ctx.lineWidth = 2 / camera.zoom;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Name label
      const fontSize = Math.max(10, 12 / camera.zoom);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / camera.zoom;
      const labelY = py + radius + 4;
      ctx.strokeText(token.name, px, labelY);
      ctx.fillText(token.name, px, labelY);

      // HP bar (DM only, or own tokens)
      if (role === 'dm' || (token.owner && token.owner === App.getPlayerTag())) {
        const barWidth = size * gs - 8;
        const barHeight = 4;
        const barX = token.x * gs + 4;
        const barY = token.y * gs - 8;
        const hpRatio = token.stats.hpMax > 0 ? token.stats.hpCurrent / token.stats.hpMax : 1;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * Math.max(0, hpRatio), barHeight);
      }

      // Condition indicators
      if (token.conditions.length > 0) {
        const condFontSize = Math.max(8, 9 / camera.zoom);
        ctx.font = `${condFontSize}px sans-serif`;
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const condY = token.y * gs - 12;
        ctx.fillText(token.conditions.join(', '), px, condY);
      }
    }
  }

  function drawMeasure() {
    if (typeof Measure === 'undefined') return;
    const m = Measure.getLine();
    if (!m) return;

    const gs = GRID_SIZE;
    const sx = m.startX * gs + gs / 2;
    const sy = m.startY * gs + gs / 2;
    const ex = m.endX * gs + gs / 2;
    const ey = m.endY * gs + gs / 2;

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    const dist = distanceInFeet(m.startX, m.startY, m.endX, m.endY);
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    const fontSize = Math.max(12, 14 / camera.zoom);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeText(`${dist} ft`, midX, midY - 4);
    ctx.fillText(`${dist} ft`, midX, midY - 4);
  }

  function drawHover() {
    if (typeof Toolbar === 'undefined') return;
    const tool = Toolbar.getActive();
    const hover = Toolbar.getHoverGrid();
    if (!hover) return;

    const gs = GRID_SIZE;
    if (tool === 'place' || tool === 'draw' || tool === 'erase') {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(hover.gx * gs, hover.gy * gs, gs, gs);
    }
  }

  function getCamera() { return camera; }
  function getCanvas() { return cvs; }
  function getCtx() { return ctx; }

  return { init, getCamera, getCanvas, getCtx, resize };
})();
