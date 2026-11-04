import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { CONTRAINDICATIONS, FAQ, PREPARATION, STEPS } from '../data/info.js'

export default function Info() {
  const [open, setOpen] = useState(0)

  return (
    <div className="page info">
      <header className="page-head">
        <h1>Информация</h1>
        <p className="muted">Как подготовиться к сдаче крови</p>
      </header>

      <section>
        <h2>Подготовка к донации</h2>
        <div className="two-col">
          {PREPARATION.map((b) => (
            <div key={b.title} className={'card checklist' + (b.tone === 'soft' ? ' card--soft' : '')}>
              <h3 className="accent">{b.title}</h3>
              <ul>
                {b.items.map((it) => (
                  <li key={it}>
                    <Icon name="check" size={20} strokeWidth={2.4} className="checklist__icon" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Противопоказания</h2>
        <div className="two-col">
          {CONTRAINDICATIONS.map((b) => (
            <div key={b.title} className="card contra">
              <h3>
                {b.title}
                <span className={'tag' + (b.strong ? ' tag--strong' : '')}>{b.tag}</span>
              </h3>
              <ul className={b.strong ? 'dots dots--strong' : 'dots'}>
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="muted small">Полный перечень уточняйте у врача в центре крови.</p>
      </section>

      <section>
        <h2>Как проходит процедура</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="steps__num">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Частые вопросы</h2>
        <div className="faq">
          {FAQ.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q} className={'card faq__item' + (isOpen ? ' is-open' : '')}>
                <button className="faq__q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                  {f.q}
                  <Icon name="chevron" size={22} strokeWidth={2.2} className="faq__chev" />
                </button>
                {isOpen && <p className="faq__a">{f.a}</p>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
