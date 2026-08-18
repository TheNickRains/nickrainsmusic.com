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

export async function onRequestPost(context) {
  const { request, env } = context
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) return json({ error: 'nope' }, 403)
  if (body.action !== 'end-show') return json({ error: 'unknown action' }, 400)

  // ---- Compile the wrap-up BEFORE clearing the night ----
  const prev = await env.DB.prepare("SELECT value FROM settings WHERE key = 'sweep'").first()
  const since = prev ? Number(prev.value) : 0

  const fans = await env.DB.prepare(
    'SELECT first_name, last_name, email, zip, source FROM fans WHERE created_at > ?1 ORDER BY created_at'
  ).bind(since).all()
  const played = await env.DB.prepare(
    "SELECT song, artist FROM requests WHERE status = 'played' ORDER BY played_at"
  ).all()
  const leftover = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM requests WHERE status = 'queued'"
  ).first()
  const money = await env.DB.prepare(
    'SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS total FROM tips WHERE created_at > ?1'
  ).bind(since).first()
  const goals = await env.DB.prepare(
    'SELECT song, goal_cents, current_cents, unlocked FROM goals ORDER BY goal_cents DESC'
  ).all()

  // ---- Sweep + clear ----
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('sweep', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1"
  ).bind(String(Date.now())).run()
  await env.DB.prepare('DELETE FROM requests').run()
  await env.DB.prepare('DELETE FROM goals').run()

  // ---- Email the wrap-up (Resend; skipped if not configured) ----
  if (env.RESEND_API_KEY && env.RESEND_FROM && env.RESEND_TO) {
    const f = fans.results || []
    const p = played.results || []
    const g = goals.results || []
    const dollars = (c) => `$${(c / 100).toFixed(2)}`

    const lines = [
      `SHOW WRAP-UP — ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' })}`,
      '',
      `THE CLUB — ${f.length} new member${f.length === 1 ? '' : 's'}`,
      ...f.map((x) => `  • ${[x.first_name, x.last_name].filter(Boolean).join(' ') || '(no name)'} — ${x.email}${x.zip ? ` — ZIP ${x.zip}` : ''} [${x.source}]`),
      '',
      `MONEY — ${money.n} payment${money.n === 1 ? '' : 's'}, ${dollars(money.total)} verified through the site`,
      '',
      `SONGS — ${p.length} played, ${leftover ? leftover.n : 0} left in the queue`,
      ...p.map((x) => `  ✓ ${x.song}${x.artist ? ` — ${x.artist}` : ''}`),
      '',
      ...(g.length
        ? [
            'GOALS (cleared with the night):',
            ...g.map((x) => `  ${x.unlocked ? '🎸 UNLOCKED' : '○'} ${x.song} — ${dollars(x.current_cents)} of ${dollars(x.goal_cents)}`),
          ]
        : []),
      '',
      `Full list: https://nickrainsmusic.com/api/fans?key=${env.ADMIN_KEY}`,
    ]

    context.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: env.RESEND_FROM,
          to: env.RESEND_TO,
          subject: `🎸 Wrap-up: ${f.length} new Club member${f.length === 1 ? '' : 's'} · ${dollars(money.total)} collected`,
          text: lines.join('\n'),
        }),
      }).catch(() => {})
    )
  }

  return json({ ok: true, wrapUp: { newFans: (fans.results || []).length, played: (played.results || []).length } })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
