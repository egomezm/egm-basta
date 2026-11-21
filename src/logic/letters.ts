export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const MS_PER_LETTER = 10

export function availablePool(used: readonly string[]): string {
  return [...ALPHABET].filter((l) => !used.includes(l)).join('')
}

// Must match basta_letter_at() in supabase/001_basta.sql
export function letterAt(pool: string, elapsedMs: number): string {
  if (!pool) return ''
  const idx = Math.floor(Math.max(0, elapsedMs) / MS_PER_LETTER) % pool.length
  return pool[idx]
}
