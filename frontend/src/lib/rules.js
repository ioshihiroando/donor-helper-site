// Расчёт ориентировочной даты следующей донации.
// Значения интервалов НЕ хранятся в коде — их отдаёт backend:
// GET /api/donation-intervals/matrix → { valid_from, valid_to, source_url,
//   donation_types: [{ code, name }], matrix: { [предыдущая]: { [следующая]: дней } } }
// Здесь только чистые функции, чтобы их можно было тестировать без UI.

// Коды видов донаций — часть API-контракта (см. ai-context/AGENTS.md).
// Названия нужны, чтобы подписать старые записи, пока матрица не загрузилась.
export const DONATION_TYPE_CODES = ['whole_blood', 'rbc_1_unit', 'rbc_2_units', 'plasma', 'platelets', 'granulocytes']

export const FALLBACK_TYPE_NAMES = {
  whole_blood: 'Цельная кровь',
  rbc_1_unit: 'Эритроцитная взвесь (1 единица)',
  rbc_2_units: 'Эритроцитная взвесь (2 единицы)',
  plasma: 'Плазма',
  platelets: 'Тромбоциты',
  granulocytes: 'Гранулоциты',
}

export function typeName(code, donationTypes) {
  return donationTypes?.find((t) => t.code === code)?.name ?? FALLBACK_TYPE_NAMES[code] ?? code
}

// ---- даты без часовых поясов: строки 'YYYY-MM-DD' ----

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
  const a = parseISO(fromIso)
  const b = parseISO(toIso)
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000)
}

/** Проверка, что ответ backend похож на полную матрицу 6×6 положительных чисел. */
export function isValidMatrix(m) {
  if (!m || typeof m !== 'object' || !m.matrix || typeof m.matrix !== 'object') return false
  return DONATION_TYPE_CODES.every((prev) =>
    DONATION_TYPE_CODES.every((next) => Number.isInteger(m.matrix[prev]?.[next]) && m.matrix[prev][next] > 0),
  )
}

/**
 * Когда ориентировочно можно сдавать nextType.
 *
 * matrix[предыдущая][следующая] — минимальный интервал в календарных днях.
 * Берём самое позднее ограничение по всем прошлым донациям: так осторожнее,
 * чем смотреть только на последнюю (кровь → через 30 дней плазма →
 * цельную кровь всё равно нельзя раньше, чем через 60 дней после первой).
 *
 * @param donations  [{ date: 'YYYY-MM-DD', type: код }]
 * @param matrixData ответ /api/donation-intervals/matrix
 * @returns null — сдач нет;
 *          { unavailable: true } — матрицы нет или в ней нет нужного типа;
 *          { date, daysLeft, total, from, afterValidTo }
 */
export function nextAllowed(donations, matrixData, nextType = 'whole_blood', todayIso = toISO(new Date())) {
  if (!donations.length) return null
  if (!isValidMatrix(matrixData)) return { unavailable: true }

  let best = null
  for (const d of donations) {
    const interval = matrixData.matrix[d.type]?.[nextType]
    if (!interval) continue // запись с неизвестным кодом пропускаем
    const date = addDays(d.date, interval)
    if (!best || date > best.date) best = { date, total: interval, from: d }
  }
  if (!best) return { unavailable: true }

  return {
    ...best,
    daysLeft: Math.max(0, diffDays(todayIso, best.date)),
    // дата попадает за срок действия текущей версии матрицы —
    // к тому времени правила могут смениться, предупреждаем пользователя
    afterValidTo: Boolean(matrixData.valid_to && best.date > matrixData.valid_to),
  }
}
