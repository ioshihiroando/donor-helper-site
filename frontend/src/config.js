// Единственное место с адресом backend.
// Задаётся в .env: VITE_API_URL=http://127.0.0.1:8000
// Не кладите сюда и в .env фронта ADMIN_API_KEY — всё из сборки видно в браузере.
export const API_URL = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

// Часовой пояс для показа времени мероприятий
export const TIME_ZONE = 'Europe/Moscow'
