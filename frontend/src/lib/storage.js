// Все личные данные хранятся только в браузере (localStorage) и никуда
// не отправляются. Один объект с номером версии — чтобы потом можно было
// добавить экспорт/импорт JSON и миграции без поломки старых данных.

const KEY = 'donor-pomoshnik:v1'
const EMPTY = { version: 1, donations: [], readNotifications: [] }

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const data = JSON.parse(raw)
    return {
      ...EMPTY,
      ...data,
      donations: Array.isArray(data.donations) ? data.donations : [],
      readNotifications: Array.isArray(data.readNotifications) ? data.readNotifications : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // приватный режим / переполнение — молча работаем в памяти
  }
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
