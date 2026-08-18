import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, LINKS } from '../data'
import SONGS from '../songs.json'
import Goals from '../components/Goals'
import { useShowGate } from '../hooks/useShowGate'
import TipNudge, { markTipped } from '../components/TipNudge'
import { withDevice } from '../device'

// Native song list + request queue. Tap a song → drop it in tonight's queue
// (free) → optional paid Boost floats it to the top (Stripe payment link,
// verified by webhook). Falls back to SMS if the queue API is unreachable.

// Nashville list = curated flag baked into songs.json by scripts/tag-songs.py
// (Nick's set list ∩ master list, plus all Country-genre songs).

const DECADES = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s']

const smsHref = (body: string) => `sms:+15045180117?&body=${encodeURIComponent(body)}`

// Remember which requests THIS device made — the queue page shows the boost
// button only on your own songs.
const rememberMine = (id: string) => {
  try {
    const mine = JSON.parse(localStorage.getItem('nr-my-requests') || '[]')
    localStorage.setItem('nr-my-requests', JSON.stringify([...mine, id].slice(-20)))
  } catch { /* private mode etc. */ }
}

type Pending = { key: string; song: string; artist: string }
type Queued = { key: string; id: string; position: number }

const Songs = ({ bare = false }: { bare?: boolean }) => {
  const [q, setQ] = useState('')
  const [list, setList] = useState<'master' | 'nashville'>('master')
  const [decade, setDecade] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [fanName, setFanName] = useState('')
  const [queued, setQueued] = useState<Queued | null>(null)
  const [error, setError] = useState<string | null>(null)
  useShowGate(!bare)
  const [barVisible, setBarVisible] = useState(true)
  const [typing, setTyping] = useState(false)
  const lastY = useRef(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard awareness: while any input is focused, the tip bar stays away;
  // it returns shortly after the keyboard is dismissed.
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
    const onFocusIn = (e: FocusEvent) => {
      if (isField(e.target)) {
        if (blurTimer.current) clearTimeout(blurTimer.current)
        setTyping(true)
      }
    }
    const onFocusOut = (e: FocusEvent) => {
      if (isField(e.target)) {
        if (blurTimer.current) clearTimeout(blurTimer.current)
        blurTimer.current = setTimeout(() => setTyping(false), 400)
      }
    }
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY.current + 6 && y > 120) setBarVisible(false)
      else if (y < lastY.current - 6) setBarVisible(true)
      lastY.current = y
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setBarVisible(true), 1600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [])

  useEffect(() => {
    document.title = 'Nick Rains — The Song List'
    return () => {
      document.title = 'Nick Rains'
    }
  }, [])

  const nashvilleTotal = useMemo(
    () => SONGS.filter((s) => 'nashville' in s && s.nashville).length,
    []
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return SONGS.filter((s) => {
      // A live search always spans the full master list — tabs only shape browsing
      if (needle) return `${s.title} ${s.artist}`.toLowerCase().includes(needle)
      if (list === 'nashville' && !('nashville' in s && s.nashville)) return false
      if (decade && s.decade !== decade) return false
      return true
    })
  }, [q, list, decade])

  const submit = async (song: string, artist: string, key: string) => {
    setError(null)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ song, artist, name: fanName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'queue unavailable')
      }
      const data = await res.json()
      rememberMine(data.id)
      setQueued({ key, id: data.id, position: data.position })
      setPending(null)
      setFanName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'queue unavailable')
    }
  }

  const songRow = (title: string, artist: string, decadeLabel?: string) => {
    const key = `${title}-${artist}`
    const isPending = pending?.key === key
    const isQueued = queued?.key === key
    return (
      <div key={key} className="row-line border-ink/20 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">{title}</p>
            <p className="text-sm text-ink/60 truncate">
              {artist}
              {decadeLabel && <span className="font-mono text-[10px] uppercase text-ink/40"> · {decadeLabel}</span>}
            </p>
          </div>
          {!bare && !isQueued && (
            <button
              onClick={() => {
                setPending(isPending ? null : { key, song: title, artist })
                setQueued(null)
                setError(null)
              }}
              className="btn !px-3 !py-1.5 !text-[10px] shrink-0"
            >
              {isPending ? 'Cancel' : 'Request'}
            </button>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 mt-2">
            <input
              value={fanName}
              onChange={(e) => setFanName(e.target.value)}
              placeholder="Your first name (optional)"
              className="flex-1 border-2 border-ink bg-cream/60 px-3 py-2 text-base placeholder:text-ink/40 focus:outline-none focus:border-orange"
            />
            <button onClick={() => submit(title, artist, key)} className="btn !px-3 !py-2 !text-[10px]">
              Add to queue
            </button>
          </div>
        )}

        {isQueued && queued && (
          <div className="border-2 border-dashed border-ink/40 bg-cream/60 p-3 mt-2">
            <p className="font-medium text-sm mb-2">
              You&rsquo;re <span className="font-mono font-bold">#{queued.position}</span> in the queue 🎸
            </p>
            <Link to="/queue" className="btn !px-3 !py-1.5 !text-[10px] inline-block">
              See your spot in the queue →
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grain speckle min-h-screen text-ink pb-20">
      <div className="max-w-md mx-auto px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {bare ? (
            <a href="https://nickrainsmusic.com">
              <img src="/images/logo-black.png" alt="Nick Rains" className="h-8 w-auto" />
            </a>
          ) : (
            <Link to="/links">
              <img src="/images/logo-black.png" alt="Nick Rains" className="h-8 w-auto" />
            </Link>
          )}
          {!bare && (
            <Link to="/queue" className="font-mono text-[11px] uppercase underline hover:text-orange">
              Live queue
            </Link>
          )}
        </div>
        <h1 className="display text-5xl mb-1">The song list</h1>
        <p className="font-mono text-[11px] uppercase text-ink/50 mb-5">
          {list === 'nashville' ? nashvilleTotal : SONGS.length}+ songs and counting{bare ? '' : ' · tap one to request it'}
        </p>

        {!bare && <Goals />}

        {/* Search */}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a song or artist…"
          className="w-full border-2 border-ink bg-cream/60 px-4 py-3 font-medium placeholder:text-ink/40 focus:outline-none focus:border-orange mb-3"
        />

        {/* List tabs */}
        <div className="flex gap-1 mb-2">
          {(['master', 'nashville'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setList(l)}
              className={`font-mono text-[11px] uppercase px-3 py-1.5 border transition-colors ${
                list === l ? 'bg-ink text-cream border-ink' : 'border-ink/30 hover:border-ink'
              }`}
            >
              {l === 'master' ? 'Master list' : 'Nashville list'}
            </button>
          ))}
        </div>

        {/* Decade chips */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 -mx-5 px-5">
          {DECADES.map((d) => (
            <button
              key={d}
              onClick={() => setDecade(decade === d ? null : d)}
              className={`font-mono text-[10px] uppercase px-2.5 py-1 border whitespace-nowrap transition-colors ${
                decade === d ? 'bg-orange text-cream border-orange' : 'border-ink/25 hover:border-ink'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {error && (
          <p className="font-mono text-[11px] uppercase text-orange mb-3">
            {error} —{' '}
            <a href={smsHref(`🎸 Request: ${pending?.song || ''} — ${pending?.artist || ''}`)} className="underline">
              text it instead
            </a>
          </p>
        )}

        {/* Song ledger */}
        <div>
          {filtered.map((s) => songRow(s.title, s.artist, s.decade))}

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="font-medium mb-1">Nothing matching &ldquo;{q}&rdquo;{decade ? ` in the ${decade}` : ''}.</p>
              <p className="text-sm text-ink/60 mb-4">Doesn&rsquo;t mean I can&rsquo;t play it.</p>
            </div>
          )}
        </div>

        {/* Missing-song request */}
        {!bare && (
        <div className="border-2 border-dashed border-ink/40 p-4 mt-6 text-center">
          <p className="font-medium mb-1">Don&rsquo;t see your song?</p>
          <p className="text-sm text-ink/60 mb-3">Fifteen years of learning songs on the fly — try me.</p>
          {q.trim() && !queued?.key.startsWith('custom-') ? (
            <button onClick={() => submit(q.trim(), '(not on the list)', `custom-${q.trim()}`)} className="btn btn-ghost !px-4 !py-2 !text-[11px]">
              Queue &ldquo;{q.trim().slice(0, 40)}&rdquo; anyway →
            </button>
          ) : (
            <p className="font-mono text-[11px] uppercase text-ink/40">Type it in the search box first</p>
          )}
          {queued?.key.startsWith('custom-') && (
            <div className="mt-3">
              <p className="font-medium text-sm mb-2">In the queue — #{queued.position} 🎸</p>
              <Link to="/queue" className="btn !px-3 !py-1.5 !text-[10px] inline-block">
                See your spot in the queue →
              </Link>
            </div>
          )}
        </div>
        )}

        <p className="font-mono text-[10px] uppercase text-ink/40 text-center mt-8">
          <Link to="/links" className="underline hover:text-orange">All links</Link>
          {' · '}
          <a href={`mailto:${CONTACT.email}`} className="underline hover:text-orange">{CONTACT.email}</a>
        </p>
      </div>

      {!bare && <TipNudge />}

      {/* Floating tip bar — compact, ink-dark (never competes with the
          orange REQUEST buttons), inset from the edges, safe-area aware */}
      {!bare && <div
        className={`fixed inset-x-3 z-40 max-w-md mx-auto transition-transform duration-[420ms] ${
          barVisible && !typing ? 'translate-x-0' : '-translate-x-[115%]'
        }`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <a
          href={withDevice(LINKS.tipJar)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => markTipped()}
          className="flex items-center justify-between bg-ink text-cream px-4 py-2.5 shadow-[0_4px_16px_rgba(40,40,37,0.4)]"
        >
          <span className="text-sm font-medium">Enjoying the show?</span>
          <span className="font-mono text-[11px] font-bold uppercase text-orange whitespace-nowrap">
            Tip the jar →
          </span>
        </a>
      </div>}
    </div>
  )
}

export default Songs
