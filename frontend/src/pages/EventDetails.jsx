import Icon from '../components/Icon.jsx'
import { ErrorState, Loading } from '../components/Status.jsx'
import { getEvent } from '../lib/api.js'
import { eventWhen, isUpcoming } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'

export default function EventDetails({ id, centers }) {
  const ev = useAsync(() => getEvent(id), [id])
  const center = ev.data && (centers.data ?? []).find((c) => c.id === ev.data.center_id)

  return (
    <div className="page details">
      <a className="back-link" href="#/offers">
        <Icon name="chevron" size={20} className="rot-90" /> Предложения
      </a>

      {ev.status === 'loading' && <Loading />}
      {ev.status === 'error' && (
        <ErrorState error={ev.error} onRetry={ev.error?.kind === 'not_found' ? null : ev.reload} />
      )}

      {ev.status === 'ok' && (
        <>
          <header className="page-head">
            <h1>{ev.data.title}</h1>
            {!isUpcoming(ev.data) && <span className="tag tag--muted">Мероприятие уже прошло</span>}
          </header>

          <div className="card details__card">
            <ul className="meta">
              <li><Icon name="clock" size={20} />{eventWhen(ev.data, true)}</li>
              {center && (
                <li>
                  <Icon name="pin" size={20} />
                  <span>
                    <a href={`#/centers/${center.id}`} className="underline">{center.name}</a>, {center.address}
                  </span>
                </li>
              )}
            </ul>
            {ev.data.description && <p className="details__text">{ev.data.description}</p>}
            {ev.data.signup_url && (
              <a className="btn btn--primary btn--big" href={ev.data.signup_url} target="_blank" rel="noopener noreferrer">
                Записаться на сайте <Icon name="arrow" size={18} strokeWidth={2.4} />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}
