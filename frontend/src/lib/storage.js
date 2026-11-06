// Локальное хранилище: личный дневник донаций (только на устройстве)
// и кеш общедоступной матрицы интервалов (для работы без сети).
// Слой отделён от UI; повреждённые и устаревшие данные не роняют приложение.

const DIARY_KEY = 'donor-pomoshnik:diary'
const LEGACY_KEY = 'donor-pomoshnik:v1' // формат первой версии фронта
const MATRIX_CACHE_KEY = 'donor-pomoshnik:matrix-cache'

export const DIARY_VERSION = 2
const EMPTY = { version: DIARY_VERSION, donations: [], readNotifications: [] }

// Коды первой версии фронта → коды backend
const LEGACY_TYPES = {
  blood: 'whole_blood',
  erythrocytes_1: 'rbc_1_unit',
  erythrocytes_2: 'rbc_2_units',
  plasma: 'plasma',
  platelets: 'platelets',
  granulocytes: 'granulocytes',
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null // нет доступа к storage или битый JSON
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // приватный режим / переполнение — работаем в памяти
  }
}

const isISODate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

function cleanDonation(d) {
  if (!d || !isISODate(d.date) || typeof d.type !== 'string') return null
  return {
    id: String(d.id ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
    date: d.date,
    type: LEGACY_TYPES[d.type] ?? d.type,
    volume: Number(d.volume) > 0 ? Number(d.volume) : 0,
    createdAt: d.createdAt ?? null,
  }
}

/** Приводит данные любой известной версии к текущей. Экспортируется для тестов. */
export function migrate(data) {
  if (!data || typeof data !== 'object') return { ...EMPTY }
  const donations = (Array.isArray(data.donations) ? data.donations : []).map(cleanDonation).filter(Boolean)
  const readNotifications = Array.isArray(data.readNotifications) ? data.readNotifications.filter((x) => typeof x === 'string') : []
  return { version: DIARY_VERSION, donations, readNotifications }
}

export function loadDiary() {
  const current = readJSON(DIARY_KEY)
  if (current) return migrate(current)

  // перенос записей из первой версии; старый ключ не удаляем — на всякий случай
  const legacy = readJSON(LEGACY_KEY)
  if (legacy) {
    const migrated = migrate(legacy)
    writeJSON(DIARY_KEY, migrated)
    return migrated
  }
  return { ...EMPTY }
}

export function saveDiary(data) {
  return writeJSON(DIARY_KEY, data)
}

export function loadMatrixCache() {
  const c = readJSON(MATRIX_CACHE_KEY)
  return c && c.data && c.fetchedAt ? c : null
}

export function saveMatrixCache(data) {
  writeJSON(MATRIX_CACHE_KEY, { data, fetchedAt: new Date().toISOString() })
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
