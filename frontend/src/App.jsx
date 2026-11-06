import { useEffect, useState } from 'react'
import Nav from './components/Nav.jsx'
import CenterDetails from './pages/CenterDetails.jsx'
import EventDetails from './pages/EventDetails.jsx'
import Home from './pages/Home.jsx'
import Info from './pages/Info.jsx'
import Offers from './pages/Offers.jsx'
import { getCenters, getEvents } from './lib/api.js'
import { useAsync } from './lib/useAsync.js'
import { useDonorStore } from './lib/useDonorStore.js'
import { useMatrix } from './lib/useMatrix.js'

// Hash-роутинг: #/home, #/info, #/offers, #/centers/:id, #/events/:id.
// Работает на GitHub Pages без настройки сервера.
function parseHash() {
  const [page = 'home', id] = window.location.hash.replace(/^#\/?/, '').split('/')
  if (['home', 'info', 'offers'].includes(page)) return { page }
  if ((page === 'centers' || page === 'events') && id) return { page, id }
  return { page: 'home' }
}

function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useRoute()
  const store = useDonorStore()
  const matrix = useMatrix()
  // мероприятия и центры нужны на нескольких экранах — грузим один раз
  const events = useAsync(getEvents)
  const centers = useAsync(getCenters)

  const navCurrent = route.page === 'centers' || route.page === 'events' ? 'offers' : route.page

  return (
    <div className="app">
      <Nav current={navCurrent} />
      <main className="main">
        {route.page === 'home' && <Home store={store} matrix={matrix} events={events} />}
        {route.page === 'info' && <Info />}
        {route.page === 'offers' && <Offers events={events} centers={centers} />}
        {route.page === 'centers' && <CenterDetails id={route.id} events={events} />}
        {route.page === 'events' && <EventDetails id={route.id} centers={centers} />}
      </main>
    </div>
  )
}
