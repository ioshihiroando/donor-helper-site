import { describe, expect, it } from 'vitest'
import { addDays, diffDays, getInterval, nextAllowed } from './rules.js'

describe('даты', () => {
  it('прибавляет дни через границу месяца', () => {
    expect(addDays('2026-10-12', 60)).toBe('2026-12-11') // как в макете
    expect(addDays('2026-12-20', 14)).toBe('2027-01-03')
  })
  it('считает разницу в днях, в том числе через смену года', () => {
    expect(diffDays('2026-10-25', '2026-12-11')).toBe(47) // «47 дней» из макета
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('интервалы по приказу № 215н', () => {
  it('таблица', () => {
    expect(getInterval('blood', 'blood')).toBe(60)
    expect(getInterval('blood', 'plasma')).toBe(30)
    expect(getInterval('plasma', 'blood')).toBe(14)
    expect(getInterval('erythrocytes_2', 'blood')).toBe(120)
    expect(getInterval('granulocytes', 'granulocytes')).toBe(60)
  })
})

describe('nextAllowed', () => {
  it('нет сдач — null', () => {
    expect(nextAllowed([], 'blood', '2026-11-03')).toBeNull()
  })

  it('сценарий из макета: кровь 12.10 → можно с 11.12, осталось 47 дней на 25.10', () => {
    const r = nextAllowed([{ date: '2026-10-12', type: 'blood' }], 'blood', '2026-10-25')
    expect(r.date).toBe('2026-12-11')
    expect(r.daysLeft).toBe(47)
    expect(r.total).toBe(60)
  })

  it('срок прошёл — 0 дней', () => {
    const r = nextAllowed([{ date: '2026-01-01', type: 'blood' }], 'blood', '2026-11-03')
    expect(r.daysLeft).toBe(0)
  })

  it('берёт самое строгое ограничение, а не только последнюю сдачу', () => {
    // кровь 01.09, плазма 01.10: после плазмы кровь можно через 14 дней (15.10),
    // но после крови — только через 60 (31.10)
    const r = nextAllowed(
      [
        { date: '2026-09-01', type: 'blood' },
        { date: '2026-10-01', type: 'plasma' },
      ],
      'blood',
      '2026-10-10',
    )
    expect(r.date).toBe('2026-10-31')
  })

  it('плазма после крови — через 30 дней', () => {
    const r = nextAllowed([{ date: '2026-10-12', type: 'blood' }], 'plasma', '2026-10-12')
    expect(r.date).toBe('2026-11-11')
  })
})
