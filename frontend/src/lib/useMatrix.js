import { useCallback, useEffect, useState } from 'react'
import { getIntervalMatrix } from './api.js'
import { isValidMatrix } from './rules.js'
import { loadMatrixCache, saveMatrixCache } from './storage.js'

// Матрица интервалов с backend + кеш для работы без сети.
// Кеш — это прошлый ответ того же backend, а не придуманные значения.
// Если нет ни ответа, ни кеша — расчёт показывается как недоступный.
export function useMatrix() {
  const [state, setState] = useState(() => {
    const cache = loadMatrixCache()
    return cache && isValidMatrix(cache.data)
      ? { data: cache.data, fromCache: true, fetchedAt: cache.fetchedAt, status: 'loading' }
      : { data: null, fromCache: false, fetchedAt: null, status: 'loading' }
  })

  const load = useCallback(() => {
    getIntervalMatrix().then(
      (data) => {
        if (!isValidMatrix(data)) throw new Error('bad matrix')
        saveMatrixCache(data)
        setState({ data, fromCache: false, fetchedAt: new Date().toISOString(), status: 'ok' })
      },
    ).catch((error) => {
      setState((s) => ({ ...s, status: s.data ? 'stale' : 'error', error }))
    })
  }, [])

  useEffect(load, [load])
  return { ...state, reload: load }
}
