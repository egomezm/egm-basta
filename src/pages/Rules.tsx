import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/dict'

const SECTIONS: [Key, Key][] = [
  ['rGoalH', 'rGoalP'],
  ['rRoundH', 'rRoundP'],
  ['rLetterH', 'rLetterP'],
  ['rBastaH', 'rBastaP'],
  ['rScoreH', 'rScoreP'],
  ['rChallengeH', 'rChallengeP'],
  ['rTurnsH', 'rTurnsP'],
  ['rEndH', 'rEndP'],
]

export default function Rules() {
  const { t } = useI18n()
  return (
    <article className="card">
      <h1>{t('rulesTitle')}</h1>
      {SECTIONS.map(([h, p]) => (
        <section key={h}>
          <h2>{t(h)}</h2>
          <p>{t(p)}</p>
        </section>
      ))}
      <p>
        <Link to="/">{t('backHome')}</Link>
      </p>
    </article>
  )
}
