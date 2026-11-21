import { useCallback, useEffect, useRef, useState } from 'react'
import { getState, type GameState } from '../api/basta'
import { ApiError, supabaseConfig } from '../api/client'

const POLL_MS = 2500

interface Channel {
  send: (m: { type: 'broadcast'; event: string; payload: object }) => unknown
  unsubscribe: () => unknown
}

// Polling is the source of truth (and the presence heartbeat); Broadcast pings make it feel instant.
export function useGame(code: string) {
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const offset = useRef(0)
  const busy = useRef(false)
  const again = useRef(false)
  const channel = useRef<Channel | null>(null)

  const refresh = useCallback(async () => {
    if (busy.current) {
      again.current = true
      return
    }
    busy.current = true
    try {
      do {
        again.current = false
        try {
          const st = await getState(code)
          offset.current = st.now - Date.now()
          setState(st)
          setError(null)
        } catch (e) {
          if (e instanceof ApiError && e.code !== 'network') setError(e.code)
        }
      } while (again.current)
    } finally {
      busy.current = false
    }
  }, [code])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    const { url, anonKey } = supabaseConfig
    if (!url || !anonKey) return
    void import('@supabase/supabase-js')
      .then(({ createClient }) => {
        if (cancelled) return
        const client = createClient(url, anonKey, { auth: { persistSession: false } })
        const ch = client.channel(`basta:${code}`)
        ch.on('broadcast', { event: 'ping' }, () => void refresh()).subscribe()
        channel.current = ch as unknown as Channel
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      channel.current?.unsubscribe()
      channel.current = null
    }
  }, [code, refresh])

  // Runs an action, refreshes immediately and tells the other players to refresh.
  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn()
      } finally {
        await refresh()
        channel.current?.send({ type: 'broadcast', event: 'ping', payload: {} })
      }
    },
    [refresh],
  )

  const serverNow = useCallback(() => Date.now() + offset.current, [])
  return { state, error, refresh, act, serverNow }
}
