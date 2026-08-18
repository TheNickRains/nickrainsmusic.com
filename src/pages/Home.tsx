import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, LINKS } from '../data'
import JoinFlow from '../components/JoinFlow'

// Fan-facing home — road-journal skin. Evergreen only: no release claims,
// no counters; self-updating embeds. Industry EPK is footer-linked only.
const Home = () => {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://widget.bandsintown.com/main.min.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div className="grain min-h-screen">
      {/* Full-bleed hero: the Catbird crowd shot — real stage, real audience */}
      <header className="relative bg-ink">
        <img
          src="/images/catbird.jpg"
          alt="Nick Rains on stage at Catbird Music Festival"
          className="w-full h-[82vh] object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/45" />
        <nav className="absolute top-0 inset-x-0 flex justify-between items-center px-5 md:px-10 py-4">
          <img src="/images/logo-white.png" alt="Nick Rains" className="h-10 md:h-12 w-auto drop-shadow" />
          <div className="font-mono text-[11px] md:text-xs uppercase flex gap-4 md:gap-7 text-cream">
            <a href="#music" className="hover:text-orange drop-shadow">Music</a>
            <a href="#tour" className="hover:text-orange drop-shadow">Tour</a>
            <a href="#fanlist" className="hover:text-orange drop-shadow">Fan list</a>
            <a href="#contact" className="hover:text-orange drop-shadow">Contact</a>
          </div>
        </nav>
        <div className="absolute bottom-0 inset-x-0 px-5 md:px-10 pb-7">
          <h1 className="display text-[16vw] md:text-[10.5vw] text-cream leading-none -mb-1">
            Nick Rains
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
            <p className="font-mono text-[11px] md:text-xs uppercase text-cream/80">
              Songwriter · Artist · Producer
            </p>
            <a href="#fanlist" className="btn">
              Get Nick to play your hometown →
            </a>
          </div>
        </div>
        <p className="absolute bottom-2 right-3 font-mono text-[9px] uppercase text-cream/40">
          Catbird Music Festival · photo: Kevin Ferguson
        </p>
      </header>

      {/* The songs — evergreen: artist embed updates itself with every release */}
      <section id="music" className="speckle text-ink px-5 md:px-10 py-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="display text-5xl md:text-6xl mb-4">The songs</h2>
            <p className="text-lg mb-6">
              Fifteen years of the road, pressed into songs — faith, marriage, love, and loss,
              from French Quarter street corners to Nashville. If one moves you, add it to a
              playlist. That&rsquo;s how you get me back to your town.
            </p>
            <a
              href={LINKS.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              Listen everywhere
            </a>
          </div>
          <div>
            <iframe
              title="Nick Rains on Spotify"
              src={LINKS.spotifyArtistEmbed}
              width="100%"
              height="352"
              frameBorder="0"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </div>
        </div>
      </section>

      {/* TOUR DATES — olive block, torn edge */}
      <section id="tour" className="torn bg-olive text-cream px-5 md:px-10 pt-16 pb-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="display text-5xl md:text-6xl text-center mb-3">Tour dates</h2>
          <p className="font-mono text-[11px] uppercase text-cream/60 text-center mb-10">
            Performing weekly, Nashville &amp; regional — don&rsquo;t see your hometown? Request it below
          </p>
          <div
            className="bit-widget-initializer"
            data-artist-name={LINKS.bandsintownArtist}
            data-display-local-dates="false"
            data-display-past-dates="false"
            data-auto-style="false"
            data-text-color="#f5e9d1"
            data-link-color="#c65a1e"
            data-background-color="transparent"
            data-display-limit="15"
            data-link-text-color="#f5e9d1"
            data-display-lineup="false"
            data-display-play-my-city="true"
            data-separator-color="rgba(245,233,209,0.2)"
          />
        </div>
      </section>

      {/* FAN LIST — the site's #1 conversion point */}
      <section id="fanlist" className="speckle text-ink px-5 md:px-10 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="display text-5xl md:text-6xl mb-3">Bring the show<br />to your hometown</h2>
          <p className="text-lg mb-2">
            You pick where I play next. The fan list is how I route the tour — when enough of
            you are in one town, I come to you. You&rsquo;ll also get show announcements, new
            songs, and stories from the road, straight from me. No algorithm in the way.
          </p>
          <p className="font-mono text-[11px] uppercase text-ink/50 mb-8">
            Unlocks exclusive merch &amp; experiences · straight from Nick, never spam
          </p>
          <JoinFlow source="Website" />
        </div>
      </section>

      {/* Photos — scrapbook strip */}
      <section className="speckle text-ink px-5 md:px-10 py-16 overflow-hidden">
        <div className="flex flex-wrap justify-center items-start gap-6 md:gap-10 max-w-5xl mx-auto">
          <figure className="polaroid -rotate-2 w-48 md:w-56 shrink-0">
            <img src="/images/gallery/g6.jpg" alt="Nick Rains live" className="film w-full h-48 md:h-56 object-cover" />
            <figcaption>On the road</figcaption>
          </figure>
          <figure className="polaroid rotate-1 w-56 md:w-72 shrink-0 md:-mt-3">
            <img src="/images/gallery/g4.jpg" alt="Nick Rains" className="film w-full h-64 md:h-80 object-cover" />
            <figcaption>Nashville, TN</figcaption>
          </figure>
          <figure className="polaroid rotate-3 w-40 md:w-48 shrink-0 md:mt-5">
            <img src="/images/gallery/g9.jpg" alt="Catbird Music Festival" className="film w-full h-40 md:h-48 object-cover" />
            <figcaption>Catbird Fest ’23</figcaption>
          </figure>
        </div>
      </section>

      {/* CONTACT + SUBSCRIBE */}
      <section id="contact" className="torn bg-olive text-cream px-5 md:px-10 pt-16 pb-0">
        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 mb-12 items-start">
            <div>
              <h2 className="display text-3xl md:text-4xl mb-4">Contact</h2>
              <p className="font-mono text-[11px] uppercase text-cream/50 mb-1">Booking &amp; inquiries</p>
              <p className="font-bold">Nicholas Rains</p>
              <a href={`mailto:${CONTACT.email}`} className="block underline hover:text-orange break-all">{CONTACT.email}</a>
              <a href={CONTACT.phoneHref} className="block underline hover:text-orange">{CONTACT.phone}</a>
            </div>
            <div>
              <h2 className="display text-3xl md:text-4xl mb-4">Not on the list yet?</h2>
              <a href="#fanlist" className="btn">Get Nick to your hometown</a>
            </div>
          </div>

          <p className="display text-2xl md:text-3xl mb-4">Where do you call home?</p>
          <div className="flex flex-wrap gap-5 font-mono text-xs uppercase mb-12">
            <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">Instagram</a>
            <a href={LINKS.tiktok} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">TikTok</a>
            <a href={LINKS.youtube} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">YouTube</a>
            <a href={LINKS.facebook} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">Facebook</a>
            <a href={LINKS.spotify} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">Spotify</a>
            <a href={LINKS.appleMusic} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange">Apple Music</a>
          </div>

          <div className="flex flex-wrap justify-between items-end gap-3 border-t border-cream/25 pt-5">
            <img src="/images/logo-white.png" alt="Nick Rains" className="h-8 w-auto" />
            <p className="font-mono text-[10px] text-cream/40 uppercase">
              © {new Date().getFullYear()} Nick Rains · <Link to="/epk" className="underline hover:text-orange">Industry &amp; press</Link>
            </p>
          </div>
        </div>
        <div className="h-[11vw] overflow-hidden -mx-5 md:-mx-10 mt-4">
          <div className="ghost text-[20vw] text-center whitespace-nowrap">Nick Rains</div>
        </div>
      </section>
    </div>
  )
}

export default Home
