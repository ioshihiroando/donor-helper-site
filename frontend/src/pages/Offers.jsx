import Icon from '../components/Icon.jsx'
import { Empty, ErrorState, Loading } from '../components/Status.jsx'
import { dateLong, eventWhen, isUpcoming, zonedDateIso } from '../lib/format.js'

export default function Offers({ events, centers }) {
  const centerById = new Map((centers.data ?? []).map((c) => [c.id, c]))
  const upcoming = (events.data ?? []).filter((e) => isUpcoming(e))

  return (
    <div className="page offers">
      <header className="page-head">
        <h1>Предложения</h1>
        <p className="muted">Где и когда сдать кровь в Москве</p>
      </header>

      <section>
        <h2>Мероприятия</h2>
        {events.status === 'loading' && <Loading text="Загружаем мероприятия…" />}
        {events.status === 'error' && <ErrorState error={events.error} onRetry={events.reload} />}
        {events.status === 'ok' && upcoming.length === 0 && <Empty text="Ближайших мероприятий нет." />}
        {upcoming.length > 0 && (
          <div className="offer-grid">
            {upcoming.map((e) => (
              <EventCard key={e.id} e={e} center={centerById.get(e.center_id)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Центры крови</h2>
        {centers.status === 'loading' && <Loading text="Загружаем центры…" />}
        {centers.status === 'error' && <ErrorState error={centers.error} onRetry={centers.reload} />}
        {centers.status === 'ok' && centers.data.length === 0 && <Empty text="Центры пока не добавлены." />}
        {centers.data?.length > 0 && (
          <div className="card centers">
            <div className="centers__head desktop-only">
              <span>Название</span>
              <span>Адрес</span>
              <span>Город</span>
              <span />
            </div>
            {centers.data.map((c) => (
              <a key={c.id} className="centers__row" href={`#/centers/${c.id}`}>
                <span className="centers__name">{c.name}</span>
                <span className="centers__addr">{c.address}</span>
                <span className="centers__hours muted">{c.city}</span>
                <span className="icon-btn icon-btn--soft" aria-hidden="true">
                  <Icon name="chevron" size={22} className="rot-270" />
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EventCard({ e, center }) {
  return (
    <article className="card offer">
      <div className="offer__top">
        <span className="tag">Мероприятие</span>
        <span className="offer__date">{dateLong(zonedDateIso(e.starts_at), false)}</span>
      </div>
      <h3>
        <a href={`#/events/${e.id}`} className="offer__title">{e.title}</a>
      </h3>
      <ul className="meta">
        <li><Icon name="clock" size={20} />{eventWhen(e)}</li>
        {center && <li><Icon name="pin" size={20} />{center.name}, {center.address}</li>}
      </ul>
      {e.description && <p className="offer__desc">{e.description}</p>}
      <div className="offer__actions">
        <a className="btn btn--outline" href={`#/events/${e.id}`}>Подробнее</a>
        {e.signup_url && (
          <a className="btn btn--primary" href={e.signup_url} target="_blank" rel="noopener noreferrer">
            Записаться <Icon name="arrow" size={18} strokeWidth={2.4} />
          </a>
        )}
      </div>
    </article>
  )
}
