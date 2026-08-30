import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// Quantity selector — sits between the Tix button on the show page and Stripe.
// URL: live.nickrainsmusic.com/tickets?show=knoxville/090526

interface Availability {
  remaining: number | null
  soldOut: boolean
  presaleActive: boolean
  priceCents: number
  priceLabel: string
}

export default function Tickets() {
  const [params] = useSearchParams()
  const showId = params.get('show') || ''

  const [avail, setAvail]   = useState<Availability | null>(null)
  const [qty, setQty]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [going, setGoing]   = useState(false)

  useEffect(() => {
    document.body.style.background = '#0d0e09'
    return () => { document.body.style.background = '' }
  }, [])

  useEffect(() => {
    if (!showId) { setLoading(false); return }
    fetch(`/api/availability?show=${encodeURIComponent(showId)}`)
      .then(r => r.json())
      .then((d: Availability) => { setAvail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [showId])

  const max      = avail?.remaining ?? 999
  const price    = avail?.priceCents ?? 0
  const label    = avail?.priceLabel ?? ''
  const total    = (price * qty / 100).toFixed(2)
  const soldOut  = avail?.soldOut ?? false

  const handleBuy = () => {
    if (!showId || going) return
    setGoing(true)
    window.location.href = `/api/checkout?show=${encodeURIComponent(showId)}&qty=${qty}`
  }

  return (
    <div className="h-dvh flex flex-col bg-[#0d0e09] text-paper px-4 pt-5 pb-6">

      {/* Wordmark */}
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange mb-6 shrink-0">● Nick Rains</p>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center gap-8">

        {loading && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 text-center animate-pulse">
            Loading…
          </p>
        )}

        {!loading && !showId && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 text-center">
            No show selected.
          </p>
        )}

        {!loading && showId && (
          <>
            {/* Header */}
            <div>
              <h1 className="display text-5xl text-paper leading-none mb-2">Get tickets</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
                {label} per ticket{avail?.presaleActive ? ' · Presale price' : ' · Door price'}
              </p>
            </div>

            {soldOut ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
                <p className="display text-2xl text-paper/50">Sold Out</p>
              </div>
            ) : (
              <>
                {/* Quantity stepper */}
                <div className="flex flex-col gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40">How many?</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="w-14 h-14 rounded-full border border-white/15 bg-white/5 display text-3xl text-paper hover:bg-white/10 transition-colors disabled:opacity-25"
                    >
                      −
                    </button>
                    <span className="display text-6xl text-paper flex-1 text-center">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(max, q + 1))}
                      disabled={qty >= max}
                      className="w-14 h-14 rounded-full border border-white/15 bg-white/5 display text-3xl text-paper hover:bg-white/10 transition-colors disabled:opacity-25"
                    >
                      +
                    </button>
                  </div>
                  {avail?.remaining != null && avail.remaining <= 10 && (
                    <p className="font-mono text-[10px] uppercase tracking-widest text-orange/70 text-center">
                      {avail.remaining} left
                    </p>
                  )}
                </div>

                {/* Total + buy */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-paper/40">Total</span>
                    <span className="display text-3xl text-paper">${total}</span>
                  </div>
                  <button
                    onClick={handleBuy}
                    disabled={going}
                    className="w-full rounded-2xl bg-orange py-4 display text-2xl text-paper hover:bg-orange/90 transition-colors disabled:opacity-50"
                  >
                    {going ? 'Redirecting…' : `Buy ${qty} ticket${qty > 1 ? 's' : ''}`}
                  </button>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-paper/25 text-center">
                    Secured by Stripe · QR ticket emailed instantly
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
