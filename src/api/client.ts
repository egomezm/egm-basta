const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!url || !key) {
    throw new ApiError(0, 'Supabase is not configured (see .env.example)')
  }
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const api = {
  list: <T>(table: string, query = '') => request<T[]>(`${table}${query ? `?${query}` : ''}`),
  insert: async <T>(table: string, row: Partial<T>) =>
    (await request<T[]>(table, { method: 'POST', body: JSON.stringify(row) }))[0],
  remove: (table: string, id: string | number) =>
    request<void>(`${table}?id=eq.${encodeURIComponent(String(id))}`, { method: 'DELETE' }),
}
