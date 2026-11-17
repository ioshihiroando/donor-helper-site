import Icon from './Icon.jsx'

export const ROUTES = [
  { path: 'info', label: 'Информация', icon: 'info' },
  { path: 'offers', label: 'Предложения', icon: 'pin' },
  { path: 'home', label: 'Главная', icon: 'home' },
]

// Одно меню: на телефоне — снизу, на десктопе (≥1024px) — сбоку. Решается в CSS.
export default function Nav({ current }) {
  return (
    <nav className="nav" aria-label="Разделы">
      <a className="nav__brand" href="#/home">
        <span className="nav__logo">
          <Icon name="drop" size={24} />
        </span>
        Донор-помощник
      </a>
      <ul className="nav__list">
        {ROUTES.map((r) => (
          <li key={r.path}>
            <a
              href={`#/${r.path}`}
              className={'nav__item' + (current === r.path ? ' is-active' : '')}
              aria-current={current === r.path ? 'page' : undefined}
            >
              <Icon name={r.icon} />
              <span>{r.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
