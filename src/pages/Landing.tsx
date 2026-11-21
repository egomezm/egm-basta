import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function Landing() {
  const { t } = useI18n()
  return (
    <section className="card">
      <h1>{t('appName')}</h1>
      <p>{t('tagline')}</p>
      <p>
        <Link to="/rules">{t('rules')}</Link>
      </p>
    </section>
  )
}
