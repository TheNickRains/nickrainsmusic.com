// GET /api/ticket?session=<stripe_session_id>
// Returns ticket IDs and show info for the post-checkout success page.
// No auth — Stripe session IDs are already unguessable UUIDs.

import { SHOW_META } from './_shows'

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}
interface Env {
  DB: { prepare(query: string): D1PreparedStatement }
}
interface TicketRow {
  ticket_id: string
  show_id: string
  buyer_name: string
}

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const url = new URL(request.url)
  const sessionId = (url.searchParams.get('session') || '').slice(0, 200)
  const ticketId  = (url.searchParams.get('id')      || '').slice(0, 80)
  if (!sessionId && !ticketId) return json({ error: 'session or id required' }, 400)

  const { results } = ticketId
    ? await env.DB.prepare(
        'SELECT ticket_id, show_id, buyer_name FROM tickets WHERE ticket_id = ?1'
      ).bind(ticketId).all<TicketRow>()
    : await env.DB.prepare(
        'SELECT ticket_id, show_id, buyer_name FROM tickets WHERE stripe_session_id = ?1'
      ).bind(sessionId).all<TicketRow>()

  if (!results.length) return json({ tickets: [] })

  const showId = results[0].show_id
  const meta = SHOW_META[showId]

  return json({
    tickets: results.map(r => ({ id: r.ticket_id })),
    buyerName: results[0].buyer_name,
    showId,
    show: meta ? {
      city: meta.city,
      venue: meta.venue,
      address: meta.address,
      date: meta.date,
      time: meta.time,
      showAt: meta.showAt,
    } : null,
  })
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
