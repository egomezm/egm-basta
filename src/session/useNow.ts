import { useEffect, useState } from 'react'

export function useTicker(active: boolean, ms = 100) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [active, ms])
}
