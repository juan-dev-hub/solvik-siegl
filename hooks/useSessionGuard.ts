'use client'
import { useEffect } from 'react'
import { getSupabasePublic } from '@/lib/supabase'

export function useSessionGuard(wallet: string | null, onInvalidated: () => void) {
  useEffect(() => {
    if (!wallet) return

    const supabase = getSupabasePublic()
    const channel = supabase
      .channel(`session:${wallet}`)
      .on('broadcast', { event: 'invalidated' }, () => onInvalidated())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [wallet, onInvalidated])
}
