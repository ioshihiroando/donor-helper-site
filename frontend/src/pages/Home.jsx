import { useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import InstallBanner from '../components/InstallBanner.jsx'
import Sheet from '../components/Sheet.jsx'
import { dateLong, days, num } from '../lib/format.js'
import { buildNotifications } from '../lib/notifications.js'
import { DONATION_TYPE_CODES, FALLBACK_TYPE_NAMES, nextAllowed, toISO, typeName } from '../lib/rules.js'

export default function Home({ store, matrix, events }) {
  const { donations, totalVolume, addDonation, updateDonation, removeDonation, nextType, setNextType, readIds, markRead } = store
  const [sheet, setSheet] = useState(null) // null | 'form' | 'done' | 'history'
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(null) // запись, которую редактируем, или null
  const notifRef = useRef(null)

  const donationTypes = matrix.data?.donation_types ?? DONATION_TYPE_CODES.map((code) => ({ code, name: FALLBACK_TYPE_NAMES[code] }))
  // вид следующей донации выбирает пользователь; если такого кода нет в матрице — цельная кровь
  const target = donationTypes.some((t) => t.code === nextType) ? nextType : 'whole_blood'
  const next = nextAllowed(donations, matrix.data, target)

  const notifications = useMemo(
    () => buildNotifications({ donations, next, events: events.data }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [donations, matrix.data, events.data],
  )
  const unread = notifications.filter((n) => !readIds.includes(n.id))

  const openBell = () => {
    notifRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    markRead(notifications.map((n) => n.id))
  }

  const openNew = () => {
    setEditing(null)
    setSheet('form')
  }

  const openEdit = (donation) => {
    setEditing(donation)
    setSheet('form')
  }

  const onSave = (values) => {
    if (editing) {
      updateDonation(editing.id, values)
      setEditing(null)
      setSheet('history') // после правки возвращаемся к списку
      return
    }
    setSaved(addDonation(values))
    setSheet('done')
  }

  const closeForm = () => {
    const wasEditing = Boolean(editing)
    setEditing(null)
    setSheet(wasEditing ? 'history' : null)
  }

  return (
    <div className="page home">
      <header className="page-head page-head--row">
        <div>
          <p className="eyebrow mobile-only">Донор-помощник</p>
          <h1>Привет!</h1>
        </div>
        <button className="icon-btn bell" onClick={openBell} aria-label={`Уведомления: ${unread.length} новых`}>
          <Icon name="bell" />
          {unread.length > 0 && <span className="badge">{unread.length}</span>}
        </button>
      </header>

      <InstallBanner />

      <div className="home-grid">
        <div className="home-left">
          <NextCard
            next={next}
            matrix={matrix}
            hasDonations={donations.length > 0}
            onRecord={openNew}
            picker={<TargetPicker types={donationTypes} value={target} onChange={setNextType} />}
          />

          <div className="counters">
            <button className="card counter" onClick={() => setSheet('history')} disabled={!donations.length}>
              <span className="counter__label">Мои сдачи</span>
              <span className="counter__value">{donations.length}</span>
            </button>
            <div className="card counter">
              <span className="counter__label">Сдано всего</span>
              <span className="counter__value">{num(totalVolume)} мл</span>
            </div>
          </div>

          <button className="btn btn--primary btn--big" onClick={openNew}>
            <Icon name="plus" size={20} strokeWidth={2.4} />
            Записать сдачу
          </button>
        </div>

        <section className="notifications" ref={notifRef}>
          <h2>Уведомления</h2>
          <div className="notif-list">
            {notifications.map((n) => (
              <Notification key={n.id} n={n} unread={!readIds.includes(n.id)} />
            ))}
          </div>
        </section>
      </div>

      <Sheet open={sheet === 'form'} onClose={closeForm} title={editing ? 'Изменить запись' : 'Записать сдачу'}>
        <DonationForm key={editing?.id ?? 'new'} types={donationTypes} initial={editing} onSubmit={onSave} />
      </Sheet>

      <Sheet open={sheet === 'done'} onClose={() => setSheet(null)}>
        {saved && <Done saved={saved} next={next} target={target} types={donationTypes} onClose={() => setSheet(null)} />}
      </Sheet>

      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title="Мои сдачи">
        <History donations={donations} types={donationTypes} onEdit={openEdit} onRemove={removeDonation} />
      </Sheet>
    </div>
  )
}

function NextCard({ next, matrix, hasDonations, onRecord, picker }) {
  if (!hasDonations) {
    return (
      <section className="next-card">
        <p className="next-card__label">До следующей сдачи</p>
        <p className="next-card__empty">Запишите свою сдачу — и мы посчитаем, когда ориентировочно можно прийти снова.</p>
        <button className="link-btn" onClick={onRecord}>Записать первую сдачу</button>
      </section>
    )
  }

  if (next?.unavailable) {
    const loading = matrix.status === 'loading'
    return (
      <section className="next-card" aria-live="polite">
        <p className="next-card__label">До следующей сдачи</p>
        {picker}
        <p className="next-card__empty">
          {loading ? 'Загружаем правила интервалов…' : 'Расчёт временно недоступен: не удалось загрузить правила интервалов с сервера.'}
        </p>
        {!loading && <button className="link-btn" onClick={matrix.reload}>Повторить</button>}
      </section>
    )
  }

  return (
    <section className="next-card" aria-live="polite">
      <NextBody next={next} picker={picker} />
      <Progress next={next} />
      <RulesNote matrix={matrix} next={next} />
    </section>
  )
}

function NextBody({ next, picker, caption = 'До следующей сдачи' }) {
  const ready = next.daysLeft === 0
  return (
    <>
      <p className="next-card__label">{caption}</p>
      {picker}
      {ready ? (
        <p className="next-card__ready">Можно сдавать</p>
      ) : (
        <p className="next-card__big">
          <span className="next-card__num">{next.daysLeft}</span>
          <span className="next-card__unit">{days(next.daysLeft)}</span>
        </p>
      )}
      <p className="next-card__date">
        {ready ? 'Минимальный интервал прошёл' : `Ориентировочно с ${dateLong(next.date)}`}
      </p>
    </>
  )
}

// BUG-2: пользователь выбирает, что планирует сдавать в следующий раз
function TargetPicker({ types, value, onChange }) {
  return (
    <label className="target">
      <span className="target__label">Что планируете сдавать</span>
      <select className="target__select" value={value} onChange={(e) => onChange(e.target.value)}>
        {types.map((t) => (
          <option key={t.code} value={t.code}>{t.name}</option>
        ))}
      </select>
    </label>
  )
}

function Progress({ next }) {
  const p = Math.min(1, Math.max(0, (next.total - next.daysLeft) / next.total))
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <div className="progress__bar" style={{ width: `${p * 100}%` }} />
    </div>
  )
}

function RulesNote({ matrix, next }) {
  const m = matrix.data
  return (
    <div className="next-card__note">
      {next.afterValidTo && <p>Правила могут измениться после {dateLong(m.valid_to)} — проверьте дату ближе к сдаче.</p>}
      {matrix.status === 'stale' && <p>Нет связи с сервером: используются правила, загруженные ранее.</p>}
      <p>
        Расчёт по правилам, действующим с {dateLong(m.valid_from)}
        {m.source_url && (
          <>
            {' · '}
            <a href={m.source_url} target="_blank" rel="noopener noreferrer">источник</a>
          </>
        )}
        . Допуск к донации определяет врач.
      </p>
    </div>
  )
}

function DonationForm({ types, initial, onSubmit }) {
  const today = toISO(new Date())
  const [date, setDate] = useState(initial?.date ?? today)
  const [type, setType] = useState(initial?.type ?? 'whole_blood')
  const [volume, setVolume] = useState(initial ? String(initial.volume || '') : '450')
  const [error, setError] = useState('')

  const pickType = (code) => {
    setType(code)
    setVolume(code === 'whole_blood' ? '450' : '') // объём компонентов — по справке
    setError('')
  }

  const submit = (e) => {
    e.preventDefault()
    if (!date) return setError('Укажите дату сдачи')
    if (date > today) return setError('Дата сдачи не может быть в будущем')
    const v = Number(volume)
    if (!v || v < 1 || v > 1000) return setError('Укажите объём от 1 до 1000 мл')
    onSubmit({ date, type, volume: v })
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field__label">Дата сдачи</span>
        <input type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value); setError('') }} required />
      </label>

      <fieldset className="field">
        <legend className="field__label">Что сдавали</legend>
        <div className="chips">
          {types.map((t) => (
            <button
              type="button"
              key={t.code}
              className={'chip' + (type === t.code ? ' is-active' : '')}
              aria-pressed={type === t.code}
              onClick={() => pickType(t.code)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field__label">Сколько сдано, мл</span>
        <span className="input-suffix">
          <input type="number" inputMode="numeric" min="1" max="1000" value={volume} onChange={(e) => { setVolume(e.target.value); setError('') }} />
          <span>мл</span>
        </span>
        <span className="field__hint">Объём указан в справке центра крови.</span>
      </label>

      {error && <p className="form__error" role="alert">{error}</p>}

      <button className="btn btn--primary btn--big" type="submit">{initial ? 'Сохранить изменения' : 'Сохранить'}</button>
      <p className="form__privacy">Данные хранятся только на этом устройстве и никуда не отправляются.</p>
    </form>
  )
}

function Done({ saved, next, target, types, onClose }) {
  return (
    <div className="done">
      <div className="done__check">
        <Icon name="check" size={36} strokeWidth={2.4} />
      </div>
      <h2>Сдача записана</h2>
      <p className="done__meta">
        {dateLong(saved.date)} · {typeName(saved.type, types)}{saved.volume ? ` · ${saved.volume} мл` : ''}
      </p>
      {next && !next.unavailable && (
        <div className="next-card next-card--center">
          <NextBody next={next} caption={`До следующей сдачи: ${typeName(target, types).toLowerCase()}`} />
        </div>
      )}
      <button className="btn btn--primary btn--big" onClick={onClose}>На главную</button>
    </div>
  )
}

function History({ donations, types, onEdit, onRemove }) {
  if (!donations.length) return <p className="muted">Пока нет записей.</p>
  return (
    <ul className="history">
      {donations.map((d) => (
        <li key={d.id} className="history__item">
          <div>
            <p className="history__date">{dateLong(d.date)}</p>
            <p className="muted">{typeName(d.type, types)}{d.volume ? ` · ${d.volume} мл` : ''}</p>
          </div>
          <div className="history__actions">
            <button className="icon-btn icon-btn--soft" aria-label={`Изменить запись от ${dateLong(d.date)}`} onClick={() => onEdit(d)}>
              <Icon name="edit" size={20} />
            </button>
            <button
              className="icon-btn icon-btn--soft"
              aria-label={`Удалить запись от ${dateLong(d.date)}`}
              onClick={() => window.confirm('Удалить эту запись?') && onRemove(d.id)}
            >
              <Icon name="trash" size={20} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

const NOTIF_ICON = { event: 'calendar', saved: 'check', prepare: 'drop', ready: 'drop' }

function Notification({ n, unread }) {
  const accent = n.kind === 'event' || n.kind === 'ready'
  const Tag = n.href ? 'a' : 'article'
  return (
    <Tag className={'card notif' + (accent ? ' notif--accent' : '')} href={n.href}>
      <span className={'notif__icon' + (accent ? ' is-accent' : '')}>
        <Icon name={NOTIF_ICON[n.kind]} />
      </span>
      <div className="notif__body">
        <h3>{n.title}</h3>
        <p>{n.text}</p>
        {n.when && <time>{n.when}</time>}
      </div>
      {unread && <span className="notif__dot" aria-label="новое" />}
    </Tag>
  )
}
