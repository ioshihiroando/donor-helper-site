import { useInstallPrompt } from '../lib/pwa.js'
import Icon from './Icon.jsx'

export default function InstallBanner() {
  const pwa = useInstallPrompt()
  if (!pwa.mode) return null

  return (
    <aside className="install" aria-label="Установка приложения">
      <span className="install__icon">
        <Icon name="drop" />
      </span>
      <div className="install__body">
        <p className="install__title">Установите приложение</p>
        {pwa.mode === 'prompt' ? (
          <p className="install__text">Откроется с главного экрана и будет работать без интернета.</p>
        ) : (
          <p className="install__text">В Safari нажмите «Поделиться» → «На экран „Домой“».</p>
        )}
        <div className="install__actions">
          {pwa.mode === 'prompt' && (
            <button className="btn btn--primary install__btn" onClick={pwa.install}>Установить</button>
          )}
          <button className="link-btn" onClick={pwa.dismiss}>Не сейчас</button>
        </div>
      </div>
    </aside>
  )
}
