import { useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { DEMO_CITY_STATS, features } from '../config.js'
import { dateLong, days, num } from '../lib/format.js'
import { buildNotifications } from '../lib/notifications.js'
import { DONATION_TYPES, nextAllowed, toISO, typeLabel } from '../lib/rules.js'

export default function Home({ store, events }) {
  const { donations, totalVolume, addDonation, removeDonation, readIds, markRead } = store
  const [sheet, setSheet] = useState(null) // null | 'form' | 'done' | 'history'
  const [saved, setSaved] = useState(null)
  const notifRef = useRef(null)

  const next = nextAllowed(donations, 'blood')
  const nextPlasma = nextAllowed(donations, 'plasma')

  const notifications = useMemo(
    () => buildNotifications({ donations, next, events }),
    // next пересчитывается из donations
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [donations, events],
  )
  const unread = notifications.filter((n) => !readIds.includes(n.id))

  const openBell = () => {
    notifRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    markRead(notifications.map((n) => n.id))
  }

  const onSave = (values) => {
    const item = addDonation(values)
    setSaved(item)
    setSheet('done')
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

      <div className="home-grid">
        <div className="home-left">
          <NextCard next={next} nextPlasma={nextPlasma} onRecord={() => setSheet('form')} />

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

          <button className="btn btn--primary btn--big" onClick={() => setSheet('form')}>
            <Icon name="plus" size={20} strokeWidth={2.4} />
            Записать сдачу
          </button>
        </div>

        {features.cityStats && <CityStats stats={DEMO_CITY_STATS} />}

        <section className="notifications" ref={notifRef}>
          <h2>Уведомления</h2>
          <div className="notif-list">
            {notifications.map((n) => (
              <Notification key={n.id} n={n} unread={!readIds.includes(n.id)} />
            ))}
          </div>
        </section>
      </div>

      <Sheet open={sheet === 'form'} onClose={() => setSheet(null)} title="Записать сдачу">
        <DonationForm onSubmit={onSave} />
      </Sheet>

      <Sheet open={sheet === 'done'} onClose={() => setSheet(null)}>
        {saved && <Done saved={saved} next={next} onClose={() => setSheet(null)} />}
      </Sheet>

      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title="Мои сдачи">
        <History donations={donations} onRemove={removeDonation} />
      </Sheet>
    </div>
  )
}

function NextCard({ next, nextPlasma, onRecord }) {
  if (!next) {
    return (
      <section className="next-card">
        <p className="next-card__label">До следующей сдачи</p>
        <p className="next-card__empty">Запишите свою сдачу — и мы посчитаем, когда можно прийти снова.</p>
        <button className="link-btn" onClick={onRecord}>Записать первую сдачу</button>
      </section>
    )
  }
  const ready = next.daysLeft === 0
  const progress = Math.min(1, Math.max(0, (next.total - next.daysLeft) / next.total))
  return (
    <section className="next-card" aria-live="polite">
      <p className="next-card__label">До следующей сдачи</p>
      {ready ? (
        <p className="next-card__ready">Можно сдавать</p>
      ) : (
        <p className="next-card__big">
          <span className="next-card__num">{next.daysLeft}</span>
          <span className="next-card__unit">{days(next.daysLeft)}</span>
        </p>
      )}
      <p className="next-card__date">
        {ready ? 'Цельную кровь — уже сейчас' : `Можно сдавать с ${dateLong(next.date)}`}
      </p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="progress__bar" style={{ width: `${progress * 100}%` }} />
      </div>
      {nextPlasma && nextPlasma.date !== next.date && (
        <p className="next-card__hint">
          Плазму — {nextPlasma.daysLeft === 0 ? 'уже можно' : `с ${dateLong(nextPlasma.date, false)}`}
        </p>
      )}
    </section>
  )
}

function DonationForm({ onSubmit }) {
  const today = toISO(new Date())
  const [date, setDate] = useState(today)
  const [type, setType] = useState('blood')
  const [volume, setVolume] = useState('450')
  const [error, setError] = useState('')

  const pickType = (id) => {
    setType(id)
    const def = DONATION_TYPES.find((t) => t.id === id)?.defaultVolume
    setVolume(def ? String(def) : '')
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
          {DONATION_TYPES.map((t) => (
            <button
              type="button"
              key={t.id}
              className={'chip' + (type === t.id ? ' is-active' : '')}
              aria-pressed={type === t.id}
              onClick={() => pickType(t.id)}
            >
              {t.label}
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

      <button className="btn btn--primary btn--big" type="submit">Сохранить</button>
      <p className="form__privacy">Данные хранятся только на этом устройстве и никуда не отправляются.</p>
    </form>
  )
}

function Done({ saved, next, onClose }) {
  return (
    <div className="done">
      <div className="done__check">
        <Icon name="check" size={36} strokeWidth={2.4} />
      </div>
      <h2>Сдача записана</h2>
      <p className="done__meta">
        {dateLong(saved.date)} · {typeLabel(saved.type)}{saved.volume ? ` · ${saved.volume} мл` : ''}
      </p>
      {next && (
        <div className="next-card next-card--center">
          <p className="next-card__label">До следующей сдачи</p>
          {next.daysLeft === 0 ? (
            <p className="next-card__ready">Можно сдавать</p>
          ) : (
            <p className="next-card__big">
              <span className="next-card__num">{next.daysLeft}</span>
              <span className="next-card__unit">{days(next.daysLeft)}</span>
            </p>
          )}
          <p className="next-card__date">Можно сдавать с {dateLong(next.date)}</p>
        </div>
      )}
      <button className="btn btn--primary btn--big" onClick={onClose}>На главную</button>
    </div>
  )
}

function History({ donations, onRemove }) {
  if (!donations.length) return <p className="muted">Пока нет записей.</p>
  return (
    <ul className="history">
      {donations.map((d) => (
        <li key={d.id} className="history__item">
          <div>
            <p className="history__date">{dateLong(d.date)}</p>
            <p className="muted">{typeLabel(d.type)}{d.volume ? ` · ${d.volume} мл` : ''}</p>
          </div>
          <button
            className="icon-btn icon-btn--soft"
            aria-label={`Удалить запись от ${dateLong(d.date)}`}
            onClick={() => window.confirm('Удалить эту запись?') && onRemove(d.id)}
          >
            <Icon name="trash" size={20} />
          </button>
        </li>
      ))}
    </ul>
  )
}

const NOTIF_ICON = { event: 'calendar', saved: 'check', prepare: 'drop', ready: 'drop' }

function Notification({ n, unread }) {
  const accent = n.kind === 'event' || n.kind === 'ready'
  return (
    <article className={'card notif' + (accent ? ' notif--accent' : '')}>
      <span className={'notif__icon' + (accent ? ' is-accent' : '')}>
        <Icon name={NOTIF_ICON[n.kind]} />
      </span>
      <div className="notif__body">
        <h3>{n.title}</h3>
        <p>{n.text}</p>
        {n.when && <time>{n.when}</time>}
      </div>
      {unread && <span className="notif__dot" aria-label="новое" />}
    </article>
  )
}

function CityStats({ stats }) {
  const max = Math.max(...stats.months.map((m) => m.value))
  return (
    <section className="card city-stats">
      <h2>Статистика</h2>
      <p className="muted">Учащиеся Москвы</p>
      <div className="counters">
        <div className="counter counter--soft">
          <span className="counter__label">Сдач крови</span>
          <span className="counter__value accent">{num(stats.donations)}</span>
        </div>
        <div className="counter counter--soft">
          <span className="counter__label">Общий объём</span>
          <span className="counter__value accent">{num(stats.volume)} мл</span>
        </div>
      </div>
      <h3>Сдачи по месяцам</h3>
      <div className="bars">
        {stats.months.map((m, i) => (
          <div className="bars__col" key={m.label}>
            <span className="bars__val">{m.value}</span>
            <span className={'bars__bar' + (i === stats.months.length - 1 ? ' is-current' : '')} style={{ height: `${(m.value / max) * 100}%` }} />
            <span className="bars__label">{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
