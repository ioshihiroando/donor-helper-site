// Уведомления собираются на фронте из локальных данных и списка
// мероприятий. Это лента внутри сайта, не push.

import { dateLong, dateShort } from './format.js'
import { toISO } from './rules.js'

export function buildNotifications({ donations, next, events, today = toISO(new Date()) }) {
  const list = []

  // ближайшее мероприятие в будущем
  const upcoming = events
    .filter((e) => e.date && e.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
  if (upcoming) {
    list.push({
      id: `event-${upcoming.id}-${upcoming.date}`,
      kind: 'event',
      title: upcoming.title,
      text: `${dateLong(upcoming.date, false)}${upcoming.time ? ', ' + upcoming.time : ''}. ${upcoming.address}`.trim(),
      when: 'Скоро',
      sort: today,
    })
  }

  if (next && next.daysLeft === 0) {
    list.push({
      id: `ready-${next.date}`,
      kind: 'ready',
      title: 'Можно сдавать снова',
      text: `Интервал после сдачи ${dateLong(next.from.date, false)} прошёл.`,
      when: dateShort(next.date),
      sort: next.date,
    })
  } else if (next && next.daysLeft <= 3) {
    list.push({
      id: `prepare-${next.date}`,
      kind: 'prepare',
      title: 'Как подготовиться',
      text: 'За 1–2 дня до сдачи: больше воды, меньше жирного.',
      when: dateShort(today),
      sort: today,
    })
  }

  const last = donations[0]
  if (last && next) {
    list.push({
      id: `saved-${last.id}`,
      kind: 'saved',
      title: 'Сдача записана',
      text: `${dateLong(last.date, false)}${last.volume ? ', ' + last.volume + ' мл' : ''}. Следующая сдача с ${dateLong(next.date, false)}.`,
      when: dateShort(last.date),
      sort: last.date,
    })
  }

  if (!donations.length) {
    list.push({
      id: 'welcome',
      kind: 'prepare',
      title: 'Первая сдача?',
      text: 'В разделе «Информация» — как подготовиться и что взять с собой.',
      when: '',
      sort: today,
    })
  }

  return list
}
