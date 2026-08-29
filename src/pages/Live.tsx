import { useState, useRef, useEffect } from 'react'

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
    ticketUrl: '/api/checkout?show=knoxville/090526',
    showAt: '2026-09-05T19:00:00-05:00',
    capacity: 75,
    pricing: {
      presale: { cents: 1000, label: '$10', endsAt: '2026-09-04T23:59:00-05:00' },
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
    `DTSTART:${dt}T193000`,
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
  const [availability, setAvailability] = useState<{ remaining: number | null; soldOut: boolean } | null>(null)
  const ticketParam = new URLSearchParams(window.location.search).get('ticket')


  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (el.paused) { el.play() } else { el.pause() }
  }


  // No /city/date match → the lineup of upcoming shows (also a friendly
  // fallback for a stale/typo'd show URL).
  if (!show) return <Lineup />

  const mapUrl = `https://maps.apple.com/?q=${encodeURIComponent(show.address)}`

  useEffect(() => {
    if (!show.ticketUrl || !show.capacity) return
    fetch(`/api/availability?show=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(setAvailability)
      .catch(() => {})
  }, [path, show.ticketUrl, show.capacity])

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
          {/* KNOXVILLE DEBUT + RAINS — group centered, K pinned to RAINS left edge */}
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

          {/* Venue + date stamp */}
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55 mb-1">
            {show.venue} &nbsp;·&nbsp; {show.city}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange">
            {show.date}{show.time ? ` · ${show.time}` : ''}
          </p>
        </div>
      </div>

      {/* ── Story ── */}
      <div className="px-6 py-12 max-w-md mx-auto">
        <div className="section-head text-ink/40 mb-8">
          <span>The story</span>
        </div>

        <div className="space-y-4 text-[1.05rem] leading-relaxed">
          <p>
            Two years ago my family and I packed everything into a vehicle and hit the road.
            My wife. My son. And music — the only thing I've ever known how to do.
          </p>
          <p>
            We've been moving ever since. Every show is how we eat, how we stay in gas,
            how we keep going. It's not a lifestyle. It's just our life.
          </p>
          <p>
            I'm working on my first album right now — songs written on the road,
            in parking lots and living rooms and places like this one.
            On September 5th in Knoxville, you'll hear them before anyone else does.
            45 minutes, no covers, just the record in progress — live at sunset.
          </p>
          <p>
            Showing up is the whole thing. That's all the support we need.
          </p>
        </div>
      </div>

      {/* ── Unreleased track — copy only; player is the fixed bar ── */}
      {show.track.url && (
        <div className="px-6 pb-12 max-w-md mx-auto">
          <div className="section-head text-ink/40 mb-8">
            <span>Before you go</span>
          </div>
          <p className="text-sm text-ink/60 leading-relaxed">
            A song from the album. Written on the road. Not out yet — this is the first listen.
          </p>
        </div>
      )}

      {/* ── Show details ── */}
      <div className="bg-[#0d0e09] text-paper">
        <div className="px-6 py-12 max-w-md mx-auto space-y-4">

          <div className="section-head text-paper/30 mb-8">
            <span>The night</span>
          </div>

          {/* Venue card */}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
          >
            <div className="w-14 flex-shrink-0 bg-white/8 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1C6.24 1 4 3.24 4 6c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 9 4a1.5 1.5 0 0 1 0 3.5z" fill="rgba(255,255,255,0.4)"/>
              </svg>
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
            <div className="flex flex-col w-14 flex-shrink-0">
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
              <div className="w-14 flex-shrink-0 bg-orange/15 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#c65a1e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-orange/60 mb-0.5">You&rsquo;re on the list</p>
                <p className="font-display text-lg text-paper leading-tight">Check your email</p>
                <p className="font-mono text-[10px] text-paper/40 mt-0.5">QR ticket on its way</p>
              </div>
            </div>
          ) : showComplete ? (
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              <div className="w-14 flex-shrink-0 bg-white/8 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M2 7.5C2 6.67 2.67 6 3.5 6H7V5C7 4.45 7.45 4 8 4H17C17.55 4 18 4.45 18 5V15C18 15.55 17.55 16 17 16H8C7.45 16 7 15.55 7 15V14H3.5C2.67 14 2 13.33 2 12.5V11.5C2.55 11.5 3 11.05 3 10.5C3 9.95 2.55 9.5 2 9.5V7.5Z" stroke="rgba(255,255,255,0.25)" strokeWidth="1.3"/>
                  <line x1="7" y1="8" x2="7" y2="12" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="1 1.5"/>
                </svg>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper/50 leading-tight">Show complete</p>
              </div>
            </div>
          ) : soldOut ? (
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              <div className="w-14 flex-shrink-0 bg-white/8 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M2 7.5C2 6.67 2.67 6 3.5 6H7V5C7 4.45 7.45 4 8 4H17C17.55 4 18 4.45 18 5V15C18 15.55 17.55 16 17 16H8C7.45 16 7 15.55 7 15V14H3.5C2.67 14 2 13.33 2 12.5V11.5C2.55 11.5 3 11.05 3 10.5C3 9.95 2.55 9.5 2 9.5V7.5Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3"/>
                  <line x1="7" y1="8" x2="7" y2="12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="1 1.5"/>
                </svg>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper leading-tight">Sold Out</p>
                <p className="font-mono text-[10px] text-paper/40 mt-0.5">{door.label} at the door — cash only</p>
              </div>
            </div>
          ) : show.ticketUrl ? (
            <a
              href={show.ticketUrl}
              className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
            >
              <div className="w-14 flex-shrink-0 bg-white/8 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M2 7.5C2 6.67 2.67 6 3.5 6H7V5C7 4.45 7.45 4 8 4H17C17.55 4 18 4.45 18 5V15C18 15.55 17.55 16 17 16H8C7.45 16 7 15.55 7 15V14H3.5C2.67 14 2 13.33 2 12.5V11.5C2.55 11.5 3 11.05 3 10.5C3 9.95 2.55 9.5 2 9.5V7.5Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3"/>
                  <line x1="7" y1="8" x2="7" y2="12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="1 1.5"/>
                </svg>
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
              <div className="w-14 flex-shrink-0 bg-white/8 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M2 7.5C2 6.67 2.67 6 3.5 6H7V5C7 4.45 7.45 4 8 4H17C17.55 4 18 4.45 18 5V15C18 15.55 17.55 16 17 16H8C7.45 16 7 15.55 7 15V14H3.5C2.67 14 2 13.33 2 12.5V11.5C2.55 11.5 3 11.05 3 10.5C3 9.95 2.55 9.5 2 9.5V7.5Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3"/>
                  <line x1="7" y1="8" x2="7" y2="12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="1 1.5"/>
                </svg>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-paper/35 mb-0.5">Tickets</p>
                <p className="font-display text-lg text-paper leading-tight">{door.label} · At the door</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating mini player — fixed bottom-right */}
      {show.track.url && (
        <div className="fixed bottom-6 right-5 z-50 w-52 rounded-lg overflow-hidden bg-[#0d0e09]/90 backdrop-blur-md border border-white/10 shadow-xl">
          {/* Controls */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
              className="w-7 h-7 rounded-full border border-orange/50 flex items-center justify-center flex-shrink-0 hover:border-orange transition-colors"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="min-w-0 overflow-hidden">
              <p className="font-mono text-[8px] uppercase tracking-widest text-paper/35 leading-none mb-1">Unreleased Demo</p>
              <span className="marquee font-mono text-[10px] text-paper/75 leading-none">
                {show.track.title}&nbsp;–&nbsp;Nick Rains&nbsp;&nbsp;·&nbsp;&nbsp;{show.track.title}&nbsp;–&nbsp;Nick Rains&nbsp;&nbsp;·&nbsp;&nbsp;
              </span>
            </div>
          </div>

          {/* Progress bar — bottom edge */}
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
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-6 py-8 text-center">
        <a href="https://nickrainsmusic.com" className="font-mono text-[10px] uppercase tracking-widest text-ink/30 hover:text-orange transition-colors">
          nickrainsmusic.com
        </a>
      </div>

    </div>
  )
}
