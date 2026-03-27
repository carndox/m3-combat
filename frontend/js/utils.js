// Grid and math utilities
const GRID_SIZE = 40; // pixels per grid square at zoom 1
const FEET_PER_SQUARE = 5;

function screenToGrid(screenX, screenY, camera) {
  const worldX = (screenX - camera.offsetX) / camera.zoom;
  const worldY = (screenY - camera.offsetY) / camera.zoom;
  return {
    gx: Math.floor(worldX / GRID_SIZE),
    gy: Math.floor(worldY / GRID_SIZE)
  };
}

function gridToScreen(gx, gy, camera) {
  return {
    sx: gx * GRID_SIZE * camera.zoom + camera.offsetX,
    sy: gy * GRID_SIZE * camera.zoom + camera.offsetY
  };
}

function gridToWorld(gx, gy) {
  return { wx: gx * GRID_SIZE, wy: gy * GRID_SIZE };
}

function worldToScreen(wx, wy, camera) {
  return {
    sx: wx * camera.zoom + camera.offsetX,
    sy: wy * camera.zoom + camera.offsetY
  };
}

function screenToWorld(sx, sy, camera) {
  return {
    wx: (sx - camera.offsetX) / camera.zoom,
    wy: (sy - camera.offsetY) / camera.zoom
  };
}

function distanceInFeet(gx1, gy1, gx2, gy2) {
  // Standard 5e: diagonal = 5ft (simplified), or use Chebyshev distance
  const dx = Math.abs(gx2 - gx1);
  const dy = Math.abs(gy2 - gy1);
  return Math.max(dx, dy) * FEET_PER_SQUARE;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateSecret() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function deepClone(obj) {
  return structuredClone(obj);
}
