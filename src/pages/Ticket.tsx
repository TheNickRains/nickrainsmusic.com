import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'

interface ShowInfo {
  city: string; venue: string; address: string
  date: string; time: string; showAt: string
}
interface TicketData {
  tickets: { id: string }[]
  buyerName: string
  show: ShowInfo | null
}

// ─── Canvas ticket generator ──────────────────────────────────────────────────
// Draws a ticket that matches the page design. Returns a PNG blob.
async function renderTicketBlob(ticketId: string, data: TicketData): Promise<Blob> {
  // Wait for fonts to be ready (Anton, Space Mono)
  await document.fonts.ready

  const DPR = 2
  const W = 390, BANNER = 40, DETAIL = 150, PADDING = 20
  const QR_W = W - PADDING * 2
  const H = BANNER + QR_W + DETAIL + PADDING * 2 + 32 // header + qr + details + margins

  const canvas = document.createElement('canvas')
  canvas.width  = W   * DPR
  canvas.height = H   * DPR
  const ctx = canvas.getContext('2d')!
  ctx.scale(DPR, DPR)

  const show = data.show

  // ── Background ──
  ctx.fillStyle = '#0d0e09'
  ctx.fillRect(0, 0, W, H)

  // ── Card clip ──
  const cx = PADDING, cy = PADDING, cw = W - PADDING * 2, ch = H - PADDING * 2
  roundRectPath(ctx, cx, cy, cw, ch, 14)
  ctx.save(); ctx.clip()

  // ── Orange banner ──
  ctx.fillStyle = '#c65a1e'
  ctx.fillRect(cx, cy, cw, BANNER)
  ctx.fillStyle = '#f2ede4'
  ctx.font = `bold 9px "Space Mono", monospace`
  ctx.letterSpacing = '2px'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText('YOUR TICKET', cx + 14, cy + BANNER / 2)
  ctx.textAlign = 'right'
  ctx.fillText('SHOW AT THE DOOR', cx + cw - 14, cy + BANNER / 2)
  ctx.letterSpacing = '0px'

  // ── QR on paper ──
  const qrY = cy + BANNER
  ctx.fillStyle = '#f2ede4'
  ctx.fillRect(cx, qrY, cw, cw)

  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, ticketId, {
    width: cw * DPR,
    margin: 3,
    color: { dark: '#282825', light: '#f2ede4' },
  })
  ctx.drawImage(qrCanvas, cx, qrY, cw, cw)

  // ── Details strip ──
  const detY = qrY + cw
  ctx.fillStyle = '#111208'
  ctx.fillRect(cx, detY, cw, DETAIL)

  // Name — 40px Anton gives clear space before venue row
  ctx.fillStyle = '#f2ede4'
  ctx.font = `40px Anton, "Arial Narrow", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const name = data.buyerName || ''
  ctx.fillText(name, cx + 14, detY + 14, cw - 28)

  // Venue · City
  ctx.fillStyle = '#f2ede4aa'
  ctx.font = `9px "Space Mono", monospace`
  ctx.letterSpacing = '1px'
  ctx.textBaseline = 'top'
  const venueLine = show ? `${show.venue} · ${show.city.split(',')[0]}` : ''
  ctx.fillText(venueLine.toUpperCase(), cx + 14, detY + 72)

  // Date
  ctx.fillStyle = '#f2ede4cc'
  ctx.font = `9px "Space Mono", monospace`
  ctx.fillText(show ? show.date.toUpperCase() : '', cx + 14, detY + 88)

  // Time
  ctx.fillStyle = '#f2ede480'
  ctx.fillText(show ? show.time.toUpperCase() : '', cx + 14, detY + 104)

  // Valid once — own row at bottom, right-aligned
  ctx.fillStyle = '#c65a1e99'
  ctx.font = `7px "Space Mono", monospace`
  ctx.letterSpacing = '2px'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('GOOD FOR ONE SCAN', cx + cw - 14, detY + 122)
  ctx.letterSpacing = '0px'

  // ── Restore clip ──
  ctx.restore()

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── Share / Save ─────────────────────────────────────────────────────────────
async function saveTicket(ticketId: string, data: TicketData, label: string) {
  const blob = await renderTicketBlob(ticketId, data)
  const file = new File([blob], label, { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Nick Rains — Your Ticket' })
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = label
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

// ─── ICS ─────────────────────────────────────────────────────────────────────
function downloadIcs(show: ShowInfo) {
  const dt = show.showAt.slice(0, 10).replace(/-/g, '')
  const uid = `nick-rains-${dt}-${crypto.randomUUID()}@nickrainsmusic.com`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nick Rains//Ticket//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;TZID=America/Chicago:${dt}T190000`,
    `DTEND;TZID=America/Chicago:${dt}T210000`,
    `SUMMARY:Nick Rains — Live in ${show.city.split(',')[0]}`,
    `LOCATION:${show.venue}, ${show.address}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P1D',
    `DESCRIPTION:Nick Rains tonight — ${show.venue}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = 'nick-rains-show.ics'
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Ticket() {
  const [params] = useSearchParams()
  const sessionId = params.get('session') || ''
  const ticketId  = params.get('id')      || ''

  const [data, setData]       = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [idx, setIdx]         = useState(0)

  useEffect(() => {
    document.body.style.background = '#0d0e09'
    return () => { document.body.style.background = '' }
  }, [])

  useEffect(() => {
    if (!sessionId && !ticketId) { setLoading(false); return }
    let cancelled = false, attempts = 0
    const query = ticketId
      ? `id=${encodeURIComponent(ticketId)}`
      : `session=${encodeURIComponent(sessionId)}`
    const poll = async () => {
      try {
        const json = await fetch(`/api/ticket?${query}`).then(r => r.json()) as TicketData
        if (cancelled) return
        if (json.tickets?.length) { setData(json); setLoading(false) }
        else if (attempts < 12)   { attempts++; setTimeout(poll, 1000) }
        else                       { setLoading(false) }
      } catch { if (!cancelled) setLoading(false) }
    }
    poll()
    return () => { cancelled = true }
  }, [sessionId, ticketId])

  const t     = data?.tickets[idx]
  const show  = data?.show ?? null
  const multi = (data?.tickets.length ?? 0) > 1
  const isIos = /iphone|ipad/i.test(navigator.userAgent)

  const handleSave = async () => {
    if (!t || !data) return
    setSaving(true)
    try {
      await saveTicket(t.id, data, `nick-rains-ticket${multi ? `-${idx + 1}` : ''}.png`)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-[#0d0e09] text-paper px-4 pt-5 pb-4">

      {/* Wordmark + pagination */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange">● Nick Rains</p>
        {multi && (
          <div className="flex gap-1">
            {data!.tickets.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-orange' : 'bg-white/20'}`} />
            ))}
          </div>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 animate-pulse">Confirming…</p>
        </div>
      )}

      {!loading && !data && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="display text-3xl text-paper">Check your email</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 leading-relaxed">
            Your QR ticket is on its way.<br />It may take a minute to arrive.
          </p>
        </div>
      )}

      {!loading && t && (
        <>
          {/* Ticket card */}
          <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden border border-orange/40 shadow-2xl">

            {/* Orange banner */}
            <div className="bg-orange px-4 py-2 flex items-center justify-between shrink-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper font-bold">
                {multi ? `Ticket ${idx + 1} of ${data!.tickets.length}` : 'Your ticket'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-paper/80">Show at the door</span>
            </div>

            {/* QR */}
            <div className="flex-1 min-h-0 bg-paper flex items-center justify-center overflow-hidden">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=800x800&qzone=3&color=282825&bgcolor=f2ede4&data=${encodeURIComponent(t.id)}`}
                alt="Ticket QR code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Details strip */}
            <div className="bg-[#111208] px-4 py-3 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {data!.buyerName && (
                    <p className="display text-xl text-paper leading-tight truncate">{data!.buyerName}</p>
                  )}
                  {show && (
                    <p className="font-mono text-[10px] text-paper/50 mt-0.5">
                      {show.venue} · {show.city.split(',')[0]}
                    </p>
                  )}
                  {show && (
                    <p className="font-mono text-[10px] text-paper/70 mt-0.5">
                      {show.date} · {show.time}
                    </p>
                  )}
                </div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-orange/60 text-right shrink-0 mt-0.5 leading-snug">
                  Good for<br />one scan
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3 shrink-0">
            {show && (
              <button onClick={() => downloadIcs(show)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 font-mono text-[9px] uppercase tracking-widest text-paper hover:bg-white/10 transition-colors">
                + Calendar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl border border-orange/40 bg-orange/10 py-2.5 font-mono text-[9px] uppercase tracking-widest text-paper hover:bg-orange/20 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : saved ? 'Saved' : isIos ? 'Save to Photos' : 'Download'}
            </button>
          </div>

          {/* Don't-share notice */}
          <p className="font-mono text-[8px] text-paper/25 text-center leading-relaxed mt-2 shrink-0">
            This ticket's yours alone — keep the link to yourself, and I'll see you there.
          </p>
        </>
      )}
    </div>
  )
}
