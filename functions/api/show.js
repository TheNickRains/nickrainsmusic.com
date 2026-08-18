// The end-of-show sweep — an EVENT, not a state.
// GET  /api/show -> { sweep: <ms timestamp of last sweep, 0 if never> }
//   Open pages compare against the value they saw at load; a newer value
//   means "you were in the room when the show ended" -> off to the fan list.
//   Pages opened after the sweep are unaffected. Nothing is blocked.
// POST /api/show { key, action: 'end-show' } (admin)
//   Broadcasts the sweep AND clears the night: queue + goals.

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'sweep'").first()
  return new Response(JSON.stringify({ sweep: row ? Number(row.value) : 0 }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) return json({ error: 'nope' }, 403)
  if (body.action !== 'end-show') return json({ error: 'unknown action' }, 400)

  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('sweep', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1"
  ).bind(String(Date.now())).run()
  await env.DB.prepare('DELETE FROM requests').run()
  await env.DB.prepare('DELETE FROM goals').run()

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
