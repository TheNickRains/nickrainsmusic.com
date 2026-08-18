import { useEffect } from 'react'

// End-of-show sweep: compare the sweep timestamp against the one this page
// saw when it loaded. A newer value = the show just ended while you were
// here -> momentary redirect to the lead capture. Fresh visits are untouched.
export const useShowGate = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return
    let baseline: number | null = null
    let stop = false
    const check = async () => {
      try {
        const res = await fetch('/api/show')
        if (!res.ok) return
        const { sweep } = await res.json()
        if (baseline === null) {
          baseline = sweep
          return
        }
        if (!stop && sweep > baseline) {
          window.location.href = '/#fanlist'
        }
      } catch {
        /* offline — stay put */
      }
    }
    check()
    const t = setInterval(check, 6000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [enabled])
}
