// POST /api/player-move - player moves their own token
export async function onRequestPost(context) {
  const { env, request } = context;
  const { tokenId, x, y, playerTag } = await request.json();

  if (!tokenId || x === undefined || y === undefined || !playerTag) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  const stateStr = await env.KV.get('m3:state');
  if (!stateStr) return Response.json({ error: 'No active session' }, { status: 404 });

  const state = JSON.parse(stateStr);
  const token = state.tokens.find(t => t.id === tokenId);
  if (!token) return Response.json({ error: 'Token not found' }, { status: 404 });
  if (token.owner !== playerTag) return Response.json({ error: 'Not your token' }, { status: 403 });

  token.x = x;
  token.y = y;

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
