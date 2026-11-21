import { Link, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import { LANGS } from '../i18n/dict'
import styles from './Layout.module.css'

export default function Layout() {
  const { t, lang, setLang } = useI18n()

  return (
    <div className={styles.shell}>
      <div className={styles.strip} aria-hidden="true" />
      <header className={styles.bar}>
        <Link to="/" className={styles.logo} aria-label={t('appName')}>
          BAS<span>T</span>A
        </Link>
        <nav className={styles.nav} aria-label={t('language')}>
          <Link to="/rules">{t('rules')}</Link>
          <div className={styles.langs} role="group" aria-label={t('language')}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={l.id === lang ? styles.active : undefined}
                aria-pressed={l.id === lang}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </nav>
      </header>
      <main className={styles.page}>
        <Outlet />
      </main>
      <footer className={styles.footer}>v{__APP_VERSION__}</footer>
    </div>
  )
}
