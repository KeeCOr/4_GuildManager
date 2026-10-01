import React, { useCallback, useEffect, useRef } from 'react'
import type { MerchantState, Equipment } from '../types'
import { generateMerchantStock } from '../data/equipment'

const MERCHANT_ARRIVE_MS  = 20 * 60 * 1000   // 20 minutes real-time
const MERCHANT_DEPART_MS  = 10 * 60 * 1000   // 10 minutes real-time

interface UseMerchantOptions {
  merchantState: MerchantState | null
  setMerchantState: React.Dispatch<React.SetStateAction<MerchantState | null>>
  guildLevel: number
  log: (msg: string) => void
}

export function useMerchant({
  merchantState, setMerchantState, guildLevel, log,
}: UseMerchantOptions) {
  // nextArriveAt: wall-clock timestamp for next merchant arrival
  const nextArriveAtRef = useRef<number>(Date.now() + MERCHANT_ARRIVE_MS)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()

      if (!merchantState?.active) {
        // Waiting for arrival
        if (now >= nextArriveAtRef.current) {
          const stock = generateMerchantStock(guildLevel)
          const departsAt = now + MERCHANT_DEPART_MS
          setMerchantState({ active: true, stock, departsAt })
          log('행상인이 찾아왔습니다! 건물 패널에서 장비를 구매하세요.')
          // Schedule next after this one departs
          nextArriveAtRef.current = departsAt + MERCHANT_ARRIVE_MS
        }
      } else {
        // Merchant is here — check departure
        if (now >= merchantState.departsAt) {
          setMerchantState(null)
          log('행상인이 떠났습니다.')
        }
      }
    }, 5000) // check every 5 seconds
    return () => clearInterval(interval)
  }, [merchantState, guildLevel, setMerchantState, log])

  /** Buy an item from merchant stock */
  const buyFromMerchant = useCallback((
    item: Equipment,
    gold: number,
    guildInventory: Equipment[],
    onBuy: (item: Equipment, cost: number) => void,
    logFn: (msg: string) => void,
  ) => {
    const cost = Math.round(item.buyCost * 1.2)
    if (gold < cost) { logFn(`금화 부족 — ${item.name} 구매 불가 (${cost}G 필요)`); return }
    if (guildInventory.length >= 40) { logFn('인벤토리 가득 참 — 장비를 먼저 정리하세요'); return }
    // Remove item from stock
    setMerchantState(prev => {
      if (!prev) return null
      return { ...prev, stock: prev.stock.filter(s => s.id !== item.id) }
    })
    onBuy(item, cost)
    logFn(`[${item.name}] 구매! (-${cost}G)`)
  }, [setMerchantState])

  return { buyFromMerchant }
}
