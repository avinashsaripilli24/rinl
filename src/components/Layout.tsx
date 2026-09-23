import { NavLink, Outlet } from 'react-router-dom'
import { openSettings, useShortlist, useTheme } from '../hooks/useApp'
import PlotPreview from './PlotPreview'
import SettingsSheet from './SettingsSheet'
import { Icon, type IconName } from './ui'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Plots', icon: 'grid' },
  { to: '/top', label: 'Top picks', icon: 'trophy' },
  { to: '/compare', label: 'Compare', icon: 'columns' },
  { to: '/insights', label: 'Insights', icon: 'chart' },
  { to: '/info', label: 'Info', icon: 'info' },
]

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-11 w-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

export default function Layout() {
  const { ids } = useShortlist()
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-600 text-white">
            <Icon name="grid" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight">RINL Plot Explorer</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">Vizag e-auction · 12 &amp; 16 Oct 2026</span>
          </span>
        </NavLink>
        <nav className="hidden gap-1 md:flex">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
              }
            >
              {t.label}
              {t.to === '/compare' && ids.length ? ` (${ids.length})` : ''}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => openSettings()}
          className="grid h-11 w-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Settings: income, loan and scoring"
        >
          <Icon name="gear" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 pt-3 md:pb-10">
        <Outlet />
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'}`
              }
            >
              <Icon name={t.icon} />
              {t.label}
              {t.to === '/compare' && ids.length ? (
                <span className="absolute right-[calc(50%-1.6rem)] top-1.5 min-w-5 rounded-full bg-teal-600 px-1 text-center text-[11px] leading-5 text-white">{ids.length}</span>
              ) : null}
            </NavLink>
          ))}
        </div>
      </nav>
      <PlotPreview />
      <SettingsSheet />
    </div>
  )
}
