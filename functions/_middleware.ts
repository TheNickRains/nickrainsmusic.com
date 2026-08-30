// Injects per-show Open Graph meta tags for live.nickrainsmusic.com/{city}/{MMDDYY}
// so social previews (iMessage, Twitter/X, Instagram DM, etc.) show the show flyer.

import { SHOW_META } from './api/_shows'

export const onRequest: PagesFunction = async (ctx) => {
  const response = await ctx.next()

  const url = new URL(ctx.request.url)
  const isLive = url.hostname.startsWith('live.')
  if (!isLive) return response

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) return response

  const showId = url.pathname.replace(/^\//, '').replace(/\/$/, '')
  const meta = SHOW_META[showId]
  if (!meta) return response

  const origin = `${url.protocol}//${url.hostname}`
  const ogImagePath = meta.ogImage
    ? meta.ogImage.split('/').map(s => encodeURIComponent(s)).join('/')
    : null
  const ogImage = ogImagePath ? `${origin}${ogImagePath}` : `${origin}/images/headshot.jpg`
  const title = `Nick Rains — Live in ${meta.city.split(',')[0]}`
  const description = `${meta.date} · ${meta.venue} · Get your tickets.`

  return new HTMLRewriter()
    .on('title', {
      element(el) { el.setInnerContent(title) },
    })
    .on('meta[name="description"]', {
      element(el) { el.setAttribute('content', description) },
    })
    .on('meta[property="og:title"]', {
      element(el) { el.setAttribute('content', title) },
    })
    .on('meta[property="og:description"]', {
      element(el) { el.setAttribute('content', description) },
    })
    .on('meta[property="og:image"]', {
      element(el) { el.setAttribute('content', ogImage) },
    })
    .on('meta[property="og:url"]', {
      element(el) { el.setAttribute('content', url.href) },
    })
    .on('meta[name="twitter:image"]', {
      element(el) { el.setAttribute('content', ogImage) },
    })
    .transform(response)
}
