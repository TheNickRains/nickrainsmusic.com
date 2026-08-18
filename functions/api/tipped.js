// GET /api/tipped?device=<id> — has this device COMPLETED a payment in the
// last 6 hours? Webhook-verified truth, not click tracking.
export async function onRequestGet({ request, env }) {
  const device = new URL(request.url).searchParams.get('device') || ''
  if (!device) {
    return new Response(JSON.stringify({ tipped: false }), {
      headers: { 'content-type': 'application/json' },
    })
  }
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM tips WHERE device_id = ?1 AND created_at > ?2'
  ).bind(device, Date.now() - 6 * 3600_000).first()
  return new Response(JSON.stringify({ tipped: Boolean(row && row.n > 0) }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
