import { parseISO } from './rules.js'

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// «11 декабря 2026»
export function dateLong(iso, withYear = true) {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`
}

// «12 окт»
export function dateShort(iso) {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// 1 день, 2 дня, 5 дней
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export function days(n) {
  return plural(n, 'день', 'дня', 'дней')
}

// 1350 → «1 350»
export function num(n) {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ')
}
