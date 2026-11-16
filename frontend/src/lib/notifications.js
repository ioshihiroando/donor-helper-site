// Уведомления собираются на фронте из локального дневника и списка
// мероприятий. Это лента внутри сайта, не push (push в MVP не согласован).

import { dateLong, dateShort, eventWhen, isUpcoming, zonedDateIso } from './format.js'
import { toISO } from './rules.js'

export function buildNotifications({ donations, next, events, today = toISO(new Date()) }) {
  const list = []

  const upcoming = (events ?? []).filter((e) => isUpcoming(e))[0] // backend уже сортирует по starts_at
  if (upcoming) {
    list.push({
      id: `event-${upcoming.id}-${upcoming.starts_at}`,
      kind: 'event',
      title: upcoming.title,
      text: eventWhen(upcoming),
      when: dateShort(zonedDateIso(upcoming.starts_at)),
      href: `#/events/${upcoming.id}`,
    })
  }

  const ok = next && !next.unavailable
  if (ok && next.daysLeft === 0) {
    list.push({
      id: `ready-${next.date}`,
      kind: 'ready',
      title: 'Можно сдавать снова',
      text: `Минимальный интервал после сдачи ${dateLong(next.from.date, false)} прошёл.`,
      when: dateShort(next.date),
    })
  } else if (ok && next.daysLeft <= 3) {
    list.push({
      id: `prepare-${next.date}`,
      kind: 'prepare',
      title: 'Скоро можно сдавать',
      text: 'Как подготовиться — в разделе «Информация».',
      when: dateShort(today),
      href: '#/info',
    })
  }

  const last = donations[0]
  if (last) {
    list.push({
      id: `saved-${last.id}`,
      kind: 'saved',
      title: 'Сдача записана',
      text: `${dateLong(last.date, false)}${last.volume ? ', ' + last.volume + ' мл' : ''}.${ok ? ` Следующая — ориентировочно с ${dateLong(next.date, false)}.` : ''}`,
      when: dateShort(last.date),
    })
  } else {
    list.push({
      id: 'welcome',
      kind: 'prepare',
      title: 'Первая сдача?',
      text: 'В разделе «Информация» — как подготовиться и что взять с собой.',
      when: '',
      href: '#/info',
    })
  }

  return list
}
