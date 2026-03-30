// GET /api/state?role=player - fetch game state
// POST /api/state - DM pushes new state
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const role = url.searchParams.get('role') || 'player';

  const stateStr = await env.KV.get('m3:state');
  if (!stateStr) {
    return Response.json({
      version: 0,
      grid: { terrain: {}, drawings: [] },
      tokens: [],
      initiative: { order: [], currentIndex: 0, round: 1 }
    });
  }

  const state = JSON.parse(stateStr);

  if (role === 'dm') {
    // Verify DM token
    const auth = request.headers.get('Authorization');
    const token = auth ? auth.replace('Bearer ', '') : '';
    const valid = await env.KV.get(`token:${token}`);
    if (!valid) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json(state);
  }

  // Player view: strip hidden tokens and DM notes
  state.tokens = state.tokens.filter(t => t.visible !== false);
  state.tokens.forEach(t => {
    if (t.stats) t.stats.notes = '';
  });
  return Response.json(state);
}

export async function onRequestPost(context) {
  const { env, request } = context;

  // Verify DM token
  const auth = request.headers.get('Authorization');
  const token = auth ? auth.replace('Bearer ', '') : '';
  const valid = await env.KV.get(`token:${token}`);
  if (!valid) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const state = await request.json();

  // Bump version
  const metaStr = await env.KV.get('m3:meta');
  const meta = metaStr ? JSON.parse(metaStr) : { version: 0 };
  meta.version++;
  state.version = meta.version;

  await Promise.all([
    env.KV.put('m3:state', JSON.stringify(state)),
    env.KV.put('m3:meta', JSON.stringify(meta))
  ]);

  return Response.json({ version: meta.version });
}
