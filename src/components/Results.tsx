import { useI18n } from '../i18n'
import type { Key } from '../i18n/dict'
import type { GameState, Round } from '../api/basta'
import { tally, type CellStatus } from '../logic/scoring'
import { roundScores } from '../logic/standings'
import g from './Game.module.css'

const STATUS_KEY: Record<CellStatus, Key> = {
  blank: 'stBlank',
  wrong: 'stWrong',
  rejected: 'stRejected',
  unique: 'stUnique',
  shared: 'stShared',
}
const STATUS_CLASS: Record<CellStatus, string> = {
  blank: '',
  wrong: g.bad,
  rejected: g.bad,
  unique: g.unique,
  shared: g.shared,
}

interface Props {
  state: GameState
  round: Round
  canVote: boolean
  onVote: (round: string, target: string, idx: number, valid: boolean | null) => void
}

export default function Results({ state, round, canVote, onVote }: Props) {
  const { t } = useI18n()
  const { session, players, answers, votes, me } = state
  const { cells, totals } = roundScores(state, round)
  const rows = players.filter((p) => cells.has(p.id))

  return (
    <div className={g.tableWrap}>
      <table className={g.table}>
        <thead>
          <tr>
            <th>{t('playerCol')}</th>
            {session.categories.map((c, i) => <th key={i}>{c}</th>)}
            <th>{t('total')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              {session.categories.map((_, idx) => {
                const cell = cells.get(p.id)![idx]
                const a = answers.find((x) => x.round_id === round.id && x.player_id === p.id && x.category_idx === idx)
                const tl = tally(
                  votes.filter((v) => v.round_id === round.id),
                  p.id,
                  idx,
                  session.creator_player_id,
                )
                const mine = votes.find(
                  (v) => v.round_id === round.id && v.target_player_id === p.id && v.category_idx === idx && v.voter_id === me,
                )
                const votable = canVote && p.id !== me && cell.status !== 'blank' && cell.status !== 'wrong'
                return (
                  <td key={idx} className={STATUS_CLASS[cell.status]}>
                    <div className={g.cellText}>{a?.text || '—'}</div>
                    <div className={g.st}>
                      {t(STATUS_KEY[cell.status])}
                      {cell.pts > 0 && ` · ${t('pts', { n: cell.pts })}`}
                    </div>
                    {votable && (
                      <div className={g.votes}>
                        <button
                          type="button"
                          className={mine?.valid === true ? g.on : ''}
                          aria-pressed={mine?.valid === true}
                          aria-label={t('voteValid')}
                          onClick={() => onVote(round.id, p.id, idx, mine?.valid === true ? null : true)}
                        >
                          ✓ {tl.valid}
                        </button>
                        <button
                          type="button"
                          className={mine?.valid === false ? g.on : ''}
                          aria-pressed={mine?.valid === false}
                          aria-label={t('voteInvalid')}
                          onClick={() => onVote(round.id, p.id, idx, mine?.valid === false ? null : false)}
                        >
                          ✗ {tl.invalid}
                        </button>
                      </div>
                    )}
                  </td>
                )
              })}
              <td>{totals.get(p.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
