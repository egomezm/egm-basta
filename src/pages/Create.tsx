import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/dict'
import { errorKey } from '../api/client'
import { createSession, type Settings } from '../api/basta'
import { getName } from '../lib/identity'
import s from '../components/ui.module.css'

const QUICK: Key[] = ['catName', 'catLastName', 'catPlace', 'catAnimal', 'catFruit', 'catColor', 'catThing']
const DEFAULTS: Key[] = ['catName', 'catPlace', 'catAnimal', 'catFruit', 'catColor']

export default function Create() {
  const { t } = useI18n()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [cats, setCats] = useState<string[]>(() => DEFAULTS.map((k) => t(k)))
  const [draft, setDraft] = useState('')
  const [settings, setSettings] = useState<Settings>({ basta_seconds: 10, pts_unique: 100, pts_shared: 50 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = (c: string) => {
    const v = c.trim()
    if (v && !cats.includes(v) && cats.length < 20) setCats([...cats, v])
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= cats.length) return
    const next = [...cats]
    ;[next[i], next[j]] = [next[j], next[i]]
    setCats(next)
  }
  const num = (k: keyof Settings, v: string) => setSettings({ ...settings, [k]: Number(v) || 0 })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cats.length) return
    setBusy(true)
    setError('')
    try {
      const code = await createSession(getName().trim(), name.trim() || t('appName'), cats, settings)
      nav(`/s/${code}`, { replace: true })
    } catch (err) {
      setError(t(errorKey(err)))
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>{t('createTitle')}</h1>
      <div className={s.col}>
        <div className={s.field}>
          <label htmlFor="sname">{t('sessionName')}</label>
          <input id="sname" value={name} maxLength={40} placeholder={t('sessionNamePh')} onChange={(e) => setName(e.target.value)} />
        </div>

        <h2>{t('categories')}</h2>
        <ul className={s.catList}>
          {cats.map((c, i) => (
            <li key={i}>
              <input
                className={s.grow}
                aria-label={t('categories')}
                value={c}
                maxLength={40}
                onChange={(e) => setCats(cats.map((x, k) => (k === i ? e.target.value : x)))}
              />
              <button type="button" className={s.small} aria-label={t('moveUp')} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className={s.small} aria-label={t('moveDown')} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className={s.small} aria-label={t('removeItem')} onClick={() => setCats(cats.filter((_, k) => k !== i))}>✕</button>
            </li>
          ))}
        </ul>
        <div className={s.row}>
          <input
            className={s.grow}
            value={draft}
            maxLength={40}
            placeholder={t('categoryPh')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add(draft)
                setDraft('')
              }
            }}
          />
          <button type="button" onClick={() => { add(draft); setDraft('') }}>{t('addCategory')}</button>
        </div>
        <div className={s.chips} aria-label={t('quickAdd')}>
          {QUICK.map((k) => (
            <button type="button" key={k} onClick={() => add(t(k))}>+ {t(k)}</button>
          ))}
        </div>
        {!cats.length && <p className="error">{t('needCategory')}</p>}

        <h2>{t('settings')}</h2>
        <div className={s.field}>
          <label htmlFor="secs">{t('bastaSeconds')}</label>
          <input id="secs" type="number" min={3} max={60} value={settings.basta_seconds} onChange={(e) => num('basta_seconds', e.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="pu">{t('ptsUnique')}</label>
          <input id="pu" type="number" min={0} max={1000} value={settings.pts_unique} onChange={(e) => num('pts_unique', e.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="ps">{t('ptsShared')}</label>
          <input id="ps" type="number" min={0} max={1000} value={settings.pts_shared} onChange={(e) => num('pts_shared', e.target.value)} />
        </div>
        <p className="muted">{t('ptsInvalid')}</p>

        {error && <p className="error" role="alert">{error}</p>}
        <div className={s.row}>
          <button type="button" onClick={() => nav('/')}>{t('back')}</button>
          <button className="primary" type="submit" disabled={busy || !cats.length}>
            {busy ? t('creating') : t('startGame')}
          </button>
        </div>
      </div>
    </form>
  )
}
