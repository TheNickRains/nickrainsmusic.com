// GET /api/fans?key=<ADMIN_KEY> — The Club as CSV (name, email, zip, joined).
export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get('key')
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response('nope', { status: 403 })
  }
  const { results } = await env.DB.prepare(
    'SELECT first_name, last_name, email, phone, phone_opt_in, geo_opt_in, zip, source, created_at FROM fans ORDER BY created_at DESC'
  ).all()
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = (results || []).map((r) =>
    [
      esc(r.first_name), esc(r.last_name), esc(r.email), esc(r.phone),
      r.phone_opt_in ? 'yes' : 'no', r.geo_opt_in ? 'yes' : 'no',
      esc(r.zip), esc(r.source), new Date(r.created_at).toISOString(),
    ].join(',')
  )
  const csv = ['first_name,last_name,email,phone,texts_ok,geo_ok,zip,source,joined', ...rows].join('\n')
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename="the-club.csv"',
    },
  })
}
