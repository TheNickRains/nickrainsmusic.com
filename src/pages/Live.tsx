import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTicket, faLocationDot, faCheck } from '@fortawesome/free-solid-svg-icons'

// ─── Show config ─────────────────────────────────────────────────────────────
// Add future shows here. Key = URL path (everything after live.nickrainsmusic.com/)
interface ShowData {
  city: string
  venue: string
  address: string          // street address for ICS + map link
  date: string             // display string
  dateIso: string          // YYYYMMDD for ICS
  time: string | null      // display string, null = still TBD
  ticketUrl: string | null // /api/checkout?show=<key> → Stripe session → QR ticket email.
                           // null = door only. Also add the show to functions/api/_shows.ts.
  showAt: string           // ISO 8601 show start — card flips to "Show complete" after this
  capacity?: number        // optional max tickets; omit for unlimited
  pricing: {
    presale?: { cents: number; label: string; endsAt?: string }
    door: { cents: number; label: string }
  }
  track: {
    title: string
    url: string | null     // audio file URL — null hides the player section
  }
}

const SHOWS: Record<string, ShowData> = {
  'knoxville/090526': {
    city: 'Knoxville, TN',
    venue: 'Pretentious Beer Co.',
    address: '131 South Central Street, Knoxville, TN 37902',
    date: 'Saturday, September 5th',
    dateIso: '20260905',
    time: 'Doors 7 PM · Music 7:30 PM',
    ticketUrl: '/tickets?show=knoxville/090526',
    showAt: '2026-09-05T19:00:00-05:00',
    capacity: 75,
    pricing: {
      presale: { cents: 1200, label: '$12', endsAt: '2026-09-04T23:59:00-05:00' },
      door: { cents: 1500, label: '$15' },
    },
    track: {
      title: 'Small House',
      url: '/audio/small-house-demo.mp3',
    },
  },
}

// ─── ICS calendar download ───────────────────────────────────────────────────
function downloadIcs(show: ShowData) {
  const dt = show.dateIso
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nick Rains//Live//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dt}T190000`,
    `DTEND:${dt}T210000`,
    `SUMMARY:Nick Rains — Live at ${show.venue}`,
    `LOCATION:${show.address}`,
    `DESCRIPTION:Doors 7 PM · Music 7:30 PM · ${show.pricing.door.label} at the door · nickrainsmusic.com`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nick-rains-${show.city.toLowerCase().replace(/[^a-z]/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Play/pause SVGs ─────────────────────────────────────────────────────────
function PlayIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1L13 7L3 13V1Z" fill="#c65a1e" /></svg>
}
function PauseIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="3" height="12" fill="#c65a1e" /><rect x="9" y="1" width="3" height="12" fill="#c65a1e" /></svg>
}


// ─── Grain overlay (matches the hero's cinematic grain) ──────────────────────
function Grain() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")",
        opacity: 0.13,
        mixBlendMode: 'overlay',
      }}
    />
  )
}

// ─── Lineup ──────────────────────────────────────────────────────────────────
// The root of live.nickrainsmusic.com (no /city/date) — a poster of upcoming
// shows. Was a dead "No show found"; now surfaces the SHOWS map as a list.
function Lineup() {
  const now = Date.now()
  const shows = Object.entries(SHOWS)
    .map(([key, s]) => ({ key, ...s }))
    // keep a show visible until a few hours after start, then it drops off
    .filter((s) => new Date(s.showAt).getTime() >= now - 4 * 3600 * 1000)
    .sort((a, b) => new Date(a.showAt).getTime() - new Date(b.showAt).getTime())

  return (
    <div className="relative min-h-screen text-paper overflow-hidden" style={{ background: '#0d0e09' }}>
      <Grain />
      <div className="relative z-10 max-w-xl mx-auto px-6 pt-10 pb-16">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img
            src="/images/logo-white.png"
            alt="Nick Rains"
            className="h-8 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Title */}
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-orange mb-2">On the road</p>
          <h1 className="display text-[26vw] sm:text-[128px] text-paper leading-[0.8] tracking-[-0.01em]">LIVE</h1>
        </div>

        {/* Orange rule */}
        <div className="flex items-center justify-center gap-3 my-8">
          <div className="h-px w-10 bg-orange/50" />
          <div className="h-[3px] w-[3px] rounded-full bg-orange" />
          <div className="h-px w-10 bg-orange/50" />
        </div>

        {shows.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-paper/40 mb-7">No dates on the books right now</p>
            <a
              href="https://nickrainsmusic.com/#fanlist"
              className="inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-orange border border-orange/45 rounded-full px-6 py-3"
            >
              Join The Club — hear first →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {shows.map((s) => (
              <a
                key={s.key}
                href={`/${s.key}`}
                className="block border border-paper/12 rounded-lg px-5 py-4 hover:border-orange/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange mb-1.5">{s.date}</p>
                    <p className="display text-2xl text-paper leading-tight truncate">{s.venue}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45 mt-1.5">
                      {s.city}{s.time ? ` · ${s.time}` : ''}
                    </p>
                  </div>
                  <svg width="8" height="14" viewBox="0 0 6 10" fill="none" className="flex-shrink-0">
                    <path d="M1 1L5 5L1 9" stroke="#c65a1e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Footer link home */}
        <div className="text-center mt-12">
          <a
            href="https://nickrainsmusic.com"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/35 hover:text-orange transition-colors"
          >
            nickrainsmusic.com
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Live() {
  const path = window.location.pathname.replace(/^\//, '')
  const show = SHOWS[path]

  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [availability, setAvailability] = useState<{ remaining: number | null; soldOut: boolean } | null>(null)
  const ticketParam = new URLSearchParams(window.location.search).get('ticket')


  useEffect(() => {
    document.body.style.background = '#0d0e09'
    return () => { document.body.style.background = '' }
  }, [])

useEffect(() => {
    if (!show?.ticketUrl || !show?.capacity) return
    fetch(`/api/availability?show=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(setAvailability)
      .catch(() => {})
  }, [path, show?.ticketUrl, show?.capacity])

  // Try immediate autoplay (works on desktop); fall back to first user interaction on mobile.
  useEffect(() => {
    if (!show?.track?.url) return
    const events = ['touchstart', 'mousedown', 'keydown', 'scroll'] as const
    let started = false
    const onInteraction = () => {
      if (started) return
      started = true
      audioRef.current?.play().catch(() => {})
      events.forEach(e => document.removeEventListener(e, onInteraction))
    }
    audioRef.current?.play().then(() => { started = true }).catch(() => {
      events.forEach(e => document.addEventListener(e, onInteraction, { passive: true }))
    })
    return () => events.forEach(e => document.removeEventListener(e, onInteraction))
  }, [show?.track?.url])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.75)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (el.paused) { el.play() } else { el.pause() }
  }

  // No /city/date match → lineup of upcoming shows
  if (!show) return <Lineup />

  const mapUrl = `https://maps.apple.com/?q=${encodeURIComponent(show.address)}`

  const now = Date.now()
  const { presale, door } = show.pricing
  const isOver = now >= new Date(show.showAt).getTime()
  const presaleActive = !isOver && !!(presale?.endsAt && now < new Date(presale.endsAt).getTime())
  const activeTier = presaleActive ? presale! : door
  const presaleEndLabel = presale?.endsAt
    ? new Date(presale.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  const soldOut = availability?.soldOut ?? (ticketParam === 'soldout')
  const showComplete = isOver || ticketParam === 'expired'

  return (
    <div className="grain speckle min-h-screen text-ink">

      {/* ── Hero — concert poster ── */}
      <div className="relative h-[100svh] bg-[#0d0e09] overflow-hidden">
        {/* Full-bleed photo */}
        <img
          src="/images/headshot.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center film"
          style={{ filter: 'contrast(1.1) brightness(0.88)' }}
        />

        {/* Poster vignette — dark top edge, heavy dark bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(13,14,9,0.55) 0%, transparent 22%, transparent 42%, rgba(13,14,9,0.72) 62%, rgba(13,14,9,0.96) 78%, #0d0e09 100%)',
          }}
        />

        {/* Cinematic grain — heavier than the page .grain, scoped to the hero */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")",
            opacity: 0.13,
            mixBlendMode: 'overlay',
          }}
        />

        {/* Audio element */}
        {show.track.url && (
          <audio
            ref={audioRef}
            src={show.track.url}
            autoPlay
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              const el = audioRef.current
              if (el && el.duration) setProgress((el.currentTime / el.duration) * 100)
            }}
            onEnded={() => { setPlaying(false); setProgress(0) }}
            preload="auto"
          />
        )}

        {/* Logo — top center */}
        <div className="absolute top-8 inset-x-0 flex justify-center z-10">
          <img
            src="/images/logo-white.png"
            alt="Nick Rains"
            className="h-8 opacity-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>


        {/* Poster typography block — pinned to bottom, centered */}
        <div className="absolute bottom-0 inset-x-0 z-10 pb-10 text-center">
          {/* KNOXVILLE DEBUT + RAINS */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <p
                className="absolute bottom-full left-0 mb-1 display text-[9vw] sm:text-[6vw] text-orange leading-none whitespace-nowrap"
                style={{ transform: 'scaleX(0.6)', transformOrigin: 'left center' }}
              >
                KNOXVILLE DEBUT
              </p>
              <h1 className="display inline-block text-[29vw] sm:text-[23vw] text-paper leading-[0.82] tracking-[-0.01em]">
                RAINS
              </h1>
            </div>
          </div>

          {/* Orange rule */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-orange/50" />
            <div className="h-[3px] w-[3px] rounded-full bg-orange" />
            <div className="h-px w-10 bg-orange/50" />
          </div>

          {/* Venue + date stamp — dynamic font size ensures single line on all screens */}
          <p className="font-mono text-[2.5vw] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.22em] text-paper/55 mb-1">
            {show.venue} &nbsp;·&nbsp; {show.city}
          </p>
          <p className="font-mono text-[2.5vw] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.22em] text-orange">
            {show.date}{show.time ? ` · ${show.time}` : ''}
          </p>
        </div>
      </div>

      {/* ── Story ── */}
      <div className="px-6 py-12 max-w-md mx-auto md:max-w-4xl md:px-16">
        <div className="section-head text-ink/40 mb-8">
          <span>My story</span>
        </div>

        <div className="space-y-4 text-[1.05rem] leading-relaxed max-w-xl mx-auto">
          <p>
            In 2023, I got the chance to play a music festival in Woodstock, New York.
            I got to meet, sit and talk with some of the biggest artists in the world.
            One in particular inspired me to start this crazy journey...
          </p>
          <p>
            Two years ago my wife and I sold everything,
            and moved our two year old son into an RV and hit the road.
          </p>
          <p>
            We've been on the road ever since. I've busked street corners across North America.
            I've played rooms of all shapes and sizes, and kept my family and God paramount along the way.
          </p>
          <p>
            I'm making the biggest transition of my life right now — a shift from playing covers, to sharing my own songs.
            It's a massive risk and there are no guarantees. On September 5th in Knoxville, you'll hear them before anyone else does.
            45 minutes, no covers, just the record in progress — live at sunset.
          </p>
          {show.track.url && (
            <p>
              The song playing right now is an unreleased demo. I wrote it when my wife was pregnant with our son — it brought up so many emotions, and music is the way I process it all.
            </p>
          )}
        </div>
      </div>

      {/* ── Photo strip ── */}
      <div className="overflow-x-auto md:overflow-x-visible pb-2">
        <div className="flex gap-5 px-6 pb-4 pt-2 items-start w-max md:w-auto md:justify-center md:max-w-4xl md:mx-auto md:px-16">
          {[
            { src: '/images/catbird.jpg', alt: 'Catbird Music Festival', caption: "Catbird Fest '23", rotate: '-rotate-2', mt: '' },
            { src: '/images/family.jpg',  alt: 'Nick and family',        caption: 'The crew',           rotate: 'rotate-1',   mt: 'mt-6' },
            { src: '/images/rv.jpg',      alt: 'Home on the road',       caption: 'Home on the road',   rotate: '-rotate-1',  mt: 'mt-2' },
          ].map(({ src, alt, caption, rotate, mt }) => (
            <figure
              key={src}
              className={`polaroid ${rotate} w-44 shrink-0 ${mt} md:cursor-zoom-in`}
              onClick={() => setLightbox({ src, alt })}
            >
              <img src={src} alt={alt} className="film w-full h-48 object-cover object-top" />
              <figcaption>{caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="film max-h-[85vh] max-w-[85vw] object-contain shadow-2xl"
          />
        </div>
      )}

      {/* ── Signed letter ── */}
      <div className="px-6 pt-4 pb-10 md:px-16 md:max-w-4xl md:mx-auto">
        <div className="max-w-xl mx-auto">
          <p className="text-sm text-ink/55 leading-relaxed italic">
            If this message has resonated with you, we'd love to meet you.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-orange mt-2">♥ —Nick</p>
        </div>
      </div>

      {/* ── Show details ── */}
      <div className="bg-[#0d0e09] text-paper">
        <div className="px-6 py-12 max-w-md mx-auto space-y-4">

          <div className="section-head text-paper/30 mb-8">
            <span>Details</span>
          </div>

          {/* Venue card */}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
          >
            <div className="flex flex-col w-14 shrink-0">
              <div className="bg-orange py-[3px] flex items-center justify-center">
                <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/90 uppercase">Map</span>
              </div>
              <div className="flex-1 flex items-center justify-center bg-paper">
                <FontAwesomeIcon icon={faLocationDot} className="text-ink text-lg" />
              </div>
            </div>
            <div className="flex-1 px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Venue</p>
              <p className="font-display text-lg text-paper leading-tight">{show.venue}</p>
              <p className="font-mono text-[10px] text-paper/40 mt-0.5 leading-snug">{show.address}</p>
            </div>
            <div className="flex items-center pr-4">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </a>

          {/* iOS-style calendar card */}
          <button
            onClick={() => downloadIcs(show)}
            className="w-full flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 transition-colors text-left"
          >
            {/* Calendar icon */}
            <div className="flex flex-col w-14 shrink-0">
              <div className="bg-orange py-[3px] flex items-center justify-center">
                <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/90 uppercase">Sep</span>
              </div>
              <div className="flex-1 flex items-center justify-center bg-paper">
                <span className="display text-2xl text-ink leading-none">5</span>
              </div>
            </div>
            {/* Event info */}
            <div className="flex-1 px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Add to Calendar</p>
              <p className="font-display text-lg text-paper leading-tight">Nick Rains · Knoxville</p>
              <p className="font-mono text-[10px] text-paper/40 mt-0.5">{show.time ?? 'Time TBD'}</p>
            </div>
            <div className="flex items-center pr-4">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </button>

          {/* Tickets */}
          {ticketParam === 'success' ? (
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-orange/30 bg-orange/10">
              <div className="flex flex-col w-14 shrink-0">
                <div className="bg-orange py-[3px] flex items-center justify-center">
                  <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/90 uppercase">Tix</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-paper">
                  <FontAwesomeIcon icon={faCheck} className="text-ink text-lg" />
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-orange/60 mb-0.5">You&rsquo;re on the list</p>
                <p className="font-display text-lg text-paper leading-tight">Check your email for your ticket</p>
              </div>
            </div>
          ) : showComplete ? (
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              <div className="flex flex-col w-14 shrink-0">
                <div className="bg-white/10 py-[3px] flex items-center justify-center">
                  <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/30 uppercase">Tix</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-paper/10">
                  <FontAwesomeIcon icon={faTicket} className="text-paper/25 text-lg" />
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper/50 leading-tight">Show complete</p>
              </div>
            </div>
          ) : soldOut ? (
            <div className="relative flex items-stretch gap-0 rounded-2xl overflow-hidden border border-orange/30 bg-white/5">
              <div className="flex flex-col w-14 shrink-0 opacity-30">
                <div className="bg-orange py-[3px] flex items-center justify-center">
                  <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/90 uppercase">Tix</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-paper">
                  <FontAwesomeIcon icon={faTicket} className="text-ink text-lg" />
                </div>
              </div>
              <div className="flex-1 px-4 py-3 opacity-40">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper leading-tight">{door.label} at the door</p>
              </div>
              {/* Stamp */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-[3px] border-orange rounded px-3 py-1 rotate-[-10deg] shadow-[0_0_20px_rgba(198,90,30,0.3)]">
                  <span className="font-mono text-base font-bold tracking-[0.25em] text-orange uppercase">Sold Out</span>
                </div>
              </div>
            </div>
          ) : show.ticketUrl ? (
            <a
              href={show.ticketUrl}
              className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
            >
              <div className="flex flex-col w-14 shrink-0">
                <div className="bg-orange py-[3px] flex items-center justify-center">
                  <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/90 uppercase">Tix</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-paper">
                  <FontAwesomeIcon icon={faTicket} className="text-ink text-lg" />
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper leading-tight">
                  {activeTier.label} · {presaleActive ? 'Presale' : 'At the door'}
                </p>
                {presaleActive && (
                  <p className="font-mono text-[10px] text-paper/40 mt-0.5">
                    Ends {presaleEndLabel} · {door.label} at the door
                  </p>
                )}
                {!presaleActive && availability?.remaining != null && availability.remaining <= 10 && (
                  <p className="font-mono text-[10px] text-orange/70 mt-0.5">
                    {availability.remaining} left
                  </p>
                )}
              </div>
              <div className="flex items-center pr-4">
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </a>
          ) : (
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              <div className="flex flex-col w-14 shrink-0">
                <div className="bg-orange py-[3px] flex items-center justify-center">
                  <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-paper/90 uppercase">Tix</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-paper">
                  <FontAwesomeIcon icon={faTicket} className="text-ink text-lg" />
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper leading-tight">{door.label} · At the door</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-[#0d0e09] border-t border-white/5">
        <div className="px-6 pt-8 pb-5 flex flex-col items-center gap-5">
          <button
            onClick={() => {
              const url = window.location.href
              if (navigator.share) {
                navigator.share({ title: `Nick Rains — ${show.city}`, url })
              } else {
                navigator.clipboard.writeText(url).then(() => alert('Link copied!'))
              }
            }}
            className="font-mono text-[11px] uppercase tracking-[0.15em] border border-paper/20 rounded-full px-6 py-2.5 text-paper/50 hover:border-orange hover:text-orange transition-colors"
          >
            Invite a Friend
          </button>
          <a href="https://nickrainsmusic.com" className="font-mono text-[10px] uppercase tracking-widest text-paper/30 hover:text-orange transition-colors">
            nickrainsmusic.com
          </a>
        </div>
        <div className="overflow-hidden">
          <div className="ghost text-[21vw] text-center whitespace-nowrap">NICK RAINS</div>
        </div>
      </div>

      {/* ── Floating mini-player ── */}
      {show.track.url && (
        <>
          {/* Mobile: full-width bar slides up from bottom */}
          <div className={`md:hidden fixed bottom-0 inset-x-0 z-50 transition-transform duration-500 ease-out ${scrolled ? 'translate-y-0' : 'translate-y-full'}`}>
            <div
              className="h-[2px] bg-white/10 cursor-pointer"
              onClick={e => {
                const el = audioRef.current
                if (!el) return
                const rect = e.currentTarget.getBoundingClientRect()
                el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration
              }}
            >
              <div className="h-full bg-orange transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="bg-[#0d0e09]/95 backdrop-blur-sm border-t border-white/8 px-5 py-3 flex items-center gap-4">
              <button
                onClick={toggle}
                aria-label={playing ? 'Pause' : 'Play'}
                className="w-8 h-8 rounded-full border border-orange/50 flex items-center justify-center shrink-0 hover:border-orange transition-colors"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[8px] uppercase tracking-widest text-paper/35 leading-none mb-0.5">Now playing · Unreleased</p>
                <p className="font-mono text-[11px] text-paper/65 leading-none truncate">{show.track.title} – Nick Rains</p>
              </div>
            </div>
          </div>

          {/* Desktop: floating card in bottom-right corner — always visible */}
          <div className="hidden md:block fixed bottom-6 right-6 z-50 w-72 rounded-xl overflow-hidden shadow-2xl">
            <div
              className="h-[3px] bg-white/10 cursor-pointer"
              onClick={e => {
                const el = audioRef.current
                if (!el) return
                const rect = e.currentTarget.getBoundingClientRect()
                el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration
              }}
            >
              <div className="h-full bg-orange transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="bg-[#0d0e09] border border-white/10 border-t-0 rounded-b-xl px-4 py-3.5 flex items-center gap-3">
              <button
                onClick={toggle}
                aria-label={playing ? 'Pause' : 'Play'}
                className="w-9 h-9 rounded-full border border-orange/50 flex items-center justify-center shrink-0 hover:border-orange transition-colors"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[8px] uppercase tracking-widest text-paper/35 leading-none mb-1">Now playing · Unreleased</p>
                <p className="font-mono text-[12px] text-paper/70 leading-none truncate">{show.track.title} – Nick Rains</p>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
