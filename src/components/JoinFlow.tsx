import { useEffect, useRef, useState } from 'react'
import { deviceId } from '../device'
import { LINKS } from '../data'

// The Club funnel — conversational stepper matching Nick's Tally flow,
// with EXPLICIT opt-ins (the yes/no answer is the data, mirroring the
// Sheets columns "Phone Opt-In" and "GEO Opt-In"):
//   1. Name + email                                   → Let's Go
//   2. "Can I text you about shows & new music?"      → Yes, text me / No thanks
//   3. "Want to know about shows in your hometown?"   → ZIP + I'm In / No thanks
// Success CTA: tell a friend (share the join link) — growth loop, not an ask.

export type JoinSource = 'Kiosk' | 'Live' | 'Digital' | 'Stripe Redirect' | 'Website'

const ENTRY: Record<JoinSource, { pre?: string }> = {
  Kiosk: {},
  Live: {},
  Digital: {},
  'Stripe Redirect': { pre: 'Thank you for the support 🙏' },
  Website: {},
}

const JoinFlow = ({ source, big = false }: { source: JoinSource; big?: boolean }) => {
  const [step, setStep] = useState<'email' | 'phone' | 'zip' | 'done'>('email')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneYes, setPhoneYes] = useState<boolean | null>(null)
  const [phone, setPhone] = useState('')
  const [zipYes, setZipYes] = useState<boolean | null>(null)
  const [zip, setZip] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Kiosk is a fixed device: after success, reset for the next person
  useEffect(() => {
    if (step === 'done' && source === 'Kiosk') {
      resetTimer.current = setTimeout(() => {
        setStep('email')
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhoneYes(null)
        setPhone('')
        setZipYes(null)
        setZip('')
      }, 8000)
      return () => {
        if (resetTimer.current) clearTimeout(resetTimer.current)
      }
    }
  }, [step, source])

  const submit = async (geoOptIn: boolean, zipValue: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone: phoneYes ? phone : '',
          phoneOptIn: phoneYes === true && phone.trim() !== '',
          geoOptIn,
          postalCode: geoOptIn ? zipValue : '',
          source,
          website,
          device: deviceId(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'something went sideways — try again')
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'something went sideways — try again')
    } finally {
      setBusy(false)
    }
  }

  const tellAFriend = async () => {
    const url = `${window.location.origin}/join`
    const text = "Let's get Nick Rains to play our town — join the club"
    if (navigator.share) {
      await navigator.share({ title: 'Nick Rains', text, url }).catch(() => {})
    } else {
      await navigator.clipboard?.writeText(url).catch(() => {})
      setShared(true)
    }
  }

  const h = big ? 'display text-4xl md:text-5xl' : 'display text-2xl'
  const input = `w-full border-2 border-ink bg-paper px-4 ${big ? 'py-4 text-lg' : 'py-2.5'} placeholder:text-ink/40 focus:outline-none focus:border-orange`
  const cta = `btn block w-full text-center ${big ? '!py-4 !text-sm' : '!py-3 !text-[11px]'}`
  const nope = 'font-mono text-[11px] uppercase underline text-ink/50 hover:text-orange block mx-auto mt-3'
  const entry = ENTRY[source]

  if (step === 'done') {
    return (
      <div className="border-2 border-ink bg-cream/60 p-6 text-center">
        <p className={`${h} mb-2`}>You&rsquo;re in. 🎸</p>
        <p className="text-sm text-ink/70 mb-4">
          When enough of you show up from a single ZIP, we route a tour through your
          area — so tell your friends.
        </p>
        {source === 'Kiosk' ? (
          <p className="font-mono text-[10px] uppercase text-ink/40">Hand the screen to a friend 👇</p>
        ) : (
          <>
            <button onClick={tellAFriend} className={cta}>
              {shared ? 'Link copied — send it! 🎸' : 'Tell a friend →'}
            </button>
            <a
              href={LINKS.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className={nope}
            >
              or go listen
            </a>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="border-2 border-dashed border-ink/40 bg-cream/60 p-5 md:p-6">
      {entry.pre && <p className="font-mono text-[11px] uppercase text-ink/50 mb-1">{entry.pre}</p>}

      {step === 'email' && (
        <form onSubmit={(e) => { e.preventDefault(); if (email) setStep('phone') }}>
          <p className={`${h} mb-3`}>What&rsquo;s your email?</p>
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" className={input} />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" className={input} />
            </div>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className={input} />
          </div>
          {/* honeypot */}
          <input value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px opacity-0" />
          <button type="submit" className={cta}>Let&rsquo;s Go →</button>
        </form>
      )}

      {step === 'phone' && (
        <div>
          <p className={`${h} mb-3`}>Can I text you about upcoming shows and new music?</p>
          {phoneYes !== true ? (
            <>
              <button onClick={() => setPhoneYes(true)} className={cta}>Yes, text me 📱</button>
              <button
                onClick={() => { setPhoneYes(false); setPhone(''); setStep('zip') }}
                className={nope}
              >
                No thanks
              </button>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (phone.trim()) setStep('zip') }}>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" autoComplete="tel" className={`${input} mb-3`} />
              <button type="submit" className={cta}>Continue →</button>
              <button type="button" onClick={() => { setPhoneYes(false); setPhone(''); setStep('zip') }} className={nope}>
                Actually, no thanks
              </button>
            </form>
          )}
        </div>
      )}

      {step === 'zip' && (
        <div>
          <p className={`${h} mb-3`}>Would you like to know about shows in your hometown?</p>
          {zipYes !== true ? (
            <>
              <button onClick={() => setZipYes(true)} className={cta} disabled={busy}>
                Yes — that&rsquo;s the whole point 🎸
              </button>
              <button
                onClick={() => { setZipYes(false); submit(false, '') }}
                disabled={busy}
                className={nope}
              >
                No thanks
              </button>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (zip.trim()) submit(true, zip) }}>
              <input required value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP code" inputMode="numeric" autoComplete="postal-code" className={`${input} mb-3`} />
              {error && <p className="font-mono text-[11px] uppercase text-orange mb-2">{error}</p>}
              <button type="submit" disabled={busy} className={cta}>
                {busy ? 'One sec…' : "I'm In 🎸"}
              </button>
            </form>
          )}
          {error && zipYes !== true && <p className="font-mono text-[11px] uppercase text-orange mt-2">{error}</p>}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase text-ink/40 mt-3 text-center">
        Straight from Nick, never spam · unsubscribe anytime
      </p>
    </div>
  )
}

export default JoinFlow
