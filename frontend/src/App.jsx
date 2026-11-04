import { useEffect, useState } from 'react'
import Nav, { ROUTES } from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Info from './pages/Info.jsx'
import Offers from './pages/Offers.jsx'
import { fetchEvents } from './lib/api.js'
import { useDonorStore } from './lib/useDonorStore.js'

// Hash-роутинг (#/home, #/info, #/offers): работает на GitHub Pages без
// настройки сервера и не даёт 404 при обновлении страницы.
function useRoute() {
  const read = () => {
    const p = window.location.hash.replace(/^#\/?/, '')
    return ROUTES.some((r) => r.path === p) ? p : 'home'
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
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
  const [events, setEvents] = useState({ items: [], demo: true, loading: true })

  // мероприятия нужны и на «Предложениях», и для уведомлений на главной
  useEffect(() => {
    fetchEvents().then((r) => setEvents({ ...r, loading: false }))
  }, [])

  return (
    <div className="app">
      <Nav current={route} />
      <main className="main">
        {route === 'home' && <Home store={store} events={events.items} />}
        {route === 'info' && <Info />}
        {route === 'offers' && <Offers events={events} />}
      </main>
    </div>
  )
}
