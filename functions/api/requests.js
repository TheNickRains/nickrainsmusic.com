// POST /api/requests — a fan adds a song to tonight's queue (free).
// Body: { song, artist?, name? }. Returns { id, position }.

const MAX_LEN = 120

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  const song = (body.song || '').toString().trim().slice(0, MAX_LEN)
  const artist = (body.artist || '').toString().trim().slice(0, MAX_LEN)
  // First name only — this shows on a public queue.
  const name = (body.name || '').toString().trim().split(/\s+/)[0].slice(0, 30)

  if (!song) return json({ error: 'song required' }, 400)

  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const now = Date.now()

  // Light anti-spam: max 3 requests per IP per minute.
  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM requests WHERE ip = ?1 AND created_at > ?2'
  ).bind(ip, now - 60_000).first()
  if (recent && recent.n >= 3) {
    return json({ error: 'easy there — try again in a minute' }, 429)
  }

  const id = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO requests (id, song, artist, name, ip, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  ).bind(id, song, artist, name, ip, now).run()

  const pos = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM requests WHERE status = 'queued'"
  ).first()

  return json({ id, position: pos ? pos.n : 1 })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
