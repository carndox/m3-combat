// POST /api/room/create
export async function onRequestPost(context) {
  const { env } = context;

  // Generate room code and DM secret
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let roomCode = '';
  for (let i = 0; i < 6; i++) roomCode += chars[Math.floor(Math.random() * chars.length)];

  const secretBytes = new Uint8Array(16);
  crypto.getRandomValues(secretBytes);
  const dmSecret = Array.from(secretBytes, b => b.toString(16).padStart(2, '0')).join('');

  // Initial empty state
  const state = {
    version: 0,
    grid: { terrain: {}, drawings: [] },
    tokens: [],
    initiative: { order: [], currentIndex: 0, round: 1 }
  };

  // Write to KV
  const meta = {
    dmSecret,
    version: 0,
    createdAt: new Date().toISOString()
  };

  await Promise.all([
    env.KV.put(`room:${roomCode}`, JSON.stringify(state), { expirationTtl: 86400 }),
    env.KV.put(`room:${roomCode}:meta`, JSON.stringify(meta), { expirationTtl: 86400 })
  ]);

  return new Response(JSON.stringify({ roomCode, dmSecret }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
