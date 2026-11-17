import { useCallback, useEffect, useState } from 'react'

// Состояния загрузки: { status: 'loading' | 'ok' | 'error', data, error, reload }
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  const run = useCallback(() => {
    let alive = true
    setState((s) => ({ ...s, status: 'loading', error: null }))
    fn().then(
      (data) => alive && setState({ status: 'ok', data, error: null }),
      (error) => alive && setState({ status: 'error', data: null, error }),
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])
  return { ...state, reload: run }
}
