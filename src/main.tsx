import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Epk from './pages/Epk'
import Links from './pages/Links'
import Songs from './pages/Songs'
import Queue from './pages/Queue'
import Join from './pages/Join'
import Live from './pages/Live'
import Checkin from './pages/Checkin'
import { LINKS } from './data'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Subdomain shells: each subdomain is a purpose-built slice of the same app.
//   songs.  → bare repertoire browser (no live-show features)
//   epk.    → the industry press kit
//   join.   → lead capture funnel
//   live.   → show landing pages (live.nickrainsmusic.com/city/MMDDYY)
//   tip. / donate. → straight to Stripe
const sub = window.location.hostname.split('.')[0]

if (sub === 'tip' || sub === 'donate') {
  window.location.replace(LINKS.tipJar)
}

const routes =
  sub === 'songs' ? (
    <Routes>
      <Route path="*" element={<Songs bare />} />
    </Routes>
  ) : sub === 'epk' ? (
    <Routes>
      <Route path="*" element={<Epk />} />
    </Routes>
  ) : sub === 'join' ? (
    <Routes>
      <Route path="*" element={<Join />} />
    </Routes>
  ) : sub === 'live' ? (
    <Routes>
      <Route path="*" element={<Live />} />
    </Routes>
  ) : (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/epk" element={<Epk />} />
      <Route path="/links" element={<Links />} />
      <Route path="/songs" element={<Songs />} />
      <Route path="/queue" element={<Queue />} />
      <Route path="/join" element={<Join />} />
      {/* Door ticket scanner (Nick only — needs ?key=<ADMIN_KEY>) */}
      <Route path="/checkin" element={<Checkin />} />
      {/* Familiar aliases for the show-night links page */}
      <Route path="/linktree" element={<Navigate to="/links" replace />} />
      <Route path="/club" element={<Navigate to="/links" replace />} />
      {/* Old two-face URLs → EPK audience variants */}
      <Route path="/entertainment" element={<Navigate to="/epk?for=venues" replace />} />
      <Route path="/artist" element={<Navigate to="/epk?for=listening" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>{routes}</BrowserRouter>
  </StrictMode>,
)
