// Show metadata for ticketing — shared by the Stripe webhook (ticket email),
// /api/checkin (door scanner), and /api/checkout (session creation).
// Not a route: no onRequest exports.
//
// Keys must match the SHOWS key in src/pages/Live.tsx.
// Adding a ticketed show = add it in Live.tsx AND here.

export interface PriceTier {
  cents: number
  label: string    // '$8', '$10' — display string
  endsAt?: string  // ISO 8601 with offset; absent = always active
}

export interface ShowMeta {
  city: string  // 'Knoxville, TN' — email subject uses the part before the comma
  venue: string
  address: string
  date: string
  time: string
  showAt: string    // ISO 8601 — checkout blocks after this; card shows "Show complete"
  capacity?: number // optional max tickets; omit for unlimited
  pricing: {
    presale?: PriceTier
    door: PriceTier
  }
}

export const SHOW_META: Record<string, ShowMeta> = {
  'knoxville/090526': {
    city: 'Knoxville, TN',
    venue: 'Pretentious Beer Co.',
    address: '131 South Central Street, Knoxville, TN 37902',
    date: 'Saturday, September 5th',
    time: 'Doors 7 PM · Music 7:30 PM',
    showAt: '2026-09-05T19:00:00-05:00',
    capacity: 75,
    pricing: {
      presale: { cents: 1000, label: '$10', endsAt: '2026-09-04T23:59:00-05:00' },
      door: { cents: 1500, label: '$15' },
    },
  },
}
