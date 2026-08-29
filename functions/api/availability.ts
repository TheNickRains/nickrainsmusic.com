// GET /api/availability?show=knoxville/090526
// Returns remaining ticket count for capacity-capped shows.
// Used by the Live page card to show urgency ("3 left") without blocking the UI.

import { SHOW_META } from './_shows'

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
}
interface Env {
  DB: { prepare(query: string): D1PreparedStatement }
}

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const showId = new URL(request.url).searchParams.get('show') || ''
  const meta = SHOW_META[showId]

  if (!meta?.capacity) return json({ remaining: null, soldOut: false })

  const sold = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM tickets WHERE show_id = ?1'
  ).bind(showId).first<{ n: number }>()

  const remaining = Math.max(0, meta.capacity - (sold?.n ?? 0))
  return json({ remaining, soldOut: remaining === 0 })
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  })
}
