import { useCallback, useEffect, useState } from 'react'
import { LINKS } from '../data'
import { markTipped } from './TipNudge'
import { withDevice } from '../device'

// Standing goal-song campaigns — asynchronous patronage: strangers across
// shows chip in toward the same song until it unlocks. Ordered most to least
// expensive; the big goals get the splashy treatment (desire flows downhill).

export interface Goal {
  id: string
  song: string
  artist: string
  goal_cents: number
  current_cents: number
  unlocked: number
  active?: number
}

export const chipInHref = (goalId: string) =>
  withDevice(`${LINKS.songRequestLink || LINKS.tipJar}?client_reference_id=goal-${goalId}`)

// Full-size bar — used in the admin panel on /queue
export const GoalBar = ({ goal }: { goal: Goal }) => {
  const pct = Math.min(100, Math.round((goal.current_cents / goal.goal_cents) * 100))
  return (
    <div className="border-2 border-ink bg-cream/60 p-3">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="font-semibold leading-tight truncate">
          {goal.song}
          {goal.artist && <span className="text-ink/60 font-normal"> – {goal.artist}</span>}
        </p>
        <span className="font-mono text-[11px] font-bold whitespace-nowrap">
          ${(goal.current_cents / 100).toFixed(0)} / ${(goal.goal_cents / 100).toFixed(0)}
        </span>
      </div>
      <div className="h-3 border border-ink/40 bg-paper">
        <div
          className={`h-full transition-all duration-700 ${goal.unlocked ? 'bg-ink' : 'bg-orange'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {goal.unlocked === 1 && (
        <p className="font-mono text-[11px] font-bold uppercase mt-1.5">🎸 Unlocked</p>
      )}
    </div>
  )
}

const tierOf = (g: Goal) => (g.goal_cents >= 25000 ? 'grand' : g.goal_cents >= 10000 ? 'major' : 'standard')

const Goals = ({ pollMs = 10000 }: { pollMs?: number }) => {
  const [goals, setGoals] = useState<Goal[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      if (!res.ok) return
      const data = await res.json()
      setGoals(data.goals || [])
    } catch {
      /* stay hidden */
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, pollMs)
    return () => clearInterval(t)
  }, [load, pollMs])

  if (goals.length === 0) return null

  return (
    <div className="bg-olive text-cream -mx-5 px-5 md:mx-0 md:px-4 py-3 mb-6">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-2.5">
        ● Goal songs — chip in with strangers, unlock it live
      </p>
      <div className="space-y-2.5">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.current_cents / g.goal_cents) * 100))
          const tier = tierOf(g)
          const dollars = (n: number) => `$${(n / 100).toFixed(0)}`

          if (tier === 'grand') {
            return (
              <div key={g.id} className="border-2 border-orange p-3 -mx-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="display text-2xl leading-none truncate">{g.song}</p>
                  <span className="display text-2xl text-orange whitespace-nowrap">{dollars(g.goal_cents)}</span>
                </div>
                {g.artist && <p className="text-cream/60 text-sm mb-2">{g.artist}</p>}
                <div className="h-3 border border-cream/40 mb-2">
                  <div
                    className={`h-full transition-all duration-700 ${g.unlocked ? 'bg-cream' : 'bg-orange'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] font-bold">
                    {dollars(g.current_cents)} raised · {pct}%
                  </span>
                  {g.unlocked === 1 ? (
                    <span className="font-mono text-[11px] font-bold uppercase">🎸 Unlocked</span>
                  ) : (
                    <a href={chipInHref(g.id)} target="_blank" rel="noopener noreferrer" onClick={() => markTipped()} className="btn !px-3 !py-1.5 !text-[10px]">
                      Chip in →
                    </a>
                  )}
                </div>
              </div>
            )
          }

          return (
            <div key={g.id} className={tier === 'major' ? 'py-0.5' : ''}>
              <p className={`leading-tight truncate mb-1 ${tier === 'major' ? 'font-bold' : 'font-semibold text-sm'}`}>
                {g.song}
                {g.artist && <span className="text-cream/60 font-normal"> – {g.artist}</span>}
              </p>
              <div className="flex items-center gap-2">
                <div className={`flex-1 border border-cream/30 ${tier === 'major' ? 'h-2.5' : 'h-2'}`}>
                  <div
                    className={`h-full transition-all duration-700 ${g.unlocked ? 'bg-cream' : 'bg-orange'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold whitespace-nowrap">
                  {dollars(g.current_cents)}/{dollars(g.goal_cents)}
                </span>
                {g.unlocked === 1 ? (
                  <span className="font-mono text-[10px] font-bold uppercase shrink-0">🎸 Unlocked</span>
                ) : (
                  <a
                    href={chipInHref(g.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markTipped()}
                    className="btn !px-2.5 !py-1 !text-[10px] shrink-0"
                  >
                    Chip in →
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Goals
