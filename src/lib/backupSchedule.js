import {
  AUTO_BACKUP_DAYS,
  AUTO_BACKUP_HOUR,
  AUTO_BACKUP_TIME_ZONE,
  AUTO_BACKUP_WINDOW_MINUTES,
} from '../config/security.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

export function getTimeZoneParts(date = new Date(), timeZone = AUTO_BACKUP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
}

export function buildBackupCycleKey(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}-${pad(AUTO_BACKUP_HOUR)}00-${AUTO_BACKUP_TIME_ZONE}`
}

export function buildBackupMonthKey(parts) {
  return `${parts.year}-${pad(parts.month)}`
}

export function getAutomaticBackupCycle(now = new Date()) {
  const parts = getTimeZoneParts(now)
  const minutesSinceScheduledHour = (parts.hour - AUTO_BACKUP_HOUR) * 60 + parts.minute
  const insideScheduledWindow =
    AUTO_BACKUP_DAYS.includes(parts.day) &&
    minutesSinceScheduledHour >= 0 &&
    minutesSinceScheduledHour < AUTO_BACKUP_WINDOW_MINUTES

  if (!insideScheduledWindow) return null

  const scheduledAt = now.getTime() - ((parts.minute * 60 + parts.second) * 1000)

  return {
    cycleKey: buildBackupCycleKey(parts),
    dayKey: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    monthKey: buildBackupMonthKey(parts),
    scheduledAt,
    scheduledLabel: `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(AUTO_BACKUP_HOUR)}:00`,
    scheduledParts: parts,
    timeZone: AUTO_BACKUP_TIME_ZONE,
  }
}
