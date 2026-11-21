import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { errorKey } from '../api/client'
import { joinSession } from '../api/basta'
import { getName, setName } from '../lib/identity'
import s from '../components/ui.module.css'

export default function Join() {
  const { t } = useI18n()
  const nav = useNavigate()
  const params = useParams()
  const [code, setCode] = useState((params.code ?? '').toUpperCase())
  const [name, setNameState] = useState(getName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setName(name.trim())
      const c = await joinSession(code, name.trim())
      nav(`/s/${c}`, { replace: true })
    } catch (err) {
      setError(t(errorKey(err)))
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h1>{t('joinTitle')}</h1>
      <form className={s.col} onSubmit={submit}>
        <div className={s.field}>
          <label htmlFor="jcode">{t('codeLabel')}</label>
          <input
            id="jcode"
            value={code}
            maxLength={10}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="jname">{t('yourName')}</label>
          <input id="jname" value={name} maxLength={30} onChange={(e) => setNameState(e.target.value)} />
          <span className="muted">{t('yourNameHint')}</span>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className={s.row}>
          <button type="button" onClick={() => nav('/')}>{t('back')}</button>
          <button className="primary" type="submit" disabled={busy || !code || !name.trim()}>
            {busy ? t('joining') : t('joinBtn')}
          </button>
        </div>
      </form>
    </section>
  )
}
