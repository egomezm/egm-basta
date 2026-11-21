import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { isConfigured } from '../api/client'
import { getName, setName } from '../lib/identity'
import s from '../components/ui.module.css'

export default function Landing() {
  const { t } = useI18n()
  const nav = useNavigate()
  const [name, setNameState] = useState(getName)
  const [code, setCode] = useState('')

  const onName = (v: string) => {
    setNameState(v)
    setName(v)
  }

  return (
    <>
      <section className="card">
        <h1>{t('appName')}</h1>
        <p>{t('tagline')}</p>
        {!isConfigured && <p className="error">{t('notConfigured')}</p>}
        <div className={s.field}>
          <label htmlFor="pname">{t('yourName')}</label>
          <input id="pname" value={name} maxLength={30} onChange={(e) => onName(e.target.value)} />
          <span className="muted">{t('yourNameHint')}</span>
        </div>
        <p>
          <button className="primary" onClick={() => nav('/new')} disabled={!isConfigured || !name.trim()}>
            {t('newSession')}
          </button>
        </p>
      </section>
      <section className="card">
        <h2>{t('joinSession')}</h2>
        <form
          className={s.row}
          onSubmit={(e) => {
            e.preventDefault()
            if (code) nav(`/join/${code}`)
          }}
        >
          <input
            aria-label={t('codeLabel')}
            value={code}
            maxLength={10}
            autoCapitalize="characters"
            placeholder="ABC123"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button type="submit" disabled={!code || !isConfigured}>
            {t('joinBtn')}
          </button>
        </form>
        <p>
          <Link to="/rules">{t('rules')}</Link>
        </p>
      </section>
    </>
  )
}
