// POST /api/room/:code/player-move
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const code = params.code;

  const body = await request.json();
  const { tokenId, x, y, playerTag } = body;

  if (!tokenId || x === undefined || y === undefined || !playerTag) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const [stateStr, metaStr] = await Promise.all([
    env.KV.get(`room:${code}`),
    env.KV.get(`room:${code}:meta`)
  ]);

  if (!stateStr || !metaStr) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const state = JSON.parse(stateStr);
  const meta = JSON.parse(metaStr);

  // Find the token and verify ownership
  const token = state.tokens.find(t => t.id === tokenId);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (token.owner !== playerTag) {
    return new Response(JSON.stringify({ error: 'Not your token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Update position
  token.x = x;
  token.y = y;
  meta.version++;
  state.version = meta.version;

  await Promise.all([
    env.KV.put(`room:${code}`, JSON.stringify(state), { expirationTtl: 86400 }),
    env.KV.put(`room:${code}:meta`, JSON.stringify(meta), { expirationTtl: 86400 })
  ]);

  return new Response(JSON.stringify({ version: meta.version }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
