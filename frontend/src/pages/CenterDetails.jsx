import Icon from '../components/Icon.jsx'
import { Empty, ErrorState, Loading } from '../components/Status.jsx'
import { getCenter } from '../lib/api.js'
import { eventWhen, isUpcoming } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'

export default function CenterDetails({ id, events }) {
  const center = useAsync(() => getCenter(id), [id])
  const here = (events.data ?? []).filter((e) => String(e.center_id) === String(id) && isUpcoming(e))

  return (
    <div className="page details">
      <a className="back-link" href="#/offers">
        <Icon name="chevron" size={20} className="rot-90" /> Предложения
      </a>

      {center.status === 'loading' && <Loading />}
      {center.status === 'error' && (
        <ErrorState error={center.error} onRetry={center.error?.kind === 'not_found' ? null : center.reload} />
      )}

      {center.status === 'ok' && (
        <>
          <header className="page-head">
            <h1>{center.data.name}</h1>
          </header>

          <div className="card details__card">
            <ul className="meta">
              <li><Icon name="pin" size={20} />{center.data.city}, {center.data.address}</li>
            </ul>
            {center.data.website_url && (
              <a className="btn btn--outline" href={center.data.website_url} target="_blank" rel="noopener noreferrer">
                Сайт центра <Icon name="arrow" size={18} strokeWidth={2.4} />
              </a>
            )}
          </div>

          <section>
            <h2>Мероприятия в этом центре</h2>
            {events.status === 'loading' && <Loading />}
            {events.status === 'error' && <ErrorState error={events.error} onRetry={events.reload} />}
            {events.status === 'ok' && here.length === 0 && <Empty text="Ближайших мероприятий нет." />}
            <div className="notif-list">
              {here.map((e) => (
                <a key={e.id} className="card notif" href={`#/events/${e.id}`}>
                  <span className="notif__icon"><Icon name="calendar" /></span>
                  <div className="notif__body">
                    <h3>{e.title}</h3>
                    <p>{eventWhen(e)}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
