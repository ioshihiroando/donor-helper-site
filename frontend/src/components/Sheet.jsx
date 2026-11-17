import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

// Нижняя шторка на телефоне, модальное окно по центру на десктопе.
export default function Sheet({ open, onClose, title, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" />
        {title && (
          <div className="sheet__head">
            <h2>{title}</h2>
            <button className="icon-btn icon-btn--soft" onClick={onClose} aria-label="Закрыть">
              <Icon name="close" size={20} strokeWidth={2.2} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
