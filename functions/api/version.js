// GET /api/version - lightweight poll target
export async function onRequestGet(context) {
  const { env } = context;
  const metaStr = await env.KV.get('m3:meta');
  const meta = metaStr ? JSON.parse(metaStr) : { version: 0 };
  return Response.json({ version: meta.version });
}
