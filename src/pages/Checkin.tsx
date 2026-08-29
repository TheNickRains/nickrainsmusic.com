import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import jsQR from 'jsqr'

// Door scanner — /checkin?key=<ADMIN_KEY>. Phone at the door, rear camera
// reads the QR from the buyer's confirmation email, POST /api/checkin flips
// the ticket to used. The whole screen flashes green (in) or red (already
// scanned / invalid), then re-arms for the next person after 2 seconds.

interface ScanResult {
  status: 'valid' | 'used' | 'invalid' | 'offline' | 'forbidden'
  show?: string
  buyerName?: string
  usedAt?: number | null
  checkedIn?: number
}

const RESULT_MS = 2000 // how long a verdict stays on screen
const REPEAT_MS = 5000 // ignore the same code re-read within this window

const CORNERS = [
  'top-3 left-3 border-t-2 border-l-2',
  'top-3 right-3 border-t-2 border-r-2',
  'bottom-3 left-3 border-b-2 border-l-2',
  'bottom-3 right-3 border-b-2 border-r-2',
]

export default function Checkin() {
  const [params] = useSearchParams()
  const adminKey = params.get('key')

  const videoRef = useRef<HTMLVideoElement>(null)
  const busyRef = useRef(false) // a verdict is on screen — pause scanning
  const lastRef = useRef<{ id: string; at: number } | null>(null)

  const [cam, setCam] = useState<'starting' | 'on' | 'error'>('starting')
  const [camTry, setCamTry] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [tally, setTally] = useState<number | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    document.title = 'Nick Rains — Check-in'
    return () => {
      document.title = 'Nick Rains'
    }
  }, [])

  // Rear camera on; tracks stopped on unmount (StrictMode-safe)
  useEffect(() => {
    if (!adminKey) return
    let cancelled = false
    let stream: MediaStream | null = null
    setCam('starting')
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }
        if (!cancelled) setCam('on')
      } catch {
        if (!cancelled) setCam('error')
      }
    })()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [adminKey, camTry])

  // Keep the door phone awake between arrivals (same pattern as the queue)
  useEffect(() => {
    if (!adminKey) return
    let lock: { release: () => Promise<void> } | null = null
    const acquire = async () => {
      try {
        const wl = (navigator as Navigator & {
          wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> }
        }).wakeLock
        if (wl) lock = await wl.request('screen')
      } catch {
        /* battery saver etc. */
      }
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
  }, [adminKey])

  const handleScan = useCallback(
    async (ticketId: string) => {
      if (!ticketId || busyRef.current) return
      const prev = lastRef.current
      if (prev && prev.id === ticketId && Date.now() - prev.at < REPEAT_MS) return
      busyRef.current = true
      lastRef.current = { id: ticketId, at: Date.now() }

      let verdict: ScanResult
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey, ticketId }),
        })
        if (res.status === 403) verdict = { status: 'forbidden' }
        else verdict = (await res.json()) as ScanResult
      } catch {
        verdict = { status: 'offline' }
      }

      if (verdict.checkedIn != null) setTally(verdict.checkedIn)
      navigator.vibrate?.(verdict.status === 'valid' ? 80 : [120, 60, 120])
      setResult(verdict)
      setTimeout(() => {
        setResult(null)
        busyRef.current = false
      }, RESULT_MS)
    },
    [adminKey]
  )

  // Scan loop — ~7 fps through a downscaled canvas keeps jsQR cheap
  useEffect(() => {
    if (cam !== 'on') return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (busyRef.current || t - last < 150) return
      last = t
      const v = videoRef.current
      if (!v || v.readyState < 2 || !v.videoWidth) return
      const scale = Math.min(1, 480 / v.videoWidth)
      canvas.width = Math.round(v.videoWidth * scale)
      canvas.height = Math.round(v.videoHeight * scale)
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) handleScan(code.data.trim())
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cam, handleScan])

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-[#0d0e09] flex items-center justify-center px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-paper/40 text-center">
          Door scanner · needs ?key=&lt;admin key&gt;
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0e09] text-paper flex flex-col items-center px-6 py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange mb-2">
        ● Door scanner
      </p>
      <h1 className="display text-5xl text-paper mb-2">Check-in</h1>
      <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 mb-8">
        {tally != null ? `${tally} checked in tonight` : 'Point at the ticket QR'}
      </p>

      {/* Viewfinder */}
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
        {CORNERS.map((pos) => (
          <div key={pos} className={`absolute w-7 h-7 border-orange/80 ${pos}`} />
        ))}
        {cam === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper/50">
              Starting camera…
            </p>
          </div>
        )}
        {cam === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center bg-[#0d0e09]/80">
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper/60 leading-relaxed">
              Camera blocked — allow camera access for this site, then retry
            </p>
            <button onClick={() => setCamTry((n) => n + 1)} className="btn !px-4 !py-2 !text-[10px]">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Break-glass path: printed email, cracked screen, QR API down */}
      <div className="w-full max-w-sm mt-6">
        {manualOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const code = manualCode.trim()
              if (!code) return
              setManualCode('')
              handleScan(code)
            }}
            className="flex gap-2"
          >
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ticket code from the email…"
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/15 px-3 py-2 font-mono text-[16px] text-paper placeholder:text-paper/30 focus:outline-none focus:border-orange"
            />
            <button type="submit" className="btn !px-4 !py-2 !text-[10px]">
              Check
            </button>
          </form>
        ) : (
          <button
            onClick={() => setManualOpen(true)}
            className="block mx-auto font-mono text-[10px] uppercase tracking-widest text-paper/35 underline hover:text-orange"
          >
            QR won&rsquo;t scan? Enter the code
          </button>
        )}
      </div>

      {result && <Verdict result={result} />}
    </div>
  )
}

// Full-screen verdict flash — green in, red back
function Verdict({ result }: { result: ScanResult }) {
  const bg =
    result.status === 'valid'
      ? '#15803d'
      : result.status === 'used' || result.status === 'invalid'
        ? '#b91c1c'
        : '#292524' // offline / forbidden — neutral dark
  const headline =
    result.status === 'valid'
      ? 'IN'
      : result.status === 'used'
        ? 'ALREADY SCANNED'
        : result.status === 'invalid'
          ? 'INVALID'
          : result.status === 'forbidden'
            ? 'BAD KEY'
            : 'OFFLINE'
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center"
      style={{ background: bg }}
    >
      <p
        className="display text-white leading-none"
        style={{ fontSize: result.status === 'valid' ? '9rem' : '3.2rem' }}
      >
        {headline}
      </p>
      {result.buyerName && (
        <p className="font-display text-2xl text-white/95 mt-5">{result.buyerName}</p>
      )}
      {result.show && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/70 mt-2">
          {result.show}
        </p>
      )}
      {result.status === 'used' && result.usedAt != null && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/85 mt-2">
          Scanned at{' '}
          {new Date(result.usedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
      {result.status === 'valid' && result.checkedIn != null && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/70 mt-2">
          {result.checkedIn} checked in
        </p>
      )}
      {result.status === 'offline' && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/70 mt-2">
          No signal — try again
        </p>
      )}
    </div>
  )
}
