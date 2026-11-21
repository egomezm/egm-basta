import type { Answer, Vote } from '../api/basta'
import { startsWithLetter } from './normalize'

export type CellStatus = 'blank' | 'wrong' | 'rejected' | 'unique' | 'shared'

export interface Cell {
  status: CellStatus
  pts: number
}

export interface ScoreInput {
  letter: string
  categoryCount: number
  playerIds: string[]
  creatorId: string
  answers: Pick<Answer, 'player_id' | 'category_idx' | 'text' | 'normalized'>[]
  votes: Pick<Vote, 'target_player_id' | 'category_idx' | 'voter_id' | 'valid'>[]
  ptsUnique: number
  ptsShared: number
}

export interface VoteTally {
  valid: number
  invalid: number
  rejected: boolean
}

// Invalid > valid rejects; a tie is decided by the creator (valid if the creator did not vote).
export function tally(
  votes: ScoreInput['votes'],
  target: string,
  idx: number,
  creatorId: string,
): VoteTally {
  const vs = votes.filter(
    (v) => v.target_player_id === target && v.category_idx === idx && v.voter_id !== target,
  )
  const valid = vs.filter((v) => v.valid).length
  const invalid = vs.length - valid
  let rejected = invalid > valid
  if (invalid === valid && invalid > 0) {
    rejected = vs.find((v) => v.voter_id === creatorId)?.valid === false
  }
  return { valid, invalid, rejected }
}

export function scoreRound(input: ScoreInput) {
  const { letter, categoryCount, playerIds, creatorId, answers, votes } = input
  const cells = new Map<string, Cell[]>()
  const counts = new Map<string, number>()
  const pending: { player: string; idx: number; norm: string }[] = []

  for (const p of playerIds) cells.set(p, Array.from({ length: categoryCount }, () => ({ status: 'blank', pts: 0 })))

  for (const p of playerIds) {
    for (let idx = 0; idx < categoryCount; idx++) {
      const a = answers.find((x) => x.player_id === p && x.category_idx === idx)
      const cell = cells.get(p)![idx]
      if (!a || !a.normalized) continue
      if (!startsWithLetter(a.text, letter)) {
        cell.status = 'wrong'
        continue
      }
      if (tally(votes, p, idx, creatorId).rejected) {
        cell.status = 'rejected'
        continue
      }
      pending.push({ player: p, idx, norm: a.normalized })
      const key = `${idx}|${a.normalized}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  for (const { player, idx, norm } of pending) {
    const shared = (counts.get(`${idx}|${norm}`) ?? 0) > 1
    cells.get(player)![idx] = shared
      ? { status: 'shared', pts: input.ptsShared }
      : { status: 'unique', pts: input.ptsUnique }
  }

  const totals = new Map<string, number>()
  for (const [p, cs] of cells) totals.set(p, cs.reduce((n, c) => n + c.pts, 0))
  return { cells, totals }
}
