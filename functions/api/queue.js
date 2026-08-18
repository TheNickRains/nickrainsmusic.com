// GET /api/queue — the live queue, public. Paid boosts float to the top
// (biggest first), then free requests in arrival order.

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, song, artist, name, paid, amount_cents, created_at
     FROM requests
     WHERE status = 'queued'
     ORDER BY paid DESC, amount_cents DESC, created_at ASC
     LIMIT 100`
  ).all()

  const played = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM requests
     WHERE status = 'played' AND played_at > ?1`
  ).bind(Date.now() - 12 * 3600_000).first()

  return new Response(
    JSON.stringify({ queue: results || [], playedTonight: played ? played.n : 0 }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
  )
}
