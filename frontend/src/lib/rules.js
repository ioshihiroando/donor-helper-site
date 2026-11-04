// Правила интервалов между донациями.
// Источник: Приказ Минздрава России от 27.03.2026 № 215н, Приложение № 7
// «Интервал между видами донорства». Интервал — в календарных днях
// между настоящей и предыдущей донациями.
//
// Когда бэкенд отдаст GET /api/rules, эту таблицу можно подменить ответом
// сервера (см. setRules) — формат тот же.

// defaultVolume подставляется в форму; для компонентов объём бывает разный,
// поэтому пользователь вводит его сам по справке из центра крови.
export const DONATION_TYPES = [
  { id: 'blood', label: 'Цельная кровь', short: 'Кровь', defaultVolume: 450 },
  { id: 'plasma', label: 'Плазма', short: 'Плазма', defaultVolume: null },
  { id: 'platelets', label: 'Тромбоциты', short: 'Тромбоциты', defaultVolume: null },
  { id: 'erythrocytes_1', label: 'Эритроциты, 1 доза', short: 'Эритроциты', defaultVolume: null },
  { id: 'erythrocytes_2', label: 'Эритроциты, 2 дозы', short: 'Эритроциты ×2', defaultVolume: null },
  { id: 'granulocytes', label: 'Гранулоциты', short: 'Гранулоциты', defaultVolume: null },
]

// INTERVALS[предыдущая][настоящая] = минимум дней
let INTERVALS = {
  blood:          { blood: 60,  erythrocytes_1: 60, erythrocytes_2: 90,  plasma: 30, platelets: 30, granulocytes: 30 },
  erythrocytes_1: { blood: 60,  erythrocytes_1: 60, erythrocytes_2: 90,  plasma: 30, platelets: 30, granulocytes: 30 },
  erythrocytes_2: { blood: 120, erythrocytes_1: 90, erythrocytes_2: 120, plasma: 60, platelets: 60, granulocytes: 60 },
  plasma:         { blood: 14,  erythrocytes_1: 14, erythrocytes_2: 14,  plasma: 14, platelets: 14, granulocytes: 14 },
  platelets:      { blood: 14,  erythrocytes_1: 14, erythrocytes_2: 14,  plasma: 14, platelets: 14, granulocytes: 14 },
  granulocytes:   { blood: 30,  erythrocytes_1: 30, erythrocytes_2: 30,  plasma: 30, platelets: 30, granulocytes: 60 },
}

export function setRules(intervals) {
  if (intervals && typeof intervals === 'object') INTERVALS = intervals
}

export function getInterval(prevType, nextType) {
  return INTERVALS[prevType]?.[nextType] ?? 60
}

export function typeLabel(id) {
  return DONATION_TYPES.find((t) => t.id === id)?.label ?? id
}

// ---- даты без часовых поясов: работаем со строками 'YYYY-MM-DD' ----

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, days) {
  const dt = parseISO(iso)
  dt.setDate(dt.getDate() + days)
  return toISO(dt)
}

export function diffDays(fromIso, toIso) {
  // Date.UTC убирает влияние перехода на летнее время
  const a = parseISO(fromIso)
  const b = parseISO(toIso)
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / 86400000)
}

/**
 * Когда можно сдавать nextType.
 * Берём самое позднее ограничение по всем прошлым донациям — так
 * осторожнее, чем смотреть только на последнюю (например: кровь → через
 * 30 дней плазма → цельную кровь всё равно нельзя раньше 60 дней от первой).
 *
 * @returns {null | { date, daysLeft, total, from }}  null — сдач ещё не было
 */
export function nextAllowed(donations, nextType = 'blood', todayIso = toISO(new Date())) {
  if (!donations.length) return null
  let best = null
  for (const d of donations) {
    const interval = getInterval(d.type, nextType)
    const date = addDays(d.date, interval)
    if (!best || date > best.date) best = { date, total: interval, from: d }
  }
  const daysLeft = Math.max(0, diffDays(todayIso, best.date))
  return { ...best, daysLeft }
}
