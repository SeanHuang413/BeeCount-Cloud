import type { AppSection } from '@beecount/web-features'

export type { AppSection } from '@beecount/web-features'

export type AppRoute =
  | { kind: 'login' }
  | {
      kind: 'app'
      ledgerId: string
      section: AppSection
    }

export const APP_SECTIONS: AppSection[] = [
  'transactions',
  'calendar',
  'accounts',
  'categories',
  'tags',
  'budgets',
  'ledgers',
  'overview',
  'settings-profile',
  'settings-appearance',
  'settings-ai',
  'settings-health',
  'settings-devices',
  'settings-developer',
  'admin-users',
  'admin-backup',
  'admin-data-cleanup',
  'sean-spend-insights',
  'sean-reports',
  'sean-monthly-comparison',
  'sean-asset-trends',
  'sean-assets',
  'sean-actual-spend',
  'sean-cashflow-calendar',
  'sean-anomaly-detection',
  'sean-account-reconciliation',
]

export const DEFAULT_APP_SECTION: AppSection = 'transactions'

function parseWorkspaceSection(parts: string[]): AppSection {
  if (parts.length === 0) return DEFAULT_APP_SECTION
  switch (parts.join('/')) {
    case 'transactions':
      return 'transactions'
    case 'accounts':
      return 'accounts'
    case 'categories':
      return 'categories'
    case 'tags':
      return 'tags'
    case 'budgets':
      return 'budgets'
    default:
      return DEFAULT_APP_SECTION
  }
}

function parseSettingsSection(parts: string[]): AppSection {
  switch (parts.join('/')) {
    case 'profile':
      return 'settings-profile'
    case 'appearance':
      return 'settings-appearance'
    case 'ai':
      return 'settings-ai'
    case 'health':
      return 'settings-health'
    case 'devices':
      return 'settings-devices'
    case 'developer':
      return 'settings-developer'
    default:
      return DEFAULT_APP_SECTION
  }
}

function parseRootSection(parts: string[]): AppSection {
  if (parts.length === 0) return DEFAULT_APP_SECTION
  const raw = parts.join('/')
  switch (raw) {
    case 'transactions':
      return 'transactions'
    case 'calendar':
      return 'calendar'
    case 'accounts':
      return 'accounts'
    case 'categories':
      return 'categories'
    case 'tags':
      return 'tags'
    case 'budgets':
      return 'budgets'
    case 'ledgers':
      return 'ledgers'
    case 'overview':
      return 'overview'
    case 'spend-insights':
      return 'sean-spend-insights'
    case 'sean-reports':
      return 'sean-reports'
    case 'sean-monthly-comparison':
      return 'sean-monthly-comparison'
    case 'sean-asset-trends':
      return 'sean-asset-trends'
    case 'sean-assets':
      return 'sean-assets'
    case 'sean-actual-spend':
      return 'sean-actual-spend'
    case 'sean-cashflow-calendar':
      return 'sean-cashflow-calendar'
    case 'sean-anomaly-detection':
      return 'sean-anomaly-detection'
    case 'sean-account-reconciliation':
      return 'sean-account-reconciliation'
    case 'admin/users':
      return 'admin-users'
    case 'settings/profile':
      return 'settings-profile'
    case 'settings/appearance':
      return 'settings-appearance'
    case 'settings/ai':
      return 'settings-ai'
    case 'settings/health':
      return 'settings-health'
    case 'settings/devices':
      return 'settings-devices'
    case 'settings/developer':
      return 'settings-developer'
    default:
      return DEFAULT_APP_SECTION
  }
}

function parseLegacyLedgerSection(parts: string[]): AppSection {
  if (parts.length === 0) return 'overview'
  const raw = parts.join('/')
  switch (raw) {
    case 'transactions':
      return 'transactions'
    case 'calendar':
      return 'calendar'
    case 'accounts':
      return 'accounts'
    case 'categories':
      return 'categories'
    case 'tags':
      return 'tags'
    case 'budgets':
      return 'budgets'
    case 'overview':
      return 'overview'
    case 'settings/profile':
      return 'settings-profile'
    case 'settings/appearance':
      return 'settings-appearance'
    case 'settings/ai':
      return 'settings-ai'
    case 'settings/health':
      return 'settings-health'
    case 'settings/devices':
      return 'settings-devices'
    case 'settings/developer':
      return 'settings-developer'
    default:
      return DEFAULT_APP_SECTION
  }
}

export function parseRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/login') {
    return { kind: 'login' }
  }

  const normalized = pathname.replace(/\/+$/, '')
  const parts = normalized.split('/').filter(Boolean)
  if (parts[0] !== 'app') {
    return { kind: 'login' }
  }

  if (!parts[1]) {
    return { kind: 'app', ledgerId: '', section: DEFAULT_APP_SECTION }
  }

  if (parts[1] === 'workspace') {
    return { kind: 'app', ledgerId: '', section: parseWorkspaceSection(parts.slice(2)) }
  }
  if (parts[1] === 'admin') {
    if (parts[2] === 'users') return { kind: 'app', ledgerId: '', section: 'admin-users' }
    if (parts[2] === 'backup') return { kind: 'app', ledgerId: '', section: 'admin-backup' }
    if (parts[2] === 'data-cleanup') return { kind: 'app', ledgerId: '', section: 'admin-data-cleanup' }
    return { kind: 'app', ledgerId: '', section: DEFAULT_APP_SECTION }
  }
  if (parts[1] === 'settings') {
    return { kind: 'app', ledgerId: '', section: parseSettingsSection(parts.slice(2)) }
  }
  if (
    parts[1] === 'transactions' ||
    parts[1] === 'calendar' ||
    parts[1] === 'accounts' ||
    parts[1] === 'categories' ||
    parts[1] === 'tags' ||
    parts[1] === 'budgets' ||
    parts[1] === 'overview' ||
    parts[1] === 'spend-insights' ||
    parts[1] === 'sean-reports' ||
    parts[1] === 'sean-monthly-comparison' ||
    parts[1] === 'sean-asset-trends'
    || parts[1] === 'sean-assets'
    || parts[1] === 'sean-actual-spend'
    || parts[1] === 'sean-cashflow-calendar'
    || parts[1] === 'sean-anomaly-detection'
    || parts[1] === 'sean-account-reconciliation'
  ) {
    return { kind: 'app', ledgerId: '', section: parseRootSection(parts.slice(1)) }
  }
  if (parts[1] === 'import') {
    return { kind: 'app', ledgerId: '', section: 'import' }
  }

  const ledgerId = decodeURIComponent(parts[1])
  return {
    kind: 'app',
    ledgerId,
    section: parseLegacyLedgerSection(parts.slice(2))
  }
}

export function routePath(route: AppRoute): string {
  if (route.kind === 'login') {
    return '/login'
  }
  switch (route.section) {
    case 'transactions':
      return '/app/transactions'
    case 'calendar':
      return '/app/calendar'
    case 'accounts':
      return '/app/accounts'
    case 'categories':
      return '/app/categories'
    case 'tags':
      return '/app/tags'
    case 'budgets':
      return '/app/budgets'
    case 'ledgers':
      return '/app/ledgers'
    case 'overview':
      return '/app/overview'
    case 'sean-spend-insights':
      return '/app/spend-insights'
    case 'sean-reports':
      return '/app/sean-reports'
    case 'sean-monthly-comparison':
      return '/app/sean-monthly-comparison'
    case 'sean-asset-trends':
      return '/app/sean-asset-trends'
    case 'sean-assets':
      return '/app/sean-assets'
    case 'sean-actual-spend':
      return '/app/sean-actual-spend'
    case 'sean-cashflow-calendar':
      return '/app/sean-cashflow-calendar'
    case 'sean-anomaly-detection':
      return '/app/sean-anomaly-detection'
    case 'sean-account-reconciliation':
      return '/app/sean-account-reconciliation'
    case 'settings-profile':
      return '/app/settings/profile'
    case 'settings-appearance':
      return '/app/settings/appearance'
    case 'settings-ai':
      return '/app/settings/ai'
    case 'settings-health':
      return '/app/settings/health'
    case 'settings-devices':
      return '/app/settings/devices'
    case 'settings-developer':
      return '/app/settings/developer'
    case 'admin-users':
      return '/app/admin/users'
    case 'admin-backup':
      return '/app/admin/backup'
    case 'admin-data-cleanup':
      return '/app/admin/data-cleanup'
    case 'import':
      return '/app/import'
  }
}
