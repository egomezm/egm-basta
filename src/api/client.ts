import type { Key } from '../i18n/dict'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)
export const supabaseConfig = { url, anonKey }

export class ApiError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

const ERROR_KEYS: Record<string, Key> = {
  not_found: 'errNotFound',
  expired: 'errExpired',
  closed: 'errClosed',
  not_member: 'errNotMember',
  not_all_filled: 'errNotAllFilled',
  too_late: 'errTooLate',
  not_your_turn: 'errNotYourTurn',
  bad_state: 'errBadState',
  not_allowed: 'errNotAllowed',
}

export function errorKey(e: unknown): Key {
  return (e instanceof ApiError && ERROR_KEYS[e.code]) || 'errorGeneric'
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!url || !anonKey) throw new ApiError('not_configured')
  let res: Response
  try {
    res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(body?.message ?? 'error')
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}
