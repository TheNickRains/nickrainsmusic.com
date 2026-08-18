// POST /api/webhook/stripe — Stripe calls this when a boost payment lands.
// Verifies the signature, then marks the referenced request paid so it
// floats to the top of the queue. Configure in Stripe: endpoint URL
// https://<domain>/api/webhook/stripe, event: checkout.session.completed.

export async function onRequestPost({ request, env }) {
  const payload = await request.text()
  const sigHeader = request.headers.get('stripe-signature') || ''

  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('not configured', { status: 500 })

  const parts = Object.fromEntries(
    sigHeader.split(',').map((p) => p.split('=').map((s) => s.trim()))
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return new Response('bad signature header', { status: 400 })

  // Reject stale events (replay protection, 5 min tolerance)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return new Response('timestamp out of tolerance', { status: 400 })
  }

  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${timestamp}.${payload}`)
  if (!timingSafeEqual(expected, signature)) {
    return new Response('signature mismatch', { status: 400 })
  }

  let event
  try {
    event = JSON.parse(payload)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {}
    let ref = session.client_reference_id
    const amount = Number(session.amount_total || 0)

    // Device suffix (_d_<id>): record a VERIFIED payment for that device,
    // then strip it and continue with the purpose reference.
    if (ref && ref.includes('_d_')) {
      const [purpose, deviceId] = ref.split('_d_')
      if (deviceId) {
        await env.DB.prepare(
          'INSERT INTO tips (id, device_id, amount_cents, created_at) VALUES (?1, ?2, ?3, ?4)'
        ).bind(crypto.randomUUID(), deviceId, amount, Date.now()).run()
      }
      ref = purpose === 'tip' ? null : purpose
    }

    if (ref && amount > 0) {
      if (ref.startsWith('goal-')) {
        // Communal goal contribution — accumulate and unlock at 100%
        const goalId = ref.slice(5)
        await env.DB.prepare(
          'UPDATE goals SET current_cents = current_cents + ?1 WHERE id = ?2'
        ).bind(amount, goalId).run()
        await env.DB.prepare(
          `UPDATE goals SET unlocked = 1, unlocked_at = ?1
           WHERE id = ?2 AND unlocked = 0 AND current_cents >= goal_cents`
        ).bind(Date.now(), goalId).run()
      } else {
        // Boosted queue request
        await env.DB.prepare(
          'UPDATE requests SET paid = 1, amount_cents = amount_cents + ?1 WHERE id = ?2'
        ).bind(amount, ref).run()
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'content-type': 'application/json' },
  })
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
