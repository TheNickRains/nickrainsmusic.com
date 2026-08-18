import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LINKS } from '../data'
import Goals, { GoalBar, type Goal } from '../components/Goals'
import SONGS from '../songs.json'
import { useShowGate } from '../hooks/useShowGate'
import TipNudge, { markTipped } from '../components/TipNudge'
import { withDevice } from '../device'

// title+artist -> Ultimate Guitar chart URL (admin convenience on stage)
const CHARTS = new Map(
  (SONGS as { title: string; artist: string; chart?: string }[])
    .filter((s) => s.chart)
    .map((s) => [`${s.title} — ${s.artist}`.toLowerCase(), s.chart as string])
)

// Live request queue. Public for the crowd; with ?key=<ADMIN_KEY> Nick gets
// PLAYED buttons — phone on the mic stand, glance between songs.

interface Row {
  id: string
  song: string
  artist: string
  name: string
  paid: number
  amount_cents: number
  created_at: number
}

const boostHref = (requestId: string) =>
  withDevice(`${LINKS.songRequestLink || LINKS.tipJar}?client_reference_id=${requestId}`)

const myRequestIds = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem('nr-my-requests') || '[]'))
  } catch {
    return new Set()
  }
}

// Short two-note chime, no audio asset needed
const chime = () => {
  try {
    const ctx = new AudioContext()
    ;[660, 880].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.frequency.value = f
      g.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.15)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.25)
      o.start(ctx.currentTime + i * 0.15)
      o.stop(ctx.currentTime + i * 0.15 + 0.3)
    })
  } catch { /* no audio */ }
}

const stageAlert = (title: string, body: string) => {
  chime()
  navigator.vibrate?.([120, 60, 120])
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon-192.png' })
    } catch { /* iOS foreground quirks — chime already fired */ }
  }
}

// Web notifications only work when installed to the home screen (standalone).
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true)

const Queue = () => {
  const [params] = useSearchParams()
  const adminKey = params.get('key')
  const [mine] = useState<Set<string>>(myRequestIds)
  useShowGate(!adminKey)
  const [endArmed, setEndArmed] = useState(false)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [alertsOn, setAlertsOn] = useState(() => {
    try {
      return (
        localStorage.getItem('nr-alerts') === '1' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      )
    } catch {
      return false
    }
  })

  const toggleAlerts = async () => {
    if (alertsOn) {
      setAlertsOn(false)
      try { localStorage.setItem('nr-alerts', '0') } catch { /* ok */ }
      return
    }
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setAlertsOn(true)
      try { localStorage.setItem('nr-alerts', '1') } catch { /* ok */ }
      stageAlert('Alerts on', 'New requests, #1 changes & goal unlocks will chime.')
    }
  }
  const seenIds = useRef<Set<string> | null>(null)
  const topId = useRef<string | null>(null)
  const unlockedIds = useRef<Set<string> | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [playedTonight, setPlayedTonight] = useState(0)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/queue')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const queue: Row[] = data.queue

      if (alertsOn) {
        // New requests
        if (seenIds.current) {
          for (const r of queue) {
            if (!seenIds.current.has(r.id)) {
              stageAlert('New request', `${r.song} — ${r.artist}${r.name ? ` (for ${r.name})` : ''}`)
            }
          }
        }
        seenIds.current = new Set(queue.map((r) => r.id))

        // New #1
        const top = queue[0]
        if (top && topId.current && top.id !== topId.current) {
          stageAlert(
            top.paid ? `Boosted to #1 — $${(top.amount_cents / 100).toFixed(0)}` : 'New #1 in the queue',
            `${top.song} — ${top.artist}`
          )
        }
        topId.current = top ? top.id : null

        // Goal unlocks
        const gres = await fetch('/api/goals')
        if (gres.ok) {
          const goals: Goal[] = (await gres.json()).goals
          if (unlockedIds.current) {
            for (const g of goals) {
              if (g.unlocked === 1 && !unlockedIds.current.has(g.id)) {
                stageAlert('🎸 GOAL UNLOCKED', `${g.song} — $${(g.goal_cents / 100).toFixed(0)} funded. Play it!`)
              }
            }
          }
          unlockedIds.current = new Set(goals.filter((g) => g.unlocked === 1).map((g) => g.id))
          if (adminKey) setAdminGoals(goals)
        }
      }

      setRows(queue)
      setPlayedTonight(data.playedTonight)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, [adminKey, alertsOn])

  // Keep the stage phone awake while alerts are on (mic-stand mode)
  useEffect(() => {
    if (!alertsOn) return
    let lock: { release: () => Promise<void> } | null = null
    const acquire = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock
        if (wl) lock = await wl.request('screen')
      } catch { /* battery saver etc. */ }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [alertsOn])

  useEffect(() => {
    document.title = 'Nick Rains — Live Queue'
    load()
    const t = setInterval(load, 8000)
    return () => {
      clearInterval(t)
      document.title = 'Nick Rains — Official EPK'
    }
  }, [load])

  // --- Goal admin (only used when ?key= is present) ---
  const [adminGoals, setAdminGoals] = useState<Goal[] | null>(null)
  const [goalSong, setGoalSong] = useState('')
  const [goalPrice, setGoalPrice] = useState('100')
  const [dropOpen, setDropOpen] = useState(false)

  const matches = goalSong.trim().length >= 2 && dropOpen
    ? SONGS.filter((s) =>
        `${s.title} ${s.artist}`.toLowerCase().includes(goalSong.trim().toLowerCase())
      ).slice(0, 8)
    : []

  const loadAdminGoals = useCallback(async () => {
    if (!adminKey) return
    try {
      const res = await fetch('/api/goals')
      if (res.ok) setAdminGoals((await res.json()).goals)
    } catch { /* ignore */ }
  }, [adminKey])

  useEffect(() => { loadAdminGoals() }, [loadAdminGoals])

  const goalAction = async (action: string, extra: Record<string, unknown> = {}) => {
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: adminKey, action, ...extra }),
    }).catch(() => {})
    loadAdminGoals()
  }

  const addGoal = () => {
    // dropdown fills "Title – Artist"
    const [song, artist = ''] = goalSong.split(/ [–—] /)
    if (!song.trim()) return
    goalAction('create', { song: song.trim(), artist: artist.trim(), goalDollars: Number(goalPrice) || 100 })
    setGoalSong('')
  }

  const markPlayed = async (id: string) => {
    setRows((r) => (r ? r.filter((x) => x.id !== id) : r))
    await fetch('/api/played', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, key: adminKey }),
    }).catch(() => {})
    load()
  }

  return (
    <div className="grain speckle min-h-screen text-ink">
      <div className="max-w-md mx-auto px-5 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <Link to="/songs">
            <img src="/images/logo-black.png" alt="Nick Rains" className="h-8 w-auto" />
          </Link>
          <Link to="/songs" className="font-mono text-[11px] uppercase underline hover:text-orange">
            Request a song
          </Link>
        </div>

        <div className="flex items-end justify-between gap-3 mb-1">
          <h1 className="display text-5xl">The queue</h1>
          {isStandalone() && (
            <button
              onClick={toggleAlerts}
              aria-pressed={alertsOn}
              className="flex items-center gap-1.5 pb-1.5"
            >
              <span className="font-mono text-[10px] uppercase text-ink/50">Alerts</span>
              <span
                className={`relative inline-block w-9 h-5 border-2 transition-colors ${
                  alertsOn ? 'bg-orange border-orange' : 'border-ink/40'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 transition-all ${
                    alertsOn ? 'right-0.5 bg-cream' : 'left-0.5 bg-ink/40'
                  }`}
                />
              </span>
            </button>
          )}
        </div>
        <p className="font-mono text-[11px] uppercase text-ink/50 mb-6">
          Live · updates itself · {playedTonight} played tonight
        </p>

        {!adminKey && <Goals pollMs={8000} />}

        {adminKey && (
          <div className="mb-4">
            {endedAt && Date.now() - endedAt < 8000 ? (
              <p className="font-mono text-[11px] uppercase text-center border-2 border-ink/30 py-3">
                🎬 Show ended — phones swept, queue &amp; goals cleared
              </p>
            ) : !endArmed ? (
              <button
                onClick={() => {
                  setEndArmed(true)
                  setTimeout(() => setEndArmed(false), 6000)
                }}
                className="btn btn-ghost block w-full text-center !py-3 !text-[11px]"
              >
                🎬 End the show…
              </button>
            ) : (
              <button
                onClick={async () => {
                  setEndArmed(false)
                  await fetch('/api/show', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ key: adminKey, action: 'end-show' }),
                  }).catch(() => {})
                  setEndedAt(Date.now())
                  load()
                  loadAdminGoals()
                }}
                className="btn block w-full text-center !py-3 !text-[11px]"
              >
                Tap again to confirm — sweeps open phones to the fan list, clears queue &amp; goals
              </button>
            )}
          </div>
        )}

        {adminKey && (
          <div className="border-2 border-ink p-3 mb-6">
            <p className="font-mono text-[11px] font-bold uppercase mb-2">Tonight's goal songs — pick for this room</p>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1 min-w-0">
                <input
                  value={goalSong}
                  onChange={(e) => { setGoalSong(e.target.value); setDropOpen(true) }}
                  onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                  placeholder="Search your song list…"
                  className="w-full border-2 border-ink bg-cream/60 px-2 py-1.5 placeholder:text-ink/40 focus:outline-none focus:border-orange"
                />
                {matches.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-paper border-2 border-ink border-t-0 max-h-56 overflow-y-auto">
                    {matches.map((m) => (
                      <button
                        key={`${m.title}-${m.artist}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setGoalSong(`${m.title} – ${m.artist}`)
                          setDropOpen(false)
                        }}
                        className="block w-full text-left px-2 py-2 text-sm border-b border-ink/15 last:border-b-0 hover:bg-cream active:bg-cream"
                      >
                        <span className="font-semibold">{m.title}</span>
                        <span className="text-ink/60"> – {m.artist}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                value={goalPrice}
                onChange={(e) => setGoalPrice(e.target.value)}
                inputMode="numeric"
                className="w-16 border-2 border-ink bg-cream/60 px-2 py-1.5 text-center focus:outline-none focus:border-orange"
              />
              <button onClick={addGoal} className="btn !px-3 !py-1.5 !text-[10px]">Add</button>
            </div>
            {adminGoals && adminGoals.map((g) => (
              <div key={g.id} className="mb-2">
                <GoalBar goal={g} />
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[10px] uppercase text-ink/40">Seed:</span>
                  {[5, 20, 50].map((d) => (
                    <button
                      key={d}
                      onClick={() => goalAction('seed', { id: g.id, dollars: d })}
                      className="font-mono text-[10px] uppercase px-2 py-0.5 border border-ink/30 hover:border-orange hover:text-orange"
                    >
                      +${d}
                    </button>
                  ))}
                  <button onClick={() => goalAction('delete', { id: g.id })} className="font-mono text-[10px] uppercase underline hover:text-orange ml-auto">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {adminGoals && adminGoals.length > 0 && (
              <button
                onClick={() => goalAction('clear')}
                className="btn btn-ghost !px-3 !py-1.5 !text-[10px] w-full mt-1"
              >
                Clear all goals
              </button>
            )}
          </div>
        )}

        {offline && (
          <p className="border-2 border-dashed border-ink/40 p-4 text-sm text-ink/60 text-center">
            Queue&rsquo;s warming up — if this persists, holler your request the old way.
          </p>
        )}

        {rows && rows.length === 0 && !offline && (
          <div className="text-center py-10">
            <p className="font-medium mb-2">Nothing in the queue yet.</p>
            <Link to="/songs" className="btn !text-[11px]">Be the first — request a song</Link>
          </div>
        )}

        {rows && rows.map((r, i) => (
          <div
            key={r.id}
            className={`row-line border-ink/20 flex items-center gap-3 py-3 ${
              mine.has(r.id) ? 'border-l-4 border-l-orange pl-2 -ml-2 bg-cream/50' : ''
            }`}
          >
            <span className="font-mono text-sm text-ink/40 w-6 shrink-0">{i + 1}</span>
            <div className="min-w-0 flex-1">
              {adminKey && CHARTS.get(`${r.song} — ${r.artist}`.toLowerCase()) ? (
                <a
                  href={CHARTS.get(`${r.song} — ${r.artist}`.toLowerCase())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold leading-tight truncate block underline decoration-orange decoration-2 underline-offset-2"
                >
                  {r.song}
                </a>
              ) : (
                <p className="font-semibold leading-tight truncate">{r.song}</p>
              )}
              <p className="text-sm text-ink/60 truncate">
                {r.artist}
                {r.name && <span className="font-mono text-[10px] uppercase text-ink/40"> · for {r.name}</span>}
              </p>
            </div>
            {r.paid === 1 && (
              <span className="font-mono text-[10px] font-bold uppercase bg-orange text-cream px-2 py-1 shrink-0">
                ${(r.amount_cents / 100).toFixed(0)} boost
              </span>
            )}
            {mine.has(r.id) && r.paid === 0 && !adminKey && (
              <a
                href={boostHref(r.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markTipped()}
                className="btn !px-2.5 !py-1 !text-[10px] shrink-0"
              >
                Boost →
              </a>
            )}
            {adminKey && (
              <button
                onClick={() => markPlayed(r.id)}
                className="btn btn-ghost !px-2.5 !py-1 !text-[10px] shrink-0"
              >
                Played
              </button>
            )}
          </div>
        ))}

        {!adminKey && <TipNudge />}

        <p className="font-mono text-[10px] uppercase text-ink/40 text-center mt-10">
          Boosts float to the top ·{' '}
          <a href={LINKS.tipJar} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">
            tip jar
          </a>
        </p>
      </div>
    </div>
  )
}

export default Queue
