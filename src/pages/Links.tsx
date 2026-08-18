import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, LINKS } from '../data'

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
)

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Self-hosted Linktree replacement — the show-night page. Fans scan a QR at
// the merch table on cell service: must load instantly, thumb-first, and put
// The Club + tip jar above everything. No widgets, no embeds, links only.
const rows = [
  { label: 'Listen on Spotify', href: LINKS.spotify },
  { label: 'Apple Music', href: LINKS.appleMusic },
  { label: 'SoundCloud', href: LINKS.soundcloud },
  { label: 'Watch on YouTube', href: LINKS.youtube },
  { label: 'Tour dates', href: LINKS.bandsintownPage },
]

const socials = [
  { icon: <InstagramIcon />, title: 'Instagram', href: LINKS.instagram },
  { icon: <TikTokIcon />, title: 'TikTok', href: LINKS.tiktok },
  { icon: <YouTubeIcon />, title: 'YouTube', href: LINKS.youtube },
  { icon: <FacebookIcon />, title: 'Facebook', href: LINKS.facebook },
  { icon: <XIcon />, title: 'X', href: LINKS.x },
]

const Links = () => {
  useEffect(() => {
    document.title = 'Nick Rains — Links'
    return () => {
      document.title = 'Nick Rains'
    }
  }, [])

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Nick Rains',
        text: 'Indie-folk from Louisiana, living in Nashville.',
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  return (
    <div className="grain speckle min-h-screen text-ink">
      <div className="max-w-md mx-auto px-5 pt-10 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/images/headshot.jpg"
            alt="Nick Rains"
            className="film w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-ink"
          />
          <h1 className="display text-5xl mb-3">Nick Rains</h1>
          <p className="font-mono text-[11px] uppercase text-ink/60 mb-4">
            Songwriter · Artist · Producer
          </p>
          <p className="text-[15px] leading-snug max-w-xs mx-auto">
            If you're a fan of what I do — please, please, <em>please</em> join The Club.
            It's the best way to support me: it helps me book bigger rooms and tells me
            which towns to come play next.
          </p>
        </div>

        {/* The two moves that matter */}
        <a
          href="/#fanlist"
          className="btn block w-full text-center !py-4 !text-sm mb-3"
        >
          Join The Club →
        </a>
        <a
          href={LINKS.tipJar}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost block w-full text-center !py-4 !text-sm mb-1"
        >
          Leave a tip →
        </a>
        <p className="font-mono text-[10px] uppercase text-ink/45 text-center mb-8">
          Every dollar goes to the music
        </p>

        {/* Socials */}
        <div className="flex justify-center gap-2 mb-8">
          {socials.map((s) => (
            <a
              key={s.title}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.title}
              className="w-11 h-11 border-2 border-ink flex items-center justify-center hover:bg-ink hover:text-cream transition-colors"
            >
              {s.icon}
            </a>
          ))}
        </div>

        {/* Link ledger */}
        <div className="mb-8">
          <Link
            to="/songs"
            className="row-line border-ink/25 flex justify-between items-center py-4 group"
          >
            <span className="font-medium">The song list — search it, request one</span>
            <span className="font-mono text-xs text-orange group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          {rows.map((r) => (
            <a
              key={r.label}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="row-line border-ink/25 flex justify-between items-center py-4 group"
            >
              <span className="font-medium">{r.label}</span>
              <span className="font-mono text-xs text-orange group-hover:translate-x-1 transition-transform">→</span>
            </a>
          ))}
          <Link
            to="/epk"
            className="row-line border-ink/25 flex justify-between items-center py-4 group"
          >
            <span className="font-medium">Book me for your venue or event</span>
            <span className="font-mono text-xs text-orange group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Share + footer */}
        <button
          onClick={share}
          className="font-mono text-[11px] uppercase underline text-ink/50 hover:text-orange block mx-auto mb-10"
        >
          Share this page
        </button>
        <div className="text-center">
          <img src="/images/logo-black.png" alt="Nick Rains" className="h-8 w-auto mx-auto mb-2" />
          <p className="font-mono text-[10px] uppercase text-ink/40">
            <a href={`mailto:${CONTACT.email}`} className="underline hover:text-orange">{CONTACT.email}</a>
            {' · '}
            <Link to="/" className="underline hover:text-orange">nickrainsmusic.com</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Links
