import { useState, useRef, useCallback } from 'react'

export type CatchPhase = 'fighting' | 'judging' | 'caught' | 'fled'

export interface HitEffect {
  id:  number
  x:   number
  y:   number
  dmg: number
}

const DEFAULT_MAX_HP = 100

export function useCatchGame(onCaptured: () => void) {
  const [hp, setHp]       = useState(DEFAULT_MAX_HP)
  const [phase, setPhase] = useState<CatchPhase>('fighting')
  const [hits, setHits]   = useState<HitEffect[]>([])
  const [shake, setShake] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const addHit = useCallback((x: number, y: number, dmg: number) => {
    const id = Date.now() + Math.random()
    setHits((p) => [...p, { id, x, y, dmg }])
    setShake(true)
    setTimeout(() => setShake(false), 120)
    setTimeout(() => setHits((p) => p.filter((h) => h.id !== id)), 600)
  }, [])

  const judgeCapture = useCallback(() => {
    setPhase('judging')
    setTimeout(() => {
      // 데모: 무조건 포획 성공
      setPhase('caught')
      onCaptured()
    }, 700)
  }, [onCaptured])

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== 'fighting') return
      const point = 'touches' in e ? e.touches[0] : e
      const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = point.clientX - rect.left
      const y = point.clientY - rect.top
      if (lastPos.current) {
        const dx   = x - lastPos.current.x
        const dy   = y - lastPos.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const dmg  = Math.min(25, Math.max(5, Math.round(dist / 6)))
        setHp((prev) => {
          const next = Math.max(0, prev - dmg)
          if (next === 0 && prev > 0) setTimeout(judgeCapture, 400)
          return next
        })
        addHit(x, y, dmg)
      }
      lastPos.current = { x, y }
    },
    [phase, addHit, judgeCapture],
  )

  const releasePointer = useCallback(() => { lastPos.current = null }, [])

  return {
    hp,
    hpPercent: (hp / DEFAULT_MAX_HP) * 100,
    phase,
    hits,
    shake,
    handleMove,
    releasePointer,
  }
}
