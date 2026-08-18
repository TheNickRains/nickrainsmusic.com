// POST /api/join — The Club signup (native, all sources).
// Body: { email, firstName, lastName?, phone?, phoneOptIn, geoOptIn,
//         postalCode?, source, device, website(honeypot) }
// Source: 'Kiosk' | 'Live' | 'Digital' | 'Stripe Redirect' | 'Website'
//
// Pipeline (matches the existing Tally→gateway→GAS contract):
//   1. Upsert into D1 `fans` (site's own copy)
//   2. Forward normalized payload to GAS → Google Sheets CRM
//      (env: GAS_TALLY_URL + GAS_AUTH_TOKEN — skipped if unset)
// Signup notifications are a WRAP-UP, not per-signup — see /api/show end-show.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SOURCES = ['Kiosk', 'Live', 'Digital', 'Stripe Redirect', 'Website']

export async function onRequestPost(context) {
  const { request, env } = context
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  if ((body.website || '').toString().trim() !== '') return json({ ok: true }) // honeypot

  const email = (body.email || '').toString().trim().toLowerCase().slice(0, 120)
  const firstName = (body.firstName || '').toString().trim().slice(0, 60)
  const lastName = (body.lastName || '').toString().trim().slice(0, 60)
  const phone = (body.phone || '').toString().trim().slice(0, 25)
  const phoneOptIn = Boolean(body.phoneOptIn) && phone !== ''
  const geoOptIn = Boolean(body.geoOptIn)
  const zip = (body.postalCode || '').toString().trim().slice(0, 10)
  const source = SOURCES.includes(body.source) ? body.source : 'Website'
  const device = (body.device || '').toString().slice(0, 64)

  if (!EMAIL_RE.test(email)) return json({ error: 'that email doesn’t look right' }, 400)
  if (geoOptIn && !zip) return json({ error: 'need the ZIP to route the tour' }, 400)

  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const now = Date.now()
  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM fans WHERE device_id = ?1 AND created_at > ?2'
  ).bind(device || ip, now - 60_000).first()
  if (recent && recent.n >= 3) return json({ error: 'easy there' }, 429)

  await env.DB.prepare(
    `INSERT INTO fans (id, first_name, last_name, email, phone, phone_opt_in, geo_opt_in, zip, source, device_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(email) DO UPDATE SET
       first_name = ?2, last_name = ?3, phone = ?5, phone_opt_in = ?6,
       geo_opt_in = ?7, zip = ?8, source = ?9, device_id = ?10`
  ).bind(
    crypto.randomUUID(), firstName, lastName, email, phone,
    phoneOptIn ? 1 : 0, geoOptIn ? 1 : 0, zip, source, device || ip, now
  ).run()

  // 2. Google Sheets CRM (same normalized shape the gateway sends to tally_crm.gs)
  if (env.GAS_TALLY_URL && env.GAS_AUTH_TOKEN) {
    context.waitUntil(
      fetch(env.GAS_TALLY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          authToken: env.GAS_AUTH_TOKEN,
          eventId: `site_${crypto.randomUUID()}`,
          email,
          firstName,
          lastName,
          phone,
          phoneOptIn,
          geoOptIn,
          postalCode: zip,
          source,
          subscriberSince: new Date(now).toISOString(),
        }),
      }).catch(() => {})
    )
  }

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
