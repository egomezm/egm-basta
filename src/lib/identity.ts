const TOKEN_KEY = 'basta:token'
const NAME_KEY = 'basta:name'

export function getToken(): string {
  let t = localStorage.getItem(TOKEN_KEY)
  if (!t || t.length < 16) {
    t = crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, t)
  }
  return t
}

function deviceGuess(): string {
  const ua = navigator.userAgent
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Device'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser'
  return `${device} · ${browser}`
}

export function getName(): string {
  return localStorage.getItem(NAME_KEY) ?? deviceGuess()
}

export function setName(n: string) {
  localStorage.setItem(NAME_KEY, n)
}

const draftKey = (code: string, round: string) => `basta:draft:${code}:${round}`

export function loadDraft(code: string, round: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(draftKey(code, round)) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function saveDraft(code: string, round: string, values: string[]) {
  localStorage.setItem(draftKey(code, round), JSON.stringify(values))
}
