// Работа с бэкендом. Фронт только ЧИТАЕТ: GET /api/events и GET /api/centers.
// Ключ администратора сюда класть нельзя — всё, что попало в сборку,
// видно любому посетителю.

import { MOCK_CENTERS, MOCK_EVENTS } from '../data/mock.js'

const BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')

async function getJSON(path) {
  const res = await fetch(BASE + path, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  const data = await res.json()
  // на случай, если бэкенд завернёт список в { items: [...] }
  return Array.isArray(data) ? data : data.items ?? data.results ?? []
}

// Адаптеры: названия полей у бэкенда пока не согласованы, поэтому
// принимаем несколько вариантов. Когда схема устаканится — упростить.
export function normalizeEvent(e) {
  return {
    id: e.id,
    title: e.title ?? e.name ?? 'Мероприятие',
    date: e.date ?? e.start_date ?? e.event_date ?? null,
    dateLabel: e.date_label ?? null,
    time: e.time ?? e.hours ?? '',
    address: e.address ?? e.location ?? e.place ?? '',
    category: e.category ?? e.type ?? 'promo', // 'university' | 'promo'
    donationType: e.donation_type ?? e.blood_type ?? 'blood',
    note: e.note ?? e.description ?? '',
    url: e.url ?? e.link ?? e.registration_url ?? '',
  }
}

export function normalizeCenter(c) {
  return {
    id: c.id,
    name: c.name ?? c.title ?? 'Центр крови',
    address: c.address ?? '',
    hours: c.hours ?? c.working_hours ?? c.schedule ?? '',
    url: c.url ?? c.link ?? c.website ?? '',
  }
}

export async function fetchEvents() {
  if (!BASE) return { items: MOCK_EVENTS.map(normalizeEvent), demo: true }
  try {
    return { items: (await getJSON('/api/events')).map(normalizeEvent), demo: false }
  } catch (err) {
    console.warn('[api] events:', err)
    return { items: MOCK_EVENTS.map(normalizeEvent), demo: true, error: true }
  }
}

export async function fetchCenters() {
  if (!BASE) return { items: MOCK_CENTERS.map(normalizeCenter), demo: true }
  try {
    return { items: (await getJSON('/api/centers')).map(normalizeCenter), demo: false }
  } catch (err) {
    console.warn('[api] centers:', err)
    return { items: MOCK_CENTERS.map(normalizeCenter), demo: true, error: true }
  }
}
