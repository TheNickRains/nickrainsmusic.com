// POST /api/webhook/stripe — Stripe calls this when a checkout payment lands.
// Verifies the signature, then routes by what the session carries:
//   • metadata.show_id    → TICKET purchase: issue QR ticket(s) into `tickets`,
//                           email them via Resend (scanned at the door, /checkin)
//   • client_reference_id → boost / goal chip-in / device-verified tip (below)
// Configure in Stripe: endpoint URL https://<domain>/api/webhook/stripe,
// event: checkout.session.completed.

import { SHOW_META } from '../_shows'

// $10 door ticket — keep in sync with the payment link price. A link can
// override per show with metadata price_cents. Payment links may allow
// adjustable quantity; amount_total tells us how many tickets to issue.
const TICKET_PRICE_CENTS = 1000
const MAX_TICKETS_PER_ORDER = 10

export async function onRequestPost(context) {
  const { request, env } = context
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

    // ── Ticket purchase — the show's payment link carries show_id metadata ──
    const showId = (session.metadata && session.metadata.show_id) || ''
    if (showId) {
      await fulfillTickets(context, session, showId)
      return json({ received: true })
    }

    // ── Boosts / goals / tips ──
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

  return json({ received: true })
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

async function fulfillTickets(context, session, showId) {
  const { env } = context
  const sessionId = session.id || ''
  const details = session.customer_details || {}
  const email = details.email || session.customer_email || ''
  const name = details.name || ''
  const amount = Number(session.amount_total || 0)

  // Stripe redelivers webhooks — never issue a session's tickets twice
  if (sessionId) {
    const dupe = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM tickets WHERE stripe_session_id = ?1'
    ).bind(sessionId).first()
    if (dupe && dupe.n > 0) return
  }

  const unit = Number((session.metadata && session.metadata.price_cents) || 0) || TICKET_PRICE_CENTS
  const qty =
    amount >= unit && amount % unit === 0
      ? Math.min(amount / unit, MAX_TICKETS_PER_ORDER)
      : 1

  const now = Date.now()
  const ids = Array.from({ length: qty }, () => crypto.randomUUID())
  await env.DB.batch(
    ids.map((id) =>
      env.DB.prepare(
        `INSERT INTO tickets (ticket_id, show_id, buyer_email, buyer_name, stripe_session_id, used, used_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, NULL, ?6)`
      ).bind(id, showId, email, name, sessionId, now)
    )
  )

  if (env.RESEND_API_KEY && env.RESEND_FROM && email) {
    context.waitUntil(sendTicketEmail(env, { ids, showId, email, name }))
  }
}

async function sendTicketEmail(env, { ids, showId, email, name }) {
  const meta = SHOW_META[showId]
  const cityShort = meta ? meta.city.split(',')[0].trim() : ''
  const showLabel = cityShort ? `Nick Rains · ${cityShort}` : 'Nick Rains'
  const dateLine = meta ? [meta.date, meta.time].filter(Boolean).join(' · ') : ''
  const qrUrl = (id) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&qzone=2&data=${encodeURIComponent(id)}`

  // One QR per ticket, on a paper card so it scans off the dark background
  const qrBlock = (id, i) => `
    ${ids.length > 1 ? `<tr><td align="center" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a887f;padding:4px 0 10px;">Ticket ${i + 1} of ${ids.length}</td></tr>` : ''}
    <tr><td align="center" style="padding:0 0 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="#f2ede4" style="background-color:#f2ede4;border-radius:10px;padding:18px;">
          <img src="${qrUrl(id)}" width="240" height="240" alt="Ticket QR code"
               style="display:block;width:240px;height:240px;border:0;">
        </td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="font-family:'Courier New',monospace;font-size:10px;color:#5f5e56;padding:0 0 26px;word-break:break-all;">${id}</td></tr>`

  const row = (label, value) =>
    value
      ? `<tr><td style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#c65a1e;padding:12px 0 2px;">${label}</td></tr>
         <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#f2ede4;">${value}</td></tr>`
      : ''

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#0d0e09;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d0e09" style="background-color:#0d0e09;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;">
  <tr><td align="center" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c65a1e;padding-bottom:8px;">You&rsquo;re on the list</td></tr>
  <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#f2ede4;padding-bottom:6px;">Your Ticket${ids.length > 1 ? 's' : ''}</td></tr>
  <tr><td align="center" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a887f;padding-bottom:28px;">Show this at the door</td></tr>
  ${ids.map(qrBlock).join('')}
  <tr><td style="border-top:1px solid #33322c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Show', esc(showLabel))}
      ${row('Date', esc(dateLine))}
      ${row('Venue', meta ? `${esc(meta.venue)}<br><span style="font-size:12px;color:#8a887f;">${esc(meta.address)}</span>` : '')}
      ${row('Name', esc(name))}
    </table>
  </td></tr>
  <tr><td align="center" style="padding-top:34px;">
    <a href="https://nickrainsmusic.com" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a887f;text-decoration:none;">nickrainsmusic.com</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  const text = [
    `YOUR TICKET${ids.length > 1 ? 'S' : ''} — ${showLabel.toUpperCase()}`,
    '',
    'Show the QR in this email at the door (or read off the code).',
    '',
    ...ids.map((id, i) => `${ids.length > 1 ? `Ticket ${i + 1}: ` : 'Ticket: '}${id}`),
    '',
    ...(meta
      ? [`Show:  ${showLabel}`, `Date:  ${dateLine}`, `Venue: ${meta.venue} — ${meta.address}`]
      : [`Show:  ${showId}`]),
    ...(name ? [`Name:  ${name}`] : []),
    '',
    'nickrainsmusic.com',
  ].join('\n')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: email,
      ...(env.RESEND_TO ? { reply_to: env.RESEND_TO } : {}),
      subject: `Your ticket — ${showLabel}`,
      html,
      text,
    }),
  }).catch(() => {})
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// ─── Signature verification ──────────────────────────────────────────────────

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
