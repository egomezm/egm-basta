import type { GameState, Round } from '../api/basta'
import { scoreRound } from './scoring'

export function roundScores(state: GameState, round: Round) {
  const { session, players, answers, votes } = state
  return scoreRound({
    letter: round.letter ?? '',
    categoryCount: session.categories.length,
    playerIds: players.filter((p) => p.first_round <= round.number).map((p) => p.id),
    creatorId: session.creator_player_id,
    answers: answers.filter((a) => a.round_id === round.id),
    votes: votes.filter((v) => v.round_id === round.id),
    ptsUnique: session.settings.pts_unique,
    ptsShared: session.settings.pts_shared,
  })
}

export function standings(state: GameState) {
  const totals = new Map<string, number>(state.players.map((p) => [p.id, 0]))
  for (const r of state.rounds.filter((x) => x.status === 'locked')) {
    for (const [id, pts] of roundScores(state, r).totals) totals.set(id, (totals.get(id) ?? 0) + pts)
  }
  return state.players
    .map((p) => ({ player: p, total: totals.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.player.join_seq - b.player.join_seq)
}
