// GET /api/checkout?show=knoxville/090526
// Selects the active price tier (presale → door), checks show expiry and
// capacity, then creates a Stripe Checkout Session and redirects the buyer.
// On payment: checkout.session.completed → /api/webhook/stripe → QR ticket email.

import { SHOW_META } from './_shows'

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
}
interface Env {
  STRIPE_SECRET_KEY?: string
  DB: { prepare(query: string): D1PreparedStatement }
}

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const url = new URL(request.url)
  const showId = url.searchParams.get('show') || ''
  const qtyParam = Math.max(1, parseInt(url.searchParams.get('qty') || '1', 10) || 1)

  const meta = SHOW_META[showId]
  if (!meta) return new Response('show not found', { status: 404 })
  if (!env.STRIPE_SECRET_KEY) return new Response('not configured', { status: 500 })

  const now = Date.now()
  const cancelUrl = `${url.origin}/${showId}`

  // Block after show start
  if (now >= new Date(meta.showAt).getTime()) {
    return Response.redirect(`${cancelUrl}?ticket=expired`, 303)
  }

  // Capacity check
  let remaining: number | null = null
  if (meta.capacity) {
    const sold = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM tickets WHERE show_id = ?1'
    ).bind(showId).first<{ n: number }>()
    remaining = Math.max(0, meta.capacity - (sold?.n ?? 0))
    if (remaining === 0) return Response.redirect(`${cancelUrl}?ticket=soldout`, 303)
  }

  // Active price tier
  const { presale, door } = meta.pricing
  const tier =
    presale?.endsAt && now < new Date(presale.endsAt).getTime() ? presale : door

  const cityShort = meta.city.split(',')[0].trim()
  const maxQty = remaining ?? 999

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][product_data][name]', `Nick Rains — ${cityShort}`)
  params.set('line_items[0][price_data][unit_amount]', String(tier.cents))
  const qty = Math.min(qtyParam, maxQty)
  params.set('line_items[0][quantity]', String(qty))
  params.set('metadata[show_id]', showId)
  params.set('metadata[price_cents]', String(tier.cents))
  params.set('success_url', `${url.origin}/ticket?session={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', cancelUrl)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    console.error('Stripe checkout error:', await res.text())
    return new Response('checkout error', { status: 502 })
  }

  const session = (await res.json()) as { url: string }
  return Response.redirect(session.url, 303)
}
