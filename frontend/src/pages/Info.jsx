import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Empty, ErrorState, Loading } from '../components/Status.jsx'
import { getRules } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'

// Раздел «Информация» целиком из GET /api/rules.
// Памятки группируются по полю category (backend уже сортирует по
// category и sort_order). Категории, в названии которых есть «вопрос»,
// показываются аккордеоном — так удобнее для частых вопросов.

export default function Info() {
  const rules = useAsync(getRules)

  return (
    <div className="page info">
      <header className="page-head">
        <h1>Информация</h1>
        <p className="muted">Как подготовиться к сдаче крови</p>
      </header>

      {rules.status === 'loading' && <Loading text="Загружаем памятки…" />}
      {rules.status === 'error' && <ErrorState error={rules.error} onRetry={rules.reload} />}
      {rules.status === 'ok' && rules.data.length === 0 && <Empty text="Памятки пока не добавлены." />}
      {rules.status === 'ok' &&
        groupByCategory(rules.data).map(([category, items]) =>
          /вопрос/i.test(category) ? (
            <Faq key={category} title={category} items={items} />
          ) : (
            <section key={category}>
              <h2>{category}</h2>
              <div className="two-col">
                {items.map((r) => (
                  <article key={r.id} className="card rule">
                    <h3>{r.title}</h3>
                    <RuleContent text={r.content} />
                    <Source url={r.source_url} />
                  </article>
                ))}
              </div>
            </section>
          ),
        )}
    </div>
  )
}

function groupByCategory(rules) {
  const map = new Map()
  for (const r of rules) {
    const key = r.category?.trim() || 'Разное'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return [...map.entries()]
}

// Текст памятки: пустая строка — новый абзац, строки с «- » или «• » — список.
// HTML не интерпретируется (React экранирует текст), поэтому из базы нельзя
// внедрить скрипт.
function RuleContent({ text }) {
  const blocks = text.split(/\n\s*\n/)
  return (
    <div className="rule__content">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const isList = lines.length > 0 && lines.every((l) => /^[-•*]\s+/.test(l))
        return isList ? (
          <ul key={i} className="checklist">
            {lines.map((l, j) => (
              <li key={j}>
                <Icon name="check" size={20} strokeWidth={2.4} className="checklist__icon" />
                {l.replace(/^[-•*]\s+/, '')}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{lines.join(' ')}</p>
        )
      })}
    </div>
  )
}

function Source({ url }) {
  if (!url) return null
  return (
    <a className="source-link" href={url} target="_blank" rel="noopener noreferrer">
      Источник <Icon name="arrow" size={14} strokeWidth={2.4} />
    </a>
  )
}

function Faq({ title, items }) {
  const [open, setOpen] = useState(items[0]?.id)
  return (
    <section>
      <h2>{title}</h2>
      <div className="faq">
        {items.map((r) => {
          const isOpen = open === r.id
          return (
            <div key={r.id} className={'card faq__item' + (isOpen ? ' is-open' : '')}>
              <button className="faq__q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                {r.title}
                <Icon name="chevron" size={22} strokeWidth={2.2} className="faq__chev" />
              </button>
              {isOpen && (
                <div className="faq__a">
                  <RuleContent text={r.content} />
                  <Source url={r.source_url} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
