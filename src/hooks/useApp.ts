import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_WEIGHTS } from '../lib/derive'
import { DEFAULT_LOAN, ownFundsAt, type LoanProfile } from '../lib/loan'
import type { Plot } from '../lib/types'
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
    reset: () => setP({ ...DEFAULT_LOAN, netMonthlyIncome: profile.netMonthlyIncome, coApplicantIncome: profile.coApplicantIncome, existingEmis: profile.existingEmis, savings: profile.savings }),
  }
}

/**
 * Monthly EMI for a plot bought at reserve, using the loan terms, income and stamp duty from Settings.
 * The loan only covers the balance instalment and is capped by LTV and income, as on the plot page.
 */
export function useEmi() {
  const { profile } = useLoanProfile()
  const [stampPct] = useStampPct()
  const hint = `${profile.ratePct}% · ${profile.tenureYears} yrs · ${profile.ltvPct}% LTV${profile.netMonthlyIncome + profile.coApplicantIncome ? ', capped by your income' : ''}`
  const planFor = (p: Plot) => ownFundsAt(p, p.rate, stampPct, profile).lp
  return {
    emiFor: (p: Plot) => planFor(p).emi,
    /** true when income, not LTV, limits the loan: the EMI is then your maximum and the rest is own money */
    cappedFor: (p: Plot) => planFor(p).bindingLimit === 'income',
    hint,
  }
}

const SETTINGS_EVENT = 'open-settings'
export type SettingsSection = 'profile' | 'loan' | 'costs' | 'weights'

/** Open the settings drawer from anywhere, optionally scrolled to a section. */
export const openSettings = (section: SettingsSection = 'profile') => window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: section }))

export function useSettingsDrawer() {
  const [section, setSection] = useState<SettingsSection | null>(null)
  useEffect(() => {
    const on = (e: Event) => setSection((e as CustomEvent<SettingsSection>).detail)
    window.addEventListener(SETTINGS_EVENT, on)
    return () => window.removeEventListener(SETTINGS_EVENT, on)
  }, [])
  return { section, close: () => setSection(null) }
}

/** Quick-look sheet for a plot. Opening pushes a history entry so the back gesture closes it. */
export function usePreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const id = (location.state as { preview?: string } | null)?.preview ?? null
  const open = useCallback(
    (pid: string) => navigate({ pathname: location.pathname, search: location.search }, { state: { preview: pid }, replace: !!id }),
    [navigate, location.pathname, location.search, id],
  )
  const close = useCallback(() => navigate(-1), [navigate])
  const openFull = useCallback((pid: string) => navigate(`/plot/${pid}`, { replace: true }), [navigate])
  return { id, open, close, openFull }
}
