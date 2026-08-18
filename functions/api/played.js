// POST /api/played — Nick marks a request played (or clears it).
// Body: { id, key }. key must match the ADMIN_KEY secret.

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) {
    return json({ error: 'nope' }, 403)
  }
  if (!body.id) return json({ error: 'id required' }, 400)

  await env.DB.prepare(
    "UPDATE requests SET status = 'played', played_at = ?1 WHERE id = ?2"
  ).bind(Date.now(), body.id).run()

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
