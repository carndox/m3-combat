// GET /api/room/:code/state?role=player|dm
export async function onRequestGet(context) {
  const { env, params, request } = context;
  const code = params.code;
  const url = new URL(request.url);
  const role = url.searchParams.get('role') || 'player';

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

  if (role === 'dm') {
    const meta = JSON.parse(metaStr);
    const secret = request.headers.get('X-DM-Secret');
    if (secret !== meta.dmSecret) {
      return new Response(JSON.stringify({ error: 'Invalid DM secret' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Return full state for DM
    return new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Sanitize for player view
  state.tokens = state.tokens.filter(t => t.visible !== false);
  state.tokens.forEach(t => {
    if (t.stats) t.stats.notes = '';
  });

  return new Response(JSON.stringify(state), {
    headers: { 'Content-Type': 'application/json' }
  });
}
