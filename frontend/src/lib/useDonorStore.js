import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadDiary, newId, saveDiary } from './storage.js'

// Личный дневник донаций. Хранится только на устройстве, на сервер не уходит.
export function useDonorStore() {
  const [data, setData] = useState(loadDiary)

  useEffect(() => { saveDiary(data) }, [data])

  // синхронизация между вкладками
  useEffect(() => {
    const onStorage = () => setData(loadDiary())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const donations = useMemo(
    () => [...data.donations].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.donations],
  )

  const addDonation = useCallback(({ date, type, volume }) => {
    const item = { id: newId(), date, type, volume: Number(volume) || 0, createdAt: new Date().toISOString() }
    setData((d) => ({ ...d, donations: [...d.donations, item] }))
    return item
  }, [])

  const removeDonation = useCallback((id) => {
    setData((d) => ({ ...d, donations: d.donations.filter((x) => x.id !== id) }))
  }, [])

  const markRead = useCallback((ids) => {
    setData((d) => ({ ...d, readNotifications: [...new Set([...d.readNotifications, ...ids])] }))
  }, [])

  const totalVolume = donations.reduce((s, d) => s + (d.volume || 0), 0)

  return { donations, totalVolume, addDonation, removeDonation, readIds: data.readNotifications, markRead }
}
