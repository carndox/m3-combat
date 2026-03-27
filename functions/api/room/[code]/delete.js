// POST /api/room/:code/delete (DM only)
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const code = params.code;

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

  await Promise.all([
    env.KV.delete(`room:${code}`),
    env.KV.delete(`room:${code}:meta`)
  ]);

  return new Response(JSON.stringify({ deleted: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
