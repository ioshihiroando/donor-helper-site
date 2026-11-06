// API-клиент. Только публичные GET-маршруты backend (см. backend/app/schemas.py).
// Заголовок X-Admin-Key из браузера не отправляется никогда.

import { API_URL } from '../config.js'

export class ApiError extends Error {
  constructor(kind, message, status) {
    super(message)
    this.kind = kind // 'network' | 'http' | 'not_found' | 'json'
    this.status = status
  }
}

async function get(path, params) {
  const url = new URL(API_URL + path)
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))

  let res
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError('network', 'Нет связи с сервером')
  }

  if (!res.ok) {
    if (res.status === 404) throw new ApiError('not_found', 'Не найдено', 404)
    throw new ApiError('http', `Сервер ответил ошибкой ${res.status}`, res.status)
  }

  try {
    return await res.json()
  } catch {
    throw new ApiError('json', 'Сервер вернул некорректные данные')
  }
}

function expectArray(data) {
  if (!Array.isArray(data)) throw new ApiError('json', 'Сервер вернул некорректные данные')
  return data
}

// Центр: { id, name, city, address, website_url }
export const getCenters = async () => expectArray(await get('/api/centers'))
export const getCenter = (id) => get(`/api/centers/${encodeURIComponent(id)}`)

// Мероприятие: { id, center_id, title, description, starts_at, ends_at, signup_url }
// Список уже отсортирован backend по starts_at.
export const getEvents = async () => expectArray(await get('/api/events'))
export const getEvent = (id) => get(`/api/events/${encodeURIComponent(id)}`)

// Памятка: { id, title, category, content, source_url }
// Только активные, отсортированы по category и sort_order.
export const getRules = async () => expectArray(await get('/api/rules'))

// Матрица: { valid_from, valid_to, source_url, donation_types: [{code, name}], matrix }
// for_date — YYYY-MM-DD; без него backend берёт сегодняшнюю дату.
export const getIntervalMatrix = (forDate) => get('/api/donation-intervals/matrix', { for_date: forDate })

export function errorText(err) {
  if (err instanceof ApiError) {
    if (err.kind === 'network') return 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'
    if (err.kind === 'not_found') return 'Не найдено.'
    return 'Не удалось загрузить данные. Попробуйте позже.'
  }
  return 'Что-то пошло не так.'
}
