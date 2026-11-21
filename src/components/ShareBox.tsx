import { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { useI18n } from '../i18n'
import s from './ui.module.css'

export function inviteLink(code: string) {
  return `${location.origin}${import.meta.env.BASE_URL}?session=${code}`
}

export default function ShareBox({ code }: { code: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const link = inviteLink(code)
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(link)
    qr.make()
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true })
  }, [link])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={s.row}>
      <div className={s.qr} role="img" aria-label={t('scanQr')} dangerouslySetInnerHTML={{ __html: svg }} />
      <div className={`${s.col} ${s.grow}`}>
        <div className={s.code}>{code}</div>
        <div className={s.link}>{link}</div>
        <div>
          <button type="button" onClick={copy}>
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>
    </div>
  )
}
