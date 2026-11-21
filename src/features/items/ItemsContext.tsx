import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../../api/client'

export interface Item {
  id: number
  title: string
  created_at: string
}

interface ItemsState {
  items: Item[]
  loading: boolean
  error: string | null
  add: (title: string) => Promise<void>
  remove: (id: number) => Promise<void>
}

const ItemsContext = createContext<ItemsState | null>(null)

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .list<Item>('items', 'select=*&order=created_at.desc')
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const add = useCallback(async (title: string) => {
    const created = await api.insert<Item>('items', { title })
    setItems((prev) => [created, ...prev])
  }, [])

  const remove = useCallback(async (id: number) => {
    await api.remove('items', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  return (
    <ItemsContext.Provider value={{ items, loading, error, add, remove }}>
      {children}
    </ItemsContext.Provider>
  )
}

export function useItems() {
  const ctx = useContext(ItemsContext)
  if (!ctx) throw new Error('useItems must be used inside ItemsProvider')
  return ctx
}
