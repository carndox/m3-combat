// GET /api/room/:code/version
export async function onRequestGet(context) {
  const { env, params } = context;
  const code = params.code;

  const metaStr = await env.KV.get(`room:${code}:meta`);
  if (!metaStr) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const meta = JSON.parse(metaStr);
  return new Response(JSON.stringify({ version: meta.version }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
