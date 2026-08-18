// GET  /api/goals — tonight's goal songs with live progress (public).
// POST /api/goals — admin manages tonight's goals. Body: { key, action, ... }
//   action 'create': { song, artist?, goalDollars }
//   action 'delete': { id }
//   action 'clear':  {} — end of night, wipe all goals (fresh room next show)

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, song, artist, goal_cents, current_cents, unlocked
     FROM goals ORDER BY unlocked ASC, goal_cents DESC, created_at ASC LIMIT 10`
  ).all()
  return json({ goals: results || [] })
}

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) return json({ error: 'nope' }, 403)

  const action = body.action

  if (action === 'create') {
    const song = (body.song || '').toString().trim().slice(0, 120)
    const artist = (body.artist || '').toString().trim().slice(0, 120)
    const goalCents = Math.round(Number(body.goalDollars) * 100)
    if (!song) return json({ error: 'song required' }, 400)
    if (!Number.isFinite(goalCents) || goalCents < 500 || goalCents > 100000) {
      return json({ error: 'goal must be $5-$1000' }, 400)
    }
    const id = crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO goals (id, song, artist, goal_cents, created_at) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(id, song, artist, goalCents, Date.now()).run()
    return json({ id })
  }

  if (action === 'seed') {
    const cents = Math.round(Number(body.dollars) * 100)
    if (!body.id) return json({ error: 'id required' }, 400)
    if (!Number.isFinite(cents) || cents <= 0 || cents > 50000) {
      return json({ error: 'seed must be $1-$500' }, 400)
    }
    await env.DB.prepare(
      'UPDATE goals SET current_cents = current_cents + ?1 WHERE id = ?2'
    ).bind(cents, body.id).run()
    await env.DB.prepare(
      `UPDATE goals SET unlocked = 1, unlocked_at = ?1
       WHERE id = ?2 AND unlocked = 0 AND current_cents >= goal_cents`
    ).bind(Date.now(), body.id).run()
    return json({ ok: true })
  }

  if (action === 'delete') {
    if (!body.id) return json({ error: 'id required' }, 400)
    await env.DB.prepare('DELETE FROM goals WHERE id = ?1').bind(body.id).run()
    return json({ ok: true })
  }

  if (action === 'clear') {
    await env.DB.prepare('DELETE FROM goals').run()
    return json({ ok: true })
  }

  return json({ error: 'unknown action' }, 400)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
