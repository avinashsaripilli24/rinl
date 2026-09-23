import { useCallback, useEffect } from 'react'
import { DEFAULT_WEIGHTS } from '../lib/derive'
import { DEFAULT_LOAN, type LoanProfile } from '../lib/loan'
import type { Weights } from '../lib/types'
import { useStored } from './useStored'

export function useShortlist() {
  const [ids, setIds] = useStored<string[]>('shortlist', [])
  const toggle = useCallback((id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), [setIds])
  const clear = useCallback(() => setIds([]), [setIds])
  return { ids, has: (id: string) => ids.includes(id), toggle, clear }
}

export function useWeights() {
  const [w, setW] = useStored<Weights>('weights', DEFAULT_WEIGHTS)
  return { weights: { ...DEFAULT_WEIGHTS, ...w }, setWeights: setW, reset: () => setW(DEFAULT_WEIGHTS) }
}

export function useStampPct() {
  return useStored<number>('stampPct', 7.5)
}

export type Theme = 'light' | 'dark'
export function useTheme() {
  const system = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const [theme, setTheme] = useStored<Theme | null>('themeChoice', null)
  const effective: Theme = theme ?? system
  useEffect(() => {
    document.documentElement.classList.toggle('dark', effective === 'dark')
    try {
      if (theme) localStorage.setItem('theme', theme)
      else localStorage.removeItem('theme')
    } catch {
      /* ignore */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', effective === 'dark' ? '#020617' : '#f8fafc')
  }, [effective, theme])
  return { theme: effective, toggle: () => setTheme(effective === 'dark' ? 'light' : 'dark') }
}

export function useLoanProfile() {
  const [p, setP] = useStored<LoanProfile>('loanProfile', DEFAULT_LOAN)
  const profile = { ...DEFAULT_LOAN, ...p }
  return {
    profile,
    set: (patch: Partial<LoanProfile>) => setP({ ...profile, ...patch }),
    reset: () => setP({ ...DEFAULT_LOAN, netMonthlyIncome: profile.netMonthlyIncome, coApplicantIncome: profile.coApplicantIncome, existingEmis: profile.existingEmis }),
  }
}
