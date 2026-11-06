import { describe, expect, it } from 'vitest'
import { addDays, diffDays, isValidMatrix, nextAllowed } from './rules.js'
import { migrate } from './storage.js'

// Тестовая матрица в формате ответа GET /api/donation-intervals/matrix.
// Значения — только для тестов; в приложении они приходят с backend.
const CODES = ['whole_blood', 'rbc_1_unit', 'rbc_2_units', 'plasma', 'platelets', 'granulocytes']
const row = (vals) => Object.fromEntries(CODES.map((c, i) => [c, vals[i]]))
const MATRIX = {
  valid_from: '2026-01-01',
  valid_to: null,
  source_url: null,
  donation_types: CODES.map((code) => ({ code, name: code })),
  matrix: {
    whole_blood: row([60, 60, 90, 30, 30, 30]),
    rbc_1_unit: row([60, 60, 90, 30, 30, 30]),
    rbc_2_units: row([120, 90, 120, 60, 60, 60]),
    plasma: row([14, 14, 14, 14, 14, 14]),
    platelets: row([14, 14, 14, 14, 14, 14]),
    granulocytes: row([30, 30, 30, 30, 30, 60]),
  },
}

describe('даты', () => {
  it('прибавляет дни через границу месяца и года', () => {
    expect(addDays('2026-10-12', 60)).toBe('2026-12-11')
    expect(addDays('2026-12-20', 14)).toBe('2027-01-03')
  })
  it('считает разницу в днях', () => {
    expect(diffDays('2026-10-25', '2026-12-11')).toBe(47)
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('isValidMatrix', () => {
  it('полная матрица — ок', () => expect(isValidMatrix(MATRIX)).toBe(true))
  it('нет строки — не ок', () => {
    const broken = { ...MATRIX, matrix: { ...MATRIX.matrix } }
    delete broken.matrix.plasma
    expect(isValidMatrix(broken)).toBe(false)
  })
  it('null — не ок', () => expect(isValidMatrix(null)).toBe(false))
})

describe('nextAllowed', () => {
  it('нет сдач — null', () => expect(nextAllowed([], MATRIX, 'whole_blood', '2026-11-03')).toBe(null))

  it('нет матрицы — расчёт недоступен, ничего не придумываем', () => {
    const r = nextAllowed([{ date: '2026-10-12', type: 'whole_blood' }], null)
    expect(r.unavailable).toBe(true)
  })

  it('сценарий из макета: кровь 12.10 → с 11.12, на 25.10 осталось 47 дней', () => {
    const r = nextAllowed([{ date: '2026-10-12', type: 'whole_blood' }], MATRIX, 'whole_blood', '2026-10-25')
    expect(r.date).toBe('2026-12-11')
    expect(r.daysLeft).toBe(47)
    expect(r.total).toBe(60)
  })

  it('срок прошёл — 0 дней', () => {
    expect(nextAllowed([{ date: '2026-01-01', type: 'whole_blood' }], MATRIX, 'whole_blood', '2026-11-03').daysLeft).toBe(0)
  })

  it('берёт самое строгое ограничение, а не только последнюю сдачу', () => {
    const r = nextAllowed(
      [{ date: '2026-09-01', type: 'whole_blood' }, { date: '2026-10-01', type: 'plasma' }],
      MATRIX, 'whole_blood', '2026-10-10',
    )
    expect(r.date).toBe('2026-10-31')
  })

  it('предупреждает, если дата позже окончания действия матрицы', () => {
    const r = nextAllowed([{ date: '2026-12-01', type: 'whole_blood' }], { ...MATRIX, valid_to: '2026-12-31' }, 'whole_blood', '2026-12-01')
    expect(r.afterValidTo).toBe(true)
  })
})

describe('миграция локального дневника', () => {
  it('переводит старые коды в коды backend и отбрасывает мусор', () => {
    const r = migrate({
      version: 1,
      donations: [
        { id: 'a', date: '2026-10-12', type: 'blood', volume: 450 },
        { id: 'b', date: 'не дата', type: 'plasma' },
        null,
      ],
    })
    expect(r.version).toBe(2)
    expect(r.donations.length).toBe(1)
    expect(r.donations[0].type).toBe('whole_blood')
  })
  it('повреждённые данные — пустой дневник', () => {
    expect(migrate('мусор').donations.length).toBe(0)
  })
})
