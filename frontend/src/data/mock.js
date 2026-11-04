// Демо-данные из макета. Показываются, пока не задан VITE_API_URL
// или если бэкенд недоступен.

export const MOCK_EVENTS = [
  {
    id: 1,
    title: 'День донора в вузе',
    date: '2026-11-12',
    time: '11:00–15:00',
    address: 'Актовый зал, ул. Примерная, 1',
    category: 'university',
    donation_type: 'blood',
    note: 'Нужна кровь любой группы',
    url: '',
  },
  {
    id: 2,
    title: 'Приведи друга',
    date: '2026-11-18',
    time: '9:00–14:00',
    address: 'Центр крови, ул. Образцовая, 5',
    category: 'promo',
    donation_type: 'blood',
    note: 'Особенно нужна группа O (I)',
    url: '',
  },
  {
    id: 3,
    title: 'Донорство плазмы',
    date: '2026-11-30',
    date_label: 'до 30 ноября',
    time: 'Пн–Сб, 8:00–14:00',
    address: 'Центр крови, пр. Тестовый, 12',
    category: 'promo',
    donation_type: 'plasma',
    note: 'Нужна плазма группы AB (IV)',
    url: '',
  },
]

export const MOCK_CENTERS = [
  { id: 1, name: 'Центр крови №1', address: 'ул. Образцовая, 5', hours: 'Пн–Сб, 8:00–15:00', url: '' },
  { id: 2, name: 'Центр крови №2', address: 'пр. Тестовый, 12', hours: 'Пн–Пт, 8:30–14:00', url: '' },
  { id: 3, name: 'Донорский пункт при вузе', address: 'ул. Примерная, 1', hours: 'по дням донора', url: '' },
]
