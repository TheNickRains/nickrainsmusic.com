import { useSearchParams } from 'react-router-dom'
import JoinFlow, { type JoinSource } from '../components/JoinFlow'

// Standalone capture page (join.nickrainsmusic.com and /join).
// ?src= kiosk | live | digital | stripe — defaults to Live (the printed QR).
const SRC_MAP: Record<string, JoinSource> = {
  kiosk: 'Kiosk',
  live: 'Live',
  digital: 'Digital',
  stripe: 'Stripe Redirect',
  website: 'Website',
}

const Join = () => {
  const [params] = useSearchParams()
  const source = SRC_MAP[(params.get('src') || 'live').toLowerCase()] || 'Live'
  const kiosk = source === 'Kiosk'

  return (
    <div className="grain speckle min-h-screen text-ink flex flex-col">
      <div className={`flex-1 flex flex-col justify-center px-5 py-10 mx-auto w-full ${kiosk ? 'max-w-xl' : 'max-w-md'}`}>
        <img src="/images/logo-black.png" alt="Nick Rains" className={`w-auto mx-auto ${kiosk ? 'h-14 mb-8' : 'h-10 mb-6'}`} />
        <h1 className={`display text-center mb-2 ${kiosk ? 'text-6xl' : 'text-4xl'}`}>Join The Club</h1>
        <p className={`text-center text-ink/70 mb-6 ${kiosk ? 'text-lg' : 'text-sm'}`}>
          You pick where I play next — when enough of you are in one town, I come to you.
        </p>
        <JoinFlow source={source} big={kiosk} />
      </div>
      {!kiosk && (
        <p className="font-mono text-[10px] uppercase text-ink/40 text-center pb-6">
          <a href="/" className="underline hover:text-orange">nickrainsmusic.com</a>
        </p>
      )}
    </div>
  )
}

export default Join
