import { describe, expect, it } from 'vitest'
import { scoreRound, tally } from './scoring'
import { nextTurn } from './rotation'

const a = (p: string, idx: number, text: string) => ({
  player_id: p,
  category_idx: idx,
  text,
  normalized: text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
})

const base = { letter: 'M', categoryCount: 2, playerIds: ['a', 'b', 'c'], creatorId: 'a', ptsUnique: 100, ptsShared: 50 }

describe('scoreRound', () => {
  it('scores unique, shared, blank and wrong letter', () => {
    const r = scoreRound({
      ...base,
      answers: [a('a', 0, 'Maria'), a('b', 0, 'maría'), a('c', 0, 'Pedro'), a('a', 1, 'Mono'), a('b', 1, 'Mesa')],
      votes: [],
    })
    expect(r.cells.get('a')!.map((c) => c.status)).toEqual(['shared', 'unique'])
    expect(r.cells.get('c')!.map((c) => c.status)).toEqual(['wrong', 'blank'])
    expect(r.totals.get('a')).toBe(150)
    expect(r.totals.get('b')).toBe(150)
    expect(r.totals.get('c')).toBe(0)
  })

  it('rejected answers score 0 and do not make others shared', () => {
    const r = scoreRound({
      ...base,
      answers: [a('a', 0, 'Mono'), a('b', 0, 'Mono')],
      votes: [
        { target_player_id: 'b', category_idx: 0, voter_id: 'a', valid: false },
        { target_player_id: 'b', category_idx: 0, voter_id: 'c', valid: false },
      ],
    })
    expect(r.cells.get('b')![0].status).toBe('rejected')
    expect(r.cells.get('a')![0].status).toBe('unique')
  })
})

describe('tally', () => {
  const v = (voter: string, valid: boolean) => ({ target_player_id: 't', category_idx: 0, voter_id: voter, valid })
  it('majority wins and ignores self votes', () => {
    expect(tally([v('x', false), v('y', true), v('z', false)], 't', 0, 'x').rejected).toBe(true)
    expect(tally([v('t', false)], 't', 0, 'x').rejected).toBe(false)
  })
  it('tie is decided by the creator', () => {
    expect(tally([v('x', false), v('y', true)], 't', 0, 'x').rejected).toBe(true)
    expect(tally([v('x', true), v('y', false)], 't', 0, 'x').rejected).toBe(false)
    expect(tally([v('y', false), v('z', true)], 't', 0, 'x').rejected).toBe(false)
  })
})

describe('nextTurn', () => {
  const ps = (c: boolean[]) => c.map((connected, i) => ({ id: 'p' + (i + 1), join_seq: i + 1, connected }))
  it('starts with first and second joiners', () => {
    const t = nextTurn(ps([true, true, true]), null)
    expect([t.spinner?.id, t.stopper?.id]).toEqual(['p1', 'p2'])
  })
  it('previous stopper spins and the last joiner wraps', () => {
    const p = ps([true, true, true])
    expect(nextTurn(p, { spinner_id: 'p1', stopper_id: 'p2' }).stopper?.id).toBe('p3')
    const t = nextTurn(p, { spinner_id: 'p2', stopper_id: 'p3' })
    expect([t.spinner?.id, t.stopper?.id]).toEqual(['p3', 'p1'])
  })
  it('skips disconnected players', () => {
    const t = nextTurn(ps([true, false, true]), { spinner_id: 'p1', stopper_id: 'p2' })
    expect([t.spinner?.id, t.stopper?.id]).toEqual(['p3', 'p1'])
  })
})
