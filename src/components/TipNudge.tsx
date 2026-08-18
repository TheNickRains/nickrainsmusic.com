import { useEffect, useState } from 'react'
import { LINKS } from '../data'
import { deviceId, withDevice } from '../device'

// Idle tip prompt: after ~75s of no touch/scroll/typing, if this device
// hasn't tipped this show, one polite modal. Hard limits: never while an
// input is focused, never twice within 3h, never after a tip this show.

const TIPPED_KEY = 'nr-tipped-at'
const PROMPTED_KEY = 'nr-tip-prompted-at'
const IDLE_MS = 18_000      // must beat iOS pre-lock dimming (~22s on a 30s auto-lock)
const RETURN_MS = 3_000     // returning to the page = attention limbo, fire fast
// A bare click only pauses the nudge briefly (they may be mid-checkout);
// the 6h exemption comes from the server once the payment actually lands.
const CLICK_GRACE = 10 * 60_000
// Each ×-dismissal doubles the wait: 5 → 10 → 20 → 40 → 80 min.
// Sized for a 4-hour gig: a non-tipper hears from us ~5 times, spread out.
const BACKOFF_MS = [5, 10, 20, 40, 80].map((m) => m * 60_000)
const DISMISS_KEY = 'nr-tip-dismissals'

const dismissCount = () => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0)
  } catch {
    return 0
  }
}

export const markTipped = () => {
  try {
    localStorage.setItem(TIPPED_KEY, String(Date.now()))
  } catch { /* private mode */ }
}

const recent = (key: string, windowMs: number) => {
  try {
    return Date.now() - Number(localStorage.getItem(key) || 0) < windowMs
  } catch {
    return false
  }
}

const TipNudge = () => {
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const close = (dismissed: boolean) => {
    if (dismissed) {
      try {
        localStorage.setItem(DISMISS_KEY, String(dismissCount() + 1))
      } catch { /* ok */ }
    }
    setLeaving(true)
    setTimeout(() => {
      setOpen(false)
      setLeaving(false)
    }, 240)
  }

  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`/api/tipped?device=${deviceId()}`)
      .then((r) => r.json())
      .then((d) => setVerified(Boolean(d.tipped)))
      .catch(() => setVerified(false))
  }, [])

  useEffect(() => {
    if (verified !== false) return // unknown yet, or genuinely tipped — no nudge
    const backoff = BACKOFF_MS[Math.min(dismissCount(), BACKOFF_MS.length - 1)]
    if (recent(TIPPED_KEY, CLICK_GRACE) || recent(PROMPTED_KEY, backoff)) return

    let timer: ReturnType<typeof setTimeout>
    const fire = () => {
      const el = document.activeElement
      const typing = el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      if (typing || document.visibilityState !== 'visible') {
        reset()
        return
      }
      try {
        localStorage.setItem(PROMPTED_KEY, String(Date.now()))
      } catch { /* ok */ }
      setOpen(true)
    }
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(fire, IDLE_MS)
    }
    // When they unlock/return to the page, there's a beat of idle attention
    // before they re-engage — fire quickly there (any touch cancels it).
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        timer = setTimeout(fire, RETURN_MS)
      }
    }
    const events = ['scroll', 'touchstart', 'pointerdown', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [verified])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 ${leaving ? 'sheet-leaving' : ''}`}>
      <div className="sheet-backdrop absolute inset-0 bg-ink/50" onClick={() => close(true)} />
      <div
        className="sheet-card absolute inset-x-3 max-w-md mx-auto speckle border-2 border-ink rounded-2xl p-5 text-ink shadow-[0_8px_32px_rgba(40,40,37,0.45)]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="w-10 h-1 rounded-full bg-ink/20 mx-auto mb-3" />
        <button
          onClick={() => close(true)}
          aria-label="Close"
          className="absolute top-3 right-4 font-mono text-xl leading-none text-ink/50 hover:text-ink"
        >
          ×
        </button>
        <p className="display text-3xl mb-2">Enjoying the show?</p>
        <p className="text-sm mb-4">
          Please consider tipping the band — we can only do what we do thanks to
          support from people like you.
        </p>
        <a
          href={withDevice(LINKS.tipJar)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            markTipped()
            try { localStorage.setItem(DISMISS_KEY, '0') } catch { /* ok */ }
            close(false)
          }}
          className="btn block w-full text-center !py-3.5 !text-[11px] rounded-xl"
        >
          Leave a Tip
        </a>
      </div>
    </div>
  )
}

export default TipNudge
