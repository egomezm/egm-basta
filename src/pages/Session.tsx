import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { ApiError, errorKey } from '../api/client'
import * as api from '../api/basta'
import { useGame } from '../session/useGame'
import { roundScores, standings } from '../logic/standings'
import ShareBox from '../components/ShareBox'
import PlayersPanel from '../components/PlayersPanel'
import LetterBar from '../components/LetterBar'
import AnswerSheet from '../components/AnswerSheet'
import Results from '../components/Results'
import g from '../components/Game.module.css'
import s from '../components/ui.module.css'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function Session() {
  const { t } = useI18n()
  const code = (useParams().code ?? '').toUpperCase()
  const { state, error, act, serverNow } = useGame(code)
  const [actionError, setActionError] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [showShare, setShowShare] = useState(false)

  if (error === 'not_member') return <Navigate to={`/join/${code}`} replace />
  if (error) {
    const key = errorKey(new ApiError(error))
    return (
      <section className="card">
        <p className="error" role="alert">{t(key)}</p>
        <Link to="/">{t('backHome')}</Link>
      </section>
    )
  }
  if (!state) return <p className="muted">{t('loading')}</p>

  const run = async (fn: () => Promise<unknown>) => {
    setActionError('')
    try {
      await act(fn)
    } catch (e) {
      setActionError(t(errorKey(e)))
    }
  }

  const { session, players, rounds, me } = state
  const round = rounds[rounds.length - 1]
  const mePlayer = players.find((p) => p.id === me)
  const isHost = session.creator_player_id === me
  const closed = session.status === 'closed'
  const eligible = !!mePlayer && !!round && mePlayer.first_round <= round.number
  const lastLocked = [...rounds].reverse().find((r) => r.status === 'locked')
  const ranking = standings(state)
  const host = players.find((p) => p.is_creator)
  const roundTotal = (r: api.Round) => roundScores(state, r).totals.get(me) ?? 0

  return (
    <>
      <section className="card">
        <div className={g.head}>
          <h1>{session.name}</h1>
          <div className={s.row}>
            <button type="button" onClick={() => setShowShare(!showShare)}>{session.code}</button>
            <Link to="/rules">{t('rules')}</Link>
            {isHost && !closed && !confirmClose && (
              <button type="button" className="danger" onClick={() => setConfirmClose(true)}>{t('closeGame')}</button>
            )}
          </div>
        </div>
        {showShare && <ShareBox code={session.code} />}
        {confirmClose && (
          <div className={s.col} role="alertdialog">
            <p>{t('closeConfirm')}</p>
            <div className={s.row}>
              <button type="button" onClick={() => setConfirmClose(false)}>{t('cancel')}</button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setConfirmClose(false)
                  void run(() => api.closeSession(code))
                }}
              >
                {t('closeYes')}
              </button>
            </div>
          </div>
        )}
        {actionError && <p className="error" role="alert">{actionError}</p>}
      </section>

      {closed ? (
        <section className="card">
          <h2>{t('finalTitle')}</h2>
          {session.used_letters.length >= 26 && <p>{t('allLettersUsed')}</p>}
          {ranking[0] && ranking[0].total > 0 && (
            <p className={g.winner}>
              {t('winnerIs', {
                name: ranking.filter((r) => r.total === ranking[0].total).map((r) => r.player.name).join(' & '),
              })}
            </p>
          )}
          <p className="muted">{t('gameClosed')}</p>
        </section>
      ) : (
        round && (
          <>
            {!eligible && round.status !== 'picking' && <p className="card muted">{t('joinNext')}</p>}
            {round.status !== 'locked' && (
              <LetterBar
                state={state}
                round={round}
                serverNow={serverNow}
                onStart={() => void run(() => api.startSpin(code))}
                onStop={() => void run(() => api.stopSpin(code))}
              />
            )}
            {(round.status === 'writing' || round.status === 'countdown') && eligible && (
              <AnswerSheet
                key={round.id}
                state={state}
                round={round}
                serverNow={serverNow}
                onBasta={(a) => act(() => api.pressBasta(code, a)).catch((e) => setActionError(t(errorKey(e))))}
                onSubmit={(a) => act(() => api.submitAnswers(code, a))}
              />
            )}
            {round.status === 'locked' && (
              <section className="card">
                <h2>{t('results')} · {t('roundN', { n: round.number })} ({round.letter})</h2>
                <Results state={state} round={round} canVote={eligible} onVote={(r, tg, i, v) => void run(() => api.vote(code, r, tg, i, v))} />
                <p>{t('roundSummary', { l: round.letter ?? '', n: roundTotal(round), t: ranking.find((r) => r.player.id === me)?.total ?? 0 })}</p>
                {isHost ? (
                  <button className="primary" onClick={() => void run(() => api.nextRound(code))}>{t('nextRound')}</button>
                ) : (
                  host && <p className="muted">{t('waitingNext', { name: host.name })}</p>
                )}
              </section>
            )}
          </>
        )
      )}

      {closed && lastLocked && (
        <section className="card">
          <h2>{t('results')} · {t('roundN', { n: lastLocked.number })} ({lastLocked.letter})</h2>
          <Results state={state} round={lastLocked} canVote={false} onVote={() => undefined} />
        </section>
      )}

      <PlayersPanel players={players} me={me} round={closed ? undefined : round} />

      <section className="card">
        <h2>{t('leaderboard')}</h2>
        <ol className={g.board2}>
          {ranking.map((r) => (
            <li key={r.player.id}>
              <span>{r.player.name}</span>
              <strong>{t('pts', { n: r.total })}</strong>
            </li>
          ))}
        </ol>
        <h2>{t('previousLetters')}</h2>
        <div className={g.strip}>
          {ALPHABET.map((l) => (
            <span key={l} className={session.used_letters.includes(l) ? g.used : ''}>{l}</span>
          ))}
        </div>
      </section>
    </>
  )
}
