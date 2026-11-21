import { describe, expect, it } from 'vitest'
import { normalize, startsWithLetter } from './normalize'
import { availablePool, letterAt } from './letters'

describe('normalize', () => {
  it('ignores case, accents and extra whitespace', () => {
    expect(normalize('  ÁRBOL   Grande ')).toBe('arbol grande')
    expect(normalize('Ñandú')).toBe('nandu')
  })
})

describe('startsWithLetter', () => {
  it('compares the first letter ignoring accents and case', () => {
    expect(startsWithLetter('árbol', 'A')).toBe(true)
    expect(startsWithLetter('  perro', 'P')).toBe(true)
    expect(startsWithLetter('gato', 'P')).toBe(false)
    expect(startsWithLetter('   ', 'P')).toBe(false)
  })
})

describe('letters', () => {
  it('builds the pool without used letters', () => {
    expect(availablePool(['A', 'C'])).toBe('BDEFGHIJKLMNOPQRSTUVWXYZ')
  })

  it('advances one letter every 10ms and wraps around the pool', () => {
    const pool = 'ABCD'
    expect(letterAt(pool, 0)).toBe('A')
    expect(letterAt(pool, 9)).toBe('A')
    expect(letterAt(pool, 10)).toBe('B')
    expect(letterAt(pool, 40)).toBe('A')
    expect(letterAt(pool, 1234)).toBe(pool[123 % 4])
  })

  it('handles an empty pool and negative elapsed time', () => {
    expect(letterAt('', 100)).toBe('')
    expect(letterAt('ABC', -50)).toBe('A')
  })
})
