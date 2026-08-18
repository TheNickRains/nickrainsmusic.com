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

export async function onRequest(context) {
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
