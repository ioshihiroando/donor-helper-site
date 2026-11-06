import { errorText } from '../lib/api.js'

// Общие заглушки состояний загрузки/ошибки/пустого ответа
export function Loading({ text = 'Загружаем…' }) {
  return <p className="state muted" role="status">{text}</p>
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <p>{errorText(error)}</p>
      {onRetry && <button className="link-btn" onClick={onRetry}>Повторить</button>}
    </div>
  )
}

export function Empty({ text }) {
  return <p className="state muted">{text}</p>
}
