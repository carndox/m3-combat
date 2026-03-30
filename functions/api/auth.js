// POST /api/auth - DM login
export async function onRequestPost(context) {
  const { env, request } = context;
  const { pin } = await request.json();

  // DM_PIN is set as an environment variable on Cloudflare Pages
  const correctPin = env.DM_PIN || 'm3dm';

  if (pin !== correctPin) {
    return Response.json({ success: false }, { status: 401 });
  }

  // Generate a session token
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

  // Store token in KV with 24h expiry
  await env.KV.put(`token:${token}`, 'dm', { expirationTtl: 86400 });

  return Response.json({ success: true, token });
}
