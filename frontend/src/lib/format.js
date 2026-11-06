import { TIME_ZONE } from '../config.js'
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

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export const days = (n) => plural(n, 'день', 'дня', 'дней')

export const num = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ')

// ---- время мероприятий: backend отдаёт ISO с часовым поясом ----

const partsFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })

/** Дата мероприятия по Москве в виде YYYY-MM-DD */
export function zonedDateIso(isoDateTime) {
  return partsFmt.format(new Date(isoDateTime)) // en-CA даёт YYYY-MM-DD
}

export function zonedTime(isoDateTime) {
  return timeFmt.format(new Date(isoDateTime))
}

/** «12 ноября, 11:00–15:00» или «12 ноября 11:00 — 14 ноября 15:00» */
export function eventWhen(e, withYear = false) {
  const startDay = zonedDateIso(e.starts_at)
  const start = `${dateLong(startDay, withYear)}, ${zonedTime(e.starts_at)}`
  if (!e.ends_at) return start
  const endDay = zonedDateIso(e.ends_at)
  if (endDay === startDay) return `${start}–${zonedTime(e.ends_at)}`
  return `${start} — ${dateLong(endDay, withYear)}, ${zonedTime(e.ends_at)}`
}

/** Мероприятие ещё не закончилось */
export function isUpcoming(e, now = new Date()) {
  return new Date(e.ends_at ?? e.starts_at) >= now
}
