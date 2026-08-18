// Per-destination Open Graph — crawlers never run the SPA's JS, so the
// title/description are rewritten at the edge based on host + path.
const IDENTITIES = [
  { match: (h, p) => h.startsWith('songs.') || p.startsWith('/songs'),
    title: 'The Song List — Nick Rains',
    desc: '782 songs and counting. Find yours.' },
  { match: (h, p) => h.startsWith('epk.') || p.startsWith('/epk'),
    title: 'Nick Rains — Press Kit',
    desc: 'Bios, live video, track record, tech rider, booking.' },
  { match: (h, p) => h.startsWith('join.') || p.startsWith('/join'),
    title: 'Join The Club — Nick Rains',
    desc: 'You pick where he plays next. Enough people from one ZIP, and the tour routes through your area.' },
  { match: (h, p) => h.startsWith('tip.') || h.startsWith('donate.'),
    title: 'Tip the Band — Nick Rains',
    desc: 'Every dollar goes to the music.' },
  { match: (h, p) => p.startsWith('/queue'),
    title: 'Live Queue — Nick Rains',
    desc: 'Tonight’s requests, live. Boosts float to the top.' },
  { match: (h, p) => p.startsWith('/links') || p.startsWith('/linktree'),
    title: 'Nick Rains — Links',
    desc: 'The Club, tips, the song list, and everywhere else.' },
]

// Stripe tip link (also in src/data.ts — keep in sync)
const TIP_URL = 'https://donate.stripe.com/9AQaF25UW8P655C9AA'
const BOT_RE = /bot|crawler|spider|preview|facebookexternalhit|facebot|twitterbot|slackbot|whatsapp|telegram|discord|linkedin|pinterest|embedly|snapchat|vkshare|quora/i

export async function onRequest(context) {
  const url0 = new URL(context.request.url)

  // tip./donate. — humans go straight to Stripe (fast server redirect);
  // link scrapers get a branded card instead of Stripe's checkout title.
  if (url0.hostname.startsWith('tip.') || url0.hostname.startsWith('donate.')) {
    const ua = context.request.headers.get('user-agent') || ''
    if (!BOT_RE.test(ua)) {
      return Response.redirect(TIP_URL, 302)
    }
    const card = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Tip the Band — Nick Rains</title>
<meta name="description" content="Every dollar goes to the music.">
<meta property="og:title" content="Tip the Band — Nick Rains">
<meta property="og:description" content="Every dollar goes to the music.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nick Rains">
<meta property="og:url" content="https://${url0.hostname}/">
<meta property="og:image" content="https://nickrainsmusic.com/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://nickrainsmusic.com/og.jpg">
<meta http-equiv="refresh" content="0;url=${TIP_URL}">
</head><body></body></html>`
    return new Response(card, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }

  const res = await context.next()
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) return res

  const url = new URL(context.request.url)
  const id = IDENTITIES.find((i) => i.match(url.hostname, url.pathname))
  if (!id) return res

  const canonical = `https://${url.hostname}${url.pathname === '/' ? '/' : url.pathname}`
  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(id.title) } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', id.title) } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', id.desc) } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', id.desc) } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', canonical) } })
    .transform(res)
}
