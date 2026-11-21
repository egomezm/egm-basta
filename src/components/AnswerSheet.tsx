import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { DraftAnswer, GameState, Round } from '../api/basta'
import { loadDraft, saveDraft } from '../lib/identity'
import { startsWithLetter } from '../logic/normalize'
import { useTicker } from '../session/useNow'
import g from './Game.module.css'

interface Props {
  state: GameState
  round: Round
  serverNow: () => number
  onBasta: (a: DraftAnswer[]) => Promise<void>
  onSubmit: (a: DraftAnswer[]) => Promise<void>
}

const toAnswers = (v: string[]): DraftAnswer[] => v.map((text, idx) => ({ idx, text: text.trim() }))

export default function AnswerSheet({ state, round, serverNow, onBasta, onSubmit }: Props) {
  const { t } = useI18n()
  const { code, categories, settings } = state.session
  const [values, setValues] = useState<string[]>(() => {
    const d = loadDraft(code, round.id)
    return categories.map((_, i) => d[i] ?? '')
  })
  const sent = useRef(false)
  const counting = round.status === 'countdown'
  useTicker(counting, 100)

  const remaining = counting ? (round.basta_at ?? 0) + settings.basta_seconds * 1000 - serverNow() : null
  const over = remaining !== null && remaining <= 0
  const allFilled = values.every((v) => v.trim())

  useEffect(() => {
    if (over && !sent.current) {
      sent.current = true
      void onSubmit(toAnswers(values)).catch(() => undefined)
    }
  })

  const change = (i: number, v: string) => {
    const next = values.map((x, k) => (k === i ? v : x))
    setValues(next)
    saveDraft(code, round.id, next)
  }
  const bastaBy = state.players.find((p) => p.id === round.basta_by)

  return (
    <section className="card">
      {counting && (
        <div className={g.countdown} role="timer">
          {over ? t('locking') : `${t('bastaCall')} ${Math.max(1, Math.ceil((remaining ?? 0) / 1000))}`}
          {bastaBy && <div className="muted" style={{ fontSize: '0.9rem' }}>{t('bastaBy', { name: bastaBy.name })}</div>}
        </div>
      )}
      <form
        className={g.sheet}
        onSubmit={(e) => {
          e.preventDefault()
          if (allFilled && round.status === 'writing') void onBasta(toAnswers(values)).catch(() => undefined)
        }}
      >
        {categories.map((c, i) => (
          <div key={i}>
            <label htmlFor={`ans${i}`}>{c}</label>
            <input
              id={`ans${i}`}
              className="hand"
              value={values[i]}
              maxLength={60}
              disabled={over}
              autoComplete="off"
              onChange={(e) => change(i, e.target.value)}
            />
            {values[i].trim() && round.letter && !startsWithLetter(values[i], round.letter) && (
              <div className={g.hint}>{t('wrongLetter', { l: round.letter })}</div>
            )}
          </div>
        ))}
        {round.status === 'writing' && (
          <>
            <button className={`primary ${g.big}`} type="submit" disabled={!allFilled}>{t('bastaBtn')}</button>
            {!allFilled && <span className="muted">{t('fillAll')}</span>}
          </>
        )}
      </form>
    </section>
  )
}
