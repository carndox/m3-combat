// POST /api/room/:code/push (DM only)
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const code = params.code;

  // Verify DM secret
  const metaStr = await env.KV.get(`room:${code}:meta`);
  if (!metaStr) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const meta = JSON.parse(metaStr);
  const secret = request.headers.get('X-DM-Secret');
  if (secret !== meta.dmSecret) {
    return new Response(JSON.stringify({ error: 'Invalid DM secret' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Read new state from body
  const state = await request.json();
  meta.version = (meta.version || 0) + 1;
  state.version = meta.version;

  // Write both
  await Promise.all([
    env.KV.put(`room:${code}`, JSON.stringify(state), { expirationTtl: 86400 }),
    env.KV.put(`room:${code}:meta`, JSON.stringify(meta), { expirationTtl: 86400 })
  ]);

  return new Response(JSON.stringify({ version: meta.version }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
