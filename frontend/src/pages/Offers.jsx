import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fetchCenters } from '../lib/api.js'
import { dateLong } from '../lib/format.js'
import { toISO, typeLabel } from '../lib/rules.js'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'university', label: 'В вузах' },
  { id: 'promo', label: 'Акции' },
]

export default function Offers({ events }) {
  const [filter, setFilter] = useState('all')
  const [centers, setCenters] = useState({ items: [], loading: true })

  useEffect(() => {
    fetchCenters().then((r) => setCenters({ ...r, loading: false }))
  }, [])

  const today = toISO(new Date())
  const list = events.items
    .filter((e) => !e.date || e.date >= today)
    .filter((e) => filter === 'all' || e.category === filter)
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))

  return (
    <div className="page offers">
      <header className="page-head">
        <h1>Предложения</h1>
        <p className="muted">Где и когда сдать кровь в Москве</p>
      </header>

      {(events.demo || centers.demo) && !events.loading && (
        <p className="notice">Демо-данные: бэкенд не подключён{events.error || centers.error ? ' или недоступен' : ''}.</p>
      )}

      <div className="chips" role="tablist" aria-label="Фильтр">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={'chip chip--pill' + (filter === f.id ? ' is-active' : '')}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.loading ? (
        <p className="muted">Загружаем мероприятия…</p>
      ) : list.length === 0 ? (
        <p className="muted">Ближайших мероприятий нет.</p>
      ) : (
        <div className="offer-grid">
          {list.map((e) => (
            <article key={e.id} className="card offer">
              <div className="offer__top">
                <span className="tag">{e.category === 'promo' && e.donationType === 'blood' ? 'Акция' : typeLabel(e.donationType)}</span>
                <span className="offer__date">{e.dateLabel ?? (e.date ? dateLong(e.date, false) : '')}</span>
              </div>
              <h3>{e.title}</h3>
              <ul className="meta">
                {e.address && <li><Icon name="pin" size={20} />{e.address}</li>}
                {e.time && <li><Icon name="clock" size={20} />{e.time}</li>}
                {e.note && <li><Icon name="drop" size={20} />{e.note}</li>}
              </ul>
              {e.url ? (
                <a className="btn btn--outline" href={e.url} target="_blank" rel="noopener noreferrer">
                  Записаться на сайте <Icon name="arrow" size={18} strokeWidth={2.4} />
                </a>
              ) : (
                <span className="btn btn--outline is-disabled" aria-disabled="true">Ссылка на запись скоро появится</span>
              )}
            </article>
          ))}
        </div>
      )}

      <section>
        <h2>Центры крови</h2>
        <div className="card centers">
          <div className="centers__head desktop-only">
            <span>Название</span>
            <span>Адрес</span>
            <span>Часы работы</span>
            <span />
          </div>
          {centers.items.map((c) => (
            <div key={c.id} className="centers__row">
              <span className="centers__name">{c.name}</span>
              <span className="centers__addr">{c.address}</span>
              <span className="centers__hours muted">{c.hours}</span>
              {c.url ? (
                <a className="icon-btn icon-btn--soft" href={c.url} target="_blank" rel="noopener noreferrer" aria-label={`Сайт: ${c.name}`}>
                  <Icon name="arrow" size={22} />
                </a>
              ) : (
                <a
                  className="icon-btn icon-btn--soft"
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent('Москва, ' + c.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`На карте: ${c.name}`}
                >
                  <Icon name="arrow" size={22} />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
