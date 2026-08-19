import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CONTACT, LINKS, HOOK, BIO_BRIEF, BIO_EXTENDED, CONFIGS, DRAW, CADENCE } from '../data'

type Audience = 'standard' | 'venues' | 'listening' | 'agency'

// 'standard' is the canonical outline order: bio → music → live video → photos
// → draw proof → (press: skipped, none yet) → tech rider → dates → contact.
// The others swap the opening per buyer (venue buyers scan for draw proof;
// press/listening rooms scan for story; agencies scan for logistics).
const ORDER: Record<Audience, string[]> = {
  standard: ['bio', 'music', 'video', 'photos', 'draw', 'rider', 'dates'],
  venues: ['video', 'draw', 'lineups', 'rider', 'music', 'photos', 'dates'],
  listening: ['bio', 'music', 'video', 'photos', 'draw', 'dates', 'rider'],
  agency: ['lineups', 'video', 'rider', 'draw', 'bio', 'music', 'photos', 'dates'],
}

const LABELS: Record<Audience, string> = {
  standard: 'Standard',
  venues: 'Venues & casinos',
  listening: 'Listening rooms & press',
  agency: 'Agencies & private events',
}

const Section = ({
  id, title, note, children,
}: { id: string; title: string; note?: string; children: React.ReactNode }) => (
  <section id={id} className="px-5 md:px-10 py-10 max-w-4xl mx-auto w-full">
    <div className="flex items-baseline gap-4 border-b border-ink pb-2 mb-6">
      <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] whitespace-nowrap">
        ● {title}
      </h2>
      {note && (
        <span className="font-mono text-[11px] text-ink/45 ml-auto text-right truncate">{note}</span>
      )}
    </div>
    {children}
  </section>
)

const AUDIENCE_SEGMENTS = ['venues', 'listening', 'agency'] as const

const Epk = () => {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Clean routes: /venues, /listening, /agency (on epk. subdomain) or
  // /epk/venues etc. on the main domain. Legacy ?for= links still work.
  const lastSeg = location.pathname.split('/').filter(Boolean).pop() || ''
  const forParam = params.get('for')
  const audience: Audience =
    (AUDIENCE_SEGMENTS as readonly string[]).includes(lastSeg)
      ? (lastSeg as Audience)
      : forParam === 'listening' || forParam === 'agency' || forParam === 'venues'
        ? forParam
        : 'standard'
  const showSwitcher = params.get('preview') !== null
  const [bioView, setBioView] = useState<'short' | 'full'>('short')
  const base = location.pathname.startsWith('/epk') ? '/epk' : ''
  const goTo = (a: Audience) =>
    navigate(`${a === 'standard' ? base || '/' : `${base}/${a}`}?preview`)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://widget.bandsintown.com/main.min.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [audience])

  const sections: Record<string, React.ReactNode> = {
    bio: (
      <Section key="bio" id="bio" title="The story">
        <div className="flex items-center gap-1 mb-1">
          {(['short', 'full'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setBioView(v)}
              className={`font-mono text-[11px] uppercase px-3 py-1.5 border transition-colors ${
                bioView === v ? 'bg-ink text-cream border-ink' : 'border-ink/30 hover:border-ink'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase text-ink/40 mb-4">
          {bioView === 'short' ? '80 words' : '310 words'} · third person, copy-paste ready
        </p>
        <p className="text-lg md:text-xl leading-snug font-medium mb-5">{BIO_BRIEF}</p>
        {bioView === 'full' &&
          BIO_EXTENDED.map((p, i) => (
            <p key={i} className="text-ink/70 leading-relaxed mb-4">{p}</p>
          ))}
      </Section>
    ),

    music: (
      <Section key="music" id="music" title="Recordings">
        <iframe
          title="Nick Rains on Spotify"
          src={LINKS.spotifyArtistEmbed}
          width="100%"
          height="352"
          frameBorder="0"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
        <div className="flex gap-5 mt-3 font-mono text-xs uppercase">
          <a href={LINKS.spotify} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">Spotify</a>
          <a href={LINKS.appleMusic} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">Apple Music</a>
        </div>
      </Section>
    ),

    video: (
      <Section key="video" id="video" title="Live" note="unedited audio">
        <div className="grid md:grid-cols-2 gap-5 items-start">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase bg-ink text-cream inline-block px-2 py-1 mb-2">Full band</p>
            <video controls playsInline preload="none" poster="/images/band-poster.jpg" className="w-full h-auto">
              <source src="/images/band-live.mp4" type="video/mp4" />
            </video>
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase bg-ink text-cream inline-block px-2 py-1 mb-2">Solo acoustic</p>
            <iframe
              title="Nick Rains — live acoustic"
              src={LINKS.acousticReel}
              className="w-full bg-ink"
              height="400"
              frameBorder="0"
              scrolling="no"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>
      </Section>
    ),

    photos: (
      <Section key="photos" id="photos" title="Photos" note="tap to download">
        <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory -mx-5 md:-mx-10 px-5 md:px-10 pb-2">
          {['g4', 'g9', 'g5', 'g1', 'g2', 'g6', 'g7', 'g8', 'g3'].map((g) => (
            <a key={g} href={`/images/gallery/${g}.jpg`} download className="snap-start shrink-0">
              <img
                src={`/images/gallery/${g}.jpg`}
                alt="Nick Rains press photo"
                loading="lazy"
                className="h-72 md:h-96 w-auto object-cover"
              />
            </a>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase text-ink/40 mt-2">
          Hi-res on request · festival photos: Kevin Ferguson
        </p>
      </Section>
    ),

    draw: (
      <Section key="draw" id="draw" title="Highlights" note="venues · residencies · reach">
        <div>
          {DRAW.map((d) => (
            <div key={d.fact} className="row-line border-ink/25 flex justify-between gap-6 items-baseline py-3">
              <p className="font-medium">{d.fact}</p>
              <p className="font-mono text-xs text-ink/50 uppercase whitespace-nowrap">{d.where}</p>
            </div>
          ))}
        </div>
      </Section>
    ),

    lineups: (
      <Section key="lineups" id="lineups" title="Lineups" note="one act, six sizes">
        <div>
          {CONFIGS.map((c) => (
            <div key={c.name} className="row-line border-ink/25 grid grid-cols-[1fr_auto] md:grid-cols-[210px_1fr_auto] gap-x-6 items-baseline py-3">
              <h3 className="display text-xl md:text-2xl">{c.name}</h3>
              <p className="hidden md:block text-sm text-ink/60">{c.detail}</p>
              <span className="font-mono text-xs font-bold text-orange">{c.pieces} PC</span>
              <p className="md:hidden col-span-2 text-sm text-ink/60 mt-1">{c.detail}</p>
            </div>
          ))}
        </div>
      </Section>
    ),

    rider: (
      <Section key="rider" id="rider" title="Tech">
        <div className="mb-6">
          {[
            {
              config: 'Solo / Duo',
              artist: 'Full PA (Bose S1 Pro+), mics, all cabling',
              venue: 'One 120V outlet · 6×6 ft space',
              note: 'Set up in under 30 min, indoors or out',
            },
            {
              config: 'Band · 3–7 pc',
              artist: 'Players & instruments · bass, keys, lead gtr all sing',
              venue: 'PA with subs · 16-ch console · 4 monitor mixes · FOH engineer',
              note: 'Input list & stage plot below',
            },
          ].map((r) => (
            <div key={r.config} className="border-2 border-ink mb-3">
              <p className="display text-lg px-3 py-1.5 border-b-2 border-ink">{r.config}</p>
              <div className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 p-3 text-sm">
                <span className="font-mono text-[10px] font-bold uppercase text-ink/50 pt-0.5">Artist brings</span>
                <span>{r.artist}</span>
                <span className="font-mono text-[10px] font-bold uppercase text-ink/50 pt-0.5">Venue brings</span>
                <span>{r.venue}</span>
                <span className="font-mono text-[10px] font-bold uppercase text-ink/50 pt-0.5">Note</span>
                <span className="text-ink/60">{r.note}</span>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 px-3 text-sm">
            <span className="font-mono text-[10px] font-bold uppercase text-ink/50 pt-0.5">Set lengths</span>
            <span>Single 45-min set → full 4-hour night</span>
            <span className="font-mono text-[10px] font-bold uppercase text-ink/50 pt-0.5">References</span>
            <span>Client references on request</span>
          </div>
        </div>
        <div className="border-2 border-dashed border-ink/40 p-4">
          <p className="font-mono text-[11px] font-bold uppercase mb-2">Downloadable files</p>
          <a href={LINKS.techRiderPdf} download className="row-line border-ink/20 flex justify-between py-2 font-mono text-sm underline hover:text-orange">
            <span>Tech rider &amp; stage plot (PDF)</span><span className="text-ink/50">118 KB</span>
          </a>
          <a href="/images/gallery/g4.jpg" download className="row-line border-ink/20 flex justify-between py-2 font-mono text-sm underline hover:text-orange">
            <span>Press photo — portrait (JPG)</span><span className="text-ink/50">225 KB</span>
          </a>
          <a href="/images/gallery/g9.jpg" download className="flex justify-between py-2 font-mono text-sm underline hover:text-orange">
            <span>Press photo — festival (JPG)</span><span className="text-ink/50">391 KB</span>
          </a>
        </div>
      </Section>
    ),

    dates: (
      <Section key="dates" id="dates" title="Dates" note={CADENCE.toLowerCase()}>
        <div
          className="bit-widget-initializer"
          data-artist-name={LINKS.bandsintownArtist}
          data-display-local-dates="false"
          data-display-past-dates="false"
          data-auto-style="false"
          data-text-color="#282825"
          data-link-color="#c65a1e"
          data-background-color="transparent"
          data-display-limit="10"
          data-link-text-color="#f5e9d1"
          data-display-lineup="false"
          data-display-play-my-city="false"
          data-separator-color="rgba(40,40,37,0.2)"
        />
        <a
          href={`mailto:${CONTACT.email}?subject=Booking inquiry — Nick Rains`}
          className="block text-center btn mt-6 !py-4 w-full"
        >
          Request a date →
        </a>
      </Section>
    ),
  }

  return (
    <div className="grain speckle text-ink min-h-screen">
      {/* Ticker */}
      <div className="bg-olive text-cream font-mono text-[11px] tracking-wide text-center py-1.5 px-3 uppercase">
        Now booking — Nashville &amp; beyond · solo acoustic to 7-piece band · {CONTACT.phone}
      </div>

      {/* Header — the face, then everything a buyer needs before scrolling */}
      <header className="max-w-4xl mx-auto">
        {/* Mobile: full-width portrait hero */}
        <img
          src="/images/headshot.jpg"
          alt="Nick Rains"
          className="w-full h-[48vh] object-cover object-top md:hidden"
        />

        <div className="px-5 md:px-10 pt-5 pb-8">
          <div className="hidden md:flex justify-between items-start mb-5">
            <Link to="/">
              <img src="/images/logo-black.png" alt="Nick Rains" className="h-9 w-auto" />
            </Link>
            {showSwitcher && (
            <div className="flex gap-1 font-mono text-[10px] uppercase">
              {(Object.keys(ORDER) as Audience[]).map((a) => (
                <button
                  key={a}
                  onClick={() => goTo(a)}
                  className={`px-2.5 py-1 border transition-colors ${
                    audience === a ? 'bg-ink text-cream border-ink' : 'border-ink/30 hover:border-ink'
                  }`}
                >
                  {LABELS[a]}
                </button>
              ))}
            </div>
            )}
          </div>

          <div className="grid md:grid-cols-[1fr_210px] gap-6 items-start mt-4 md:mt-0">
            <div>
              <h1 className="display text-[15vw] md:text-8xl mb-3">Nick Rains</h1>
              <p className="font-mono text-xs uppercase text-ink/60 mb-3">
                {HOOK.genre} · {HOOK.base}
              </p>
              <p className="text-lg md:text-xl font-medium max-w-xl mb-5">{HOOK.line}</p>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                <a href={`mailto:${CONTACT.email}`} className="btn text-center !px-3">Email booking</a>
                <a href={CONTACT.phoneHref} className="btn btn-ghost text-center !px-3">{CONTACT.phone}</a>
              </div>
            </div>
            <img
              src="/images/headshot.jpg"
              alt="Nick Rains"
              className="film hidden md:block w-full h-56 object-cover object-top"
            />
          </div>
        </div>
      </header>

      {/* Sections in audience order */}
      {ORDER[audience].map((key) => sections[key])}

      {/* Contact — always last, olive block with torn edge */}
      <footer className="torn bg-olive text-cream mt-10">
        <div className="px-5 md:px-10 pt-16 pb-4 max-w-4xl mx-auto">
          <h2 className="display text-5xl md:text-6xl mb-6">Let&rsquo;s hold a date.</h2>
          <div className="flex flex-wrap gap-4 items-center mb-10">
            <a href={`mailto:${CONTACT.email}`} className="btn">{CONTACT.email}</a>
            <a href={CONTACT.phoneHref} className="btn btn-ghost">{CONTACT.phone}</a>
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-cream/25 pt-5 font-mono text-[11px] uppercase text-cream/60">
            <span>Booking &amp; inquiries — Nicholas Rains, independent</span>
            <Link to="/" className="underline hover:text-orange">nickrainsmusic.com</Link>
          </div>
        </div>
        <div className="h-[12vw] overflow-hidden mt-4">
          <div className="ghost text-[22vw] text-center whitespace-nowrap">Nick Rains</div>
        </div>
      </footer>
    </div>
  )
}

export default Epk
