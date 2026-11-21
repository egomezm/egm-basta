export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function startsWithLetter(text: string, letter: string): boolean {
  const n = normalize(text)
  return n.length > 0 && n[0] === normalize(letter)
}
