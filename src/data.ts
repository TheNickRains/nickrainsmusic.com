// Single source of truth for the EPK — contact, links, bios, sections.
export const CONTACT = {
  email: 'booking@nickrainsmusic.com',
  phone: '504-518-0117',
  phoneHref: 'tel:+15045180117',
}

export const LINKS = {
  spotify: 'https://open.spotify.com/artist/19Lnssy5W3Cv80Rtjb8LkR',
  // Artist embed surfaces top tracks, strongest first — "3 tracks max" served automatically
  spotifyArtistEmbed: 'https://open.spotify.com/embed/artist/19Lnssy5W3Cv80Rtjb8LkR?utm_source=generator',
  appleMusic: 'https://music.apple.com/us/artist/nick-rains/1563629616',
  midnightSun: 'https://music.apple.com/us/album/midnight-sun/1697129123?i=1697129367',
  instagram: 'https://instagram.com/nickrains',
  tiktok: 'https://tiktok.com/@nickrainsmusic',
  youtube: 'https://www.youtube.com/channel/UC_LaiEp0-hy92h1IWCHbbeA',
  facebook: 'https://facebook.com/nickrainsmusic',
  acousticReel: 'https://www.instagram.com/reel/DVhwnq_DdQQ/embed',
  bandsintownArtist: 'id_3251702',
  techRiderPdf: '/Nick-Rains-Tech-Rider.pdf',
  // Fan-club signup (Tally form from Nick's Linktree) — "The Club"
  fanForm: 'https://tally.so/r/3X9Z6z',
  // Tip jar (Stripe donate link from Nick's Linktree)
  tipJar: 'https://donate.stripe.com/9AQaF25UW8P655C9AA',
  // Boosts & goal chip-ins flow through this Stripe link with ?client_reference_id
  // attached — the webhook attributes by reference, so ANY payment link on Nick's
  // account works. Using the live tip jar now; swap for a dedicated "Boost a Song"
  // link (lower preset than the tip jar's $50) whenever Nick creates one.
  songRequestLink: 'https://donate.stripe.com/9AQaF25UW8P655C9AA',
  x: 'https://x.com/nickrainsmusic',
  soundcloud: 'https://on.soundcloud.com/WamfQ5uVY8Jom6Qb8',
  bandsintownPage: 'https://www.bandsintown.com/a/3251702',
  // Live song list (Notion, from Nick's Linktree) — swap for StageFuel when it deploys
  songList: 'https://raincloudmedia.notion.site/2d3baedd8eeb8067b82bf9da88f52e1a?v=2d3baedd8eeb8005866a000c480da0d2',
  // Single embeds (players show their own titles/art)
  trackEmbed1: 'https://open.spotify.com/embed/track/3XSRMeR5adkIXTE7F1UZoy?utm_source=generator',
  trackEmbed2: 'https://open.spotify.com/embed/track/0ruMMAHVHo0uYhCmAM3IY1?utm_source=generator',
}

// Header hook — visible with booking contact before any scrolling
export const HOOK = {
  genre: 'Indie-folk / Americana',
  base: '',
  quote: '“Nick Rains can cast his spell over any audience — and we’re already huge fans.”',
  quoteSource: 'The Get Up · Nashville',
}

// Brief bio (50–100 words, third person, strongest recent credential first). DRAFT — Nick edits.
export const BIO_BRIEF = `Nick Rains got his start in the French Quarter and his education busking street
corners across America. Fifteen years of relentless live work later — a sold-out night at the Viper Room,
residencies across the Austin and San Antonio corridor — he tours full-time with a 1,000-song repertoire
and a reputation for holding any room, solo acoustic or with a full band, for as long as the night needs.`

// Extended bio (150–250 words). DRAFT — Nick edits.
export const BIO_EXTENDED = [
  `Nick Rains learned to work a crowd the hardest way there is: busking French Quarter street corners in
New Orleans as a teenager, where nobody has to stop and listen. Fifteen years later, that education shows.
It carried him west to Los Angeles — where he sold out a headline night at the Viper Room — through
multi-month residencies across the Texas Hill Country and the Austin–San Antonio corridor, and into
a life lived fully on the road: two years and counting of full-time touring, with his wife and son
along for every mile.`,
  `His songs are acoustic-driven and specific: faith, marriage, love, and loss, written from the road and
rooted in the places that shaped him. Listeners hear the lineage of Tyler Childers and Passenger — writing
that makes you feel like you were in the room when it happened.`,
  `On stage he's a chameleon by necessity and a multi-instrumentalist by habit, with a repertoire north of
1,000 songs spanning Nashville and Texas country, rock, and modern hits. He performs weekly — solo,
duo, or with his band — and travels fully self-contained. His debut full-length album is currently in
progress in Nashville, built from fifteen years of road-tested material.`,
]

export const CONFIGS = [
  { name: 'Solo Acoustic', pieces: '1', detail: 'Guitar & vocals, fully self-contained PA — needs only a power outlet.' },
  { name: 'Acoustic Duo', pieces: '2', detail: 'Dining-room and cocktail-hour volume.' },
  { name: 'Trio', pieces: '3', detail: 'Drums, bass, guitar — the bar-band core.' },
  { name: 'Quartet', pieces: '4', detail: 'Drums, bass, guitar, keys.' },
  { name: 'Full Band', pieces: '5', detail: 'Drums, bass, rhythm, lead, keys — three-part harmonies.' },
  { name: 'Nashville Extended', pieces: '7', detail: 'Steel guitar, fiddle, drums, bass, keys, lead, rhythm/vox.' },
]

// Draw proof — honest inventory only. No streaming/social counts (they don't help yet).
export const DRAW = [
  { fact: 'The Viper Room', where: 'West Hollywood, CA' },
  { fact: 'Catbird Music Festival', where: '2023' },
  { fact: 'On tour full-time for the past two years — van life, with his wife and son', where: 'ongoing' },
  { fact: '500+ direct-email fan list', where: 'and growing' },
]

export const CADENCE = 'Performing weekly — Nashville & regional'
