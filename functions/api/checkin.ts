// POST /api/checkin — the door scanner behind /checkin?key=<ADMIN_KEY>.
// Body: { key, ticketId }. Looks the ticket up in D1:
//   first scan  → marks used, { status: 'valid', checkedIn, … }   (green)
//   second scan → { status: 'used', usedAt, … }                   (red)
//   unknown id  → { status: 'invalid' }                           (red)

import { SHOW_META } from './_shows'

// Minimal structural D1 types — functions/ isn't in the tsc project;
// Pages bundles this with esbuild, so the shapes only guide the editor.
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<{ meta: { changes: number } }>
}
interface Env {
  DB: { prepare(query: string): D1PreparedStatement }
  ADMIN_KEY?: string
}
interface TicketRow {
  ticket_id: string
  show_id: string
  buyer_email: string
  buyer_name: string
  used: number
  used_at: number | null
  created_at: number
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  let body: { key?: string; ticketId?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) return json({ error: 'nope' }, 403)

  const ticketId = (body.ticketId || '').toString().trim().slice(0, 80)
  if (!ticketId) return json({ error: 'ticketId required' }, 400)

  const ticket = await env.DB.prepare('SELECT * FROM tickets WHERE ticket_id = ?1')
    .bind(ticketId)
    .first<TicketRow>()
  if (!ticket) return json({ status: 'invalid' })

  const meta = SHOW_META[ticket.show_id]
  const base = {
    ticketId: ticket.ticket_id,
    showId: ticket.show_id,
    show: meta ? `${meta.venue} · ${meta.city.split(',')[0]}` : ticket.show_id,
    buyerName: ticket.buyer_name,
    buyerEmail: ticket.buyer_email,
  }

  // Claim it — the `used = 0` guard means a simultaneous double scan loses cleanly
  const claim = await env.DB.prepare(
    'UPDATE tickets SET used = 1, used_at = ?1 WHERE ticket_id = ?2 AND used = 0'
  ).bind(Date.now(), ticketId).run()

  if (!claim.meta.changes) {
    // Already used. Re-read used_at if our SELECT raced the winning scan.
    const usedAt =
      ticket.used_at ??
      (await env.DB.prepare('SELECT used_at FROM tickets WHERE ticket_id = ?1')
        .bind(ticketId)
        .first<{ used_at: number | null }>())?.used_at ??
      null
    return json({ status: 'used', usedAt, ...base })
  }

  const tally = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM tickets WHERE show_id = ?1 AND used = 1'
  ).bind(ticket.show_id).first<{ n: number }>()

  return json({ status: 'valid', checkedIn: tally?.n ?? 0, ...base })
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
