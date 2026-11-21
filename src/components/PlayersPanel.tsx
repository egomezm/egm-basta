import { useI18n } from '../i18n'
import type { Player, Round } from '../api/basta'
import g from './Game.module.css'

export default function PlayersPanel({ players, me, round }: { players: Player[]; me: string; round: Round | undefined }) {
  const { t } = useI18n()
  return (
    <section className="card">
      <h2>{t('playersCount', { n: players.length })}</h2>
      <ul className={g.players}>
        {players.map((p) => (
          <li key={p.id} className={p.connected ? '' : g.away}>
            {p.name}
            {p.id === me && <span className={g.tag}>{t('you')}</span>}
            {p.is_creator && <span className={g.tag}>{t('hostTag')}</span>}
            {!p.connected && <span className={g.tag}>{t('away')}</span>}
            {round?.status === 'picking' && p.id === round.spinner_id && <span className={g.tag}>A…</span>}
            {round?.status === 'picking' && p.id === round.stopper_id && <span className={g.tag}>Para</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
