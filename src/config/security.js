export const OWNER_EMAIL = 'epaim@dev.com.br'

export const OWNER_ROLE = 'owner'

export const OWNER_PROTECTED_MESSAGE =
  'Este usuario e o Owner do sistema e nao pode ser removido, desativado ou alterado.'

export const AUTO_BACKUP_INTERVAL = 10 * 60 * 1000

export const AUTO_BACKUP_HOUR = 3

export const AUTO_BACKUP_TIME_ZONE = 'America/Sao_Paulo'

export const AUTO_BACKUP_DAYS = [1, 15]

export const AUTO_BACKUP_WINDOW_MINUTES = 60

export const AUTOMATIC_BACKUP_DAILY_RETENTION = 7

export const AUTOMATIC_BACKUP_MONTHLY_RETENTION = 12

export const PROTECTION_THRESHOLD = 0.5

export const CRITICAL_BACKUP_REDUCTION_RATIO = PROTECTION_THRESHOLD

export const PROTECTION_OVERRIDE_DURATION = 10 * 60 * 1000

export function isOwner(profile) {
  return profile?.email?.toLowerCase() === OWNER_EMAIL
}

export function isPrivilegedAdmin(profile) {
  return profile?.active !== false && (profile?.role === 'superadmin' || isOwner(profile))
}

export function hasAdminAccess(profile) {
  return (
    profile?.active !== false &&
    (isOwner(profile) || ['admin', 'superadmin', OWNER_ROLE].includes(profile?.role))
  )
}
