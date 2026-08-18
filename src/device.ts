// Anonymous per-device id, attached to every Stripe link as a
// client_reference_id suffix (_d_<id>) so the webhook can record which
// device actually COMPLETED a payment — clicks don't count, money does.
const KEY = 'nr-device'

export const deviceId = (): string => {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

// href may already carry ?client_reference_id=<purpose> — suffix it.
// Otherwise attach a plain tip reference.
export const withDevice = (href: string): string => {
  const d = deviceId()
  if (href.includes('client_reference_id=')) return `${href}_d_${d}`
  return `${href}${href.includes('?') ? '&' : '?'}client_reference_id=tip_d_${d}`
}
