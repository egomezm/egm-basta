import { useI18n } from '../i18n'
import type { GameState, Round } from '../api/basta'
import { letterAt } from '../logic/letters'
import { useTicker } from '../session/useNow'
import g from './Game.module.css'

interface Props {
  state: GameState
  round: Round
  serverNow: () => number
  onStart: () => void
  onStop: () => void
}

export default function LetterBar({ state, round, serverNow, onStart, onStop }: Props) {
  const { t } = useI18n()
  const spinning = round.status === 'picking' && round.spin_started_at !== null
  useTicker(spinning, 40)

  const byId = (id: string | null) => state.players.find((p) => p.id === id)
  const me = byId(state.me)
  const spinner = byId(round.spinner_id)
  const stopper = byId(round.stopper_id)
  const isHost = me?.is_creator ?? false
  const canSpin = state.me === round.spinner_id || (isHost && !spinner?.connected)
  const canStop =
    state.me === round.stopper_id || (state.me === round.spinner_id && (!stopper || !stopper.connected))

  let letter = round.letter ?? '?'
  if (spinning) letter = letterAt(round.pool, serverNow() - (round.spin_started_at ?? 0))

  return (
    <section className={`card ${g.letterBar}`}>
      <h2>{t('roundN', { n: round.number })}</h2>
      <div className={`${g.letter} ${spinning ? g.rolling : ''}`} aria-live="polite" aria-label={t('letterLabel')}>
        {round.letter || spinning ? letter : '·'}
      </div>
      {round.status === 'picking' && !spinning && (
        <>
          {canSpin ? (
            <>
              <p>{t('youSpin')}</p>
              <button className={`primary ${g.big}`} onClick={onStart}>{t('spinBtn')}</button>
              <p className="muted">{t('spinHint')}</p>
            </>
          ) : (
            spinner && <p>{t('waitSpin', { name: spinner.name })}</p>
          )}
        </>
      )}
      {spinning && (
        <>
          {canStop ? (
            <>
              <p>{t('youStop')}</p>
              <button className={`primary ${g.big}`} onClick={onStop}>{t('stopBtn')}</button>
            </>
          ) : (
            <p>{stopper ? t('waitStop', { name: stopper.name }) : t('spinning')}</p>
          )}
        </>
      )}
    </section>
  )
}
