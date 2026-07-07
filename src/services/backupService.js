import {
  get,
  off,
  onValue,
  push,
  ref as databaseRef,
  remove,
  set,
} from 'firebase/database'
import {
  AUTOMATIC_BACKUP_DAILY_RETENTION,
  AUTOMATIC_BACKUP_MONTHLY_RETENTION,
  CRITICAL_BACKUP_REDUCTION_RATIO,
  PROTECTION_OVERRIDE_DURATION,
  isPrivilegedAdmin,
  isOwner,
} from '../config/security.js'
import { getAutomaticBackupCycle } from '../lib/backupSchedule.js'
import { createAuditLog } from './auditService.js'
import { db, requireFirebase } from './firebase.js'
import { withTimeout } from './timeout.js'

const COLLECTIONS = [
  'pecas',
  'ocorrencias',
  'admins',
  'logs',
  'materials',
  'machines',
  'pieceChecklists',
  'processSheets',
  'documents',
  'pieceFiles',
]

export function canRestoreBackups(profile) {
  return isOwner(profile)
}

export function canCreateBackups(profile) {
  return isPrivilegedAdmin(profile)
}

function refPath(path) {
  requireFirebase()
  return databaseRef(db, path)
}

function backupsRef(id = '') {
  return refPath(id ? `backups/${id}` : 'backups')
}

function protectionRef() {
  return refPath('systemProtection/backup')
}

async function readPath(path) {
  const snapshot = await get(refPath(path))
  return snapshot.val() || {}
}

function objectToArray(value) {
  return Object.entries(value || {}).map(([id, data]) => ({ id, ...data }))
}

function countActivePieces(pieces = {}) {
  return Object.values(pieces || {}).filter((piece) => piece?.deleted !== true).length
}

function countValues(value = {}) {
  return Object.keys(value || {}).length
}

function countNestedValues(value = {}) {
  return Object.values(value || {}).reduce(
    (total, child) => total + Object.keys(child || {}).length,
    0,
  )
}

function buildCounts(data = {}) {
  return {
    pieces: countActivePieces(data.pecas),
    occurrences: countValues(data.ocorrencias),
    users: countValues(data.admins),
    logs: countValues(data.logs),
    materials: countValues(data.materials),
    machines: countValues(data.machines),
    processSheets: countNestedValues(data.processSheets),
    pieceFiles: countNestedValues(data.pieceFiles),
    documents: countValues(data.documents),
  }
}

function comparableCountKeys(counts = {}) {
  return Object.keys(counts).filter((key) => Number(counts[key] || 0) > 0)
}

function getBackupDayKey(backup) {
  if (backup.dayKey) return backup.dayKey
  if (backup.cycleKey) return backup.cycleKey
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(backup.createdAt || Date.now()))
}

function getBackupMonthKey(backup) {
  if (backup.monthKey) return backup.monthKey
  return getBackupDayKey(backup).slice(0, 7)
}

export function watchBackups(callback, onError) {
  const listRef = backupsRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const backups = Object.entries(value)
        .map(([id, data]) => ({ id, ...data }))
        .filter((backup) => backup.hiddenFromList !== true)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      callback(backups)
    },
    onError,
  )
  return () => off(listRef)
}

export function watchBackupProtection(callback, onError) {
  const stateRef = protectionRef()
  onValue(
    stateRef,
    (snapshot) => callback(snapshot.val() || { active: false }),
    onError,
  )
  return () => off(stateRef)
}

async function getLastValidBackup() {
  const backups = objectToArray(await readPath('backups')).sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
  )
  return backups.find(
    (backup) =>
      backup.type !== 'pre_restore' &&
      backup.valid !== false &&
      (backup.baselineAfterDeliveryReset === true || Number(backup.counts?.pieces || 0) > 0),
  )
}

async function logBackupEvent(profile, payload) {
  try {
    await createAuditLog(profile, payload)
  } catch {
    // Backup e restauração não devem falhar se auditoria estiver indisponível.
  }
}

export async function validateBackupSafety(type = 'manual') {
  const integrity = await checkSystemIntegrity()
  const piecesReason = integrity.reasons.find((reason) => reason.key === 'pieces')

  return {
    suspicious: integrity.status === 'protected',
    currentPieces: integrity.currentCounts.pieces,
    lastPieces: integrity.lastCounts.pieces,
    reasons: integrity.reasons,
    protection: integrity.protection,
    currentPiecesFallback: piecesReason?.current,
    lastPiecesFallback: piecesReason?.last,
    type,
  }
}

export async function checkSystemIntegrity(profile = null) {
  const data = {}
  await Promise.all(
    COLLECTIONS.map(async (path) => {
      data[path] = await readPath(path)
    }),
  )

  const currentCounts = buildCounts(data)
  const lastValidBackup = await getLastValidBackup()
  const lastCounts = {
    ...buildCounts(lastValidBackup?.data || {}),
    ...(lastValidBackup?.counts || {}),
  }
  const protectionSnapshot = await get(protectionRef())
  const protection = protectionSnapshot.val() || { active: false }
  const overrideActive = Number(protection.overrideUntil || 0) > Date.now()

  const reasons = comparableCountKeys(lastCounts)
    .map((key) => ({
      key,
      current: Number(currentCounts[key] || 0),
      last: Number(lastCounts[key] || 0),
      threshold: Math.floor(Number(lastCounts[key] || 0) * CRITICAL_BACKUP_REDUCTION_RATIO),
    }))
    .filter((reason) => reason.current < reason.threshold)

  const suspicious = reasons.length > 0

  if (suspicious && !overrideActive && !protection.active) {
    const nextProtection = {
      active: true,
      enteredAt: Date.now(),
      lastValidBackupId: lastValidBackup?.id || '',
      lastValidBackupAt: lastValidBackup?.createdAt || null,
      reasons,
      currentCounts,
      lastCounts,
    }
    await set(protectionRef(), nextProtection)
    await logBackupEvent(profile, {
      action: 'BACKUP_PROTECTION_ON',
      entity: 'backup',
      entityId: lastValidBackup?.id,
      description:
        'Redução crítica de dados detectada. O sistema entrou em modo de proteção e os backups automáticos foram suspensos para preservar o último backup válido.',
      after: nextProtection,
    })
    return {
      status: 'protected',
      healthy: false,
      currentCounts,
      lastCounts,
      reasons,
      protection: nextProtection,
      lastValidBackup,
    }
  }

  if (!suspicious && protection.active) {
    const nextProtection = {
      ...protection,
      active: false,
      exitedAt: Date.now(),
      reasons: [],
      currentCounts,
    }
    await set(protectionRef(), nextProtection)
    await logBackupEvent(profile, {
      action: 'BACKUP_PROTECTION_OFF',
      entity: 'backup',
      description: 'Sistema voltou ao estado normal. Os backups automáticos foram reativados.',
      after: nextProtection,
    })
    return {
      status: 'healthy',
      healthy: true,
      currentCounts,
      lastCounts,
      reasons: [],
      protection: nextProtection,
      lastValidBackup,
    }
  }

  return {
    status: suspicious && !overrideActive ? 'protected' : overrideActive ? 'warning' : 'healthy',
    healthy: !suspicious || overrideActive,
    currentCounts,
    lastCounts,
    reasons,
    protection,
    lastValidBackup,
  }
}

export async function overrideBackupProtection(profile) {
  if (!isOwner(profile)) {
    await logBackupEvent(profile, {
      action: 'PERMISSION_DENIED',
      entity: 'backup',
      description: 'Tentativa de ignorar proteção de backup por usuário sem permissão.',
    })
    throw new Error('Somente o Owner pode ignorar a proteção de backup.')
  }

  const current = (await get(protectionRef())).val() || {}
  const nextProtection = {
    ...current,
    active: false,
    overrideUntil: Date.now() + PROTECTION_OVERRIDE_DURATION,
    overrideBy: profile?.uid || '',
    overrideByName: profile?.nome || profile?.email || 'Owner',
    overrideAt: Date.now(),
  }
  await set(protectionRef(), nextProtection)
  await logBackupEvent(profile, {
    action: 'BACKUP_PROTECTION_OVERRIDE',
    entity: 'backup',
    description: 'Owner ignorou temporariamente a proteção de backup.',
    after: nextProtection,
  })
  return nextProtection
}

export async function createBackup(profile, type = 'manual', options = {}) {
  const integrity = options.skipIntegrity
    ? { status: 'healthy', currentCounts: {}, lastCounts: {}, reasons: [], protection: {} }
    : await checkSystemIntegrity(profile)
  const blocked = integrity.status === 'protected'

  if (blocked && type === 'automatic') {
    return null
  }

  if (blocked && type === 'manual' && !isOwner(profile)) {
    const error = new Error(
      'O sistema detectou uma redução crítica de dados. Para proteger os últimos backups válidos, a criação de novos backups foi temporariamente bloqueada. Somente o proprietário do sistema poderá ignorar esta proteção.',
    )
    error.code = 'backup/protected'
    error.integrity = integrity
    throw error
  }

  if (blocked && type === 'manual' && isOwner(profile) && !options.confirmSuspicious) {
    const error = new Error(
      'O sistema está em modo de proteção. Confirme a opção de ignorar proteção temporariamente antes de criar backups.',
    )
    error.code = 'backup/protected-owner'
    error.integrity = integrity
    throw error
  }

  const data = {}
  await Promise.all(
    COLLECTIONS.map(async (path) => {
      data[path] = await readPath(path)
    }),
  )

  const counts = buildCounts(data)
  const isAutomatic = type === 'automatic'

  const newBackupRef = push(backupsRef())
  const backup = {
    createdAt: options.createdAt || Date.now(),
    createdBy: isAutomatic ? 'system' : profile?.uid || '',
    createdByName: isAutomatic ? 'MoldStock' : profile?.nome || profile?.email || 'Sistema',
    version: '1.1.0',
    type,
    valid: true,
    label: options.label || '',
    description: options.description || '',
    hiddenFromList: options.hiddenFromList === true,
    baselineAfterDeliveryReset: options.baselineAfterDeliveryReset === true,
    collections: COLLECTIONS,
    counts,
    data,
  }

  await withTimeout(set(newBackupRef, backup), 'Não foi possível criar backup.', 12000)
  if (options.skipAudit !== true) {
    await logBackupEvent(profile, {
      action: 'BACKUP',
      entity: 'backup',
      entityId: newBackupRef.key,
      description:
        options.logDescription ||
        (type === 'pre_restore'
          ? 'Backup de segurança criado antes da restauração.'
          : type === 'automatic'
            ? 'Backup automático criado pelo sistema.'
            : 'Backup manual criado com sucesso.'),
      after: backup.counts,
    })
  }

  return { id: newBackupRef.key, ...backup }
}

async function rotateAutomaticBackups() {
  const backups = objectToArray(await readPath('backups'))
    .filter((backup) => backup.type === 'automatic')
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))

  const keepIds = new Set()
  const keptDays = new Set()
  const keptMonths = new Set()

  backups.forEach((backup) => {
    const dayKey = getBackupDayKey(backup)
    if (keptDays.size < AUTOMATIC_BACKUP_DAILY_RETENTION && !keptDays.has(dayKey)) {
      keptDays.add(dayKey)
      keepIds.add(backup.id)
    }
  })

  backups.forEach((backup) => {
    const monthKey = getBackupMonthKey(backup)
    if (keptMonths.size < AUTOMATIC_BACKUP_MONTHLY_RETENTION && !keptMonths.has(monthKey)) {
      keptMonths.add(monthKey)
      keepIds.add(backup.id)
    }
  })

  const removals = backups
    .filter((backup) => !keepIds.has(backup.id))
    .map((backup) => remove(backupsRef(backup.id)))

  await Promise.all(removals)
}

export async function ensureAutomaticBackup(profile) {
  if (!canCreateBackups(profile)) return null

  const cycle = getAutomaticBackupCycle()
  if (!cycle) return null

  const backups = objectToArray(await readPath('backups'))
  const alreadyCreated = backups.some(
    (backup) => backup.type === 'automatic' && backup.cycleKey === cycle.cycleKey,
  )

  if (alreadyCreated) return null

  const backup = await createBackup(profile, 'automatic', { createdAt: cycle.scheduledAt })
  if (!backup) return null
  await set(backupsRef(backup.id), {
    ...backup,
    ...cycle,
  })
  await rotateAutomaticBackups()
  return { ...backup, ...cycle }
}

export function downloadBackupJson(backup) {
  const timestamp = new Date(backup.createdAt || Date.now())
    .toISOString()
    .slice(0, 16)
    .replace('T', '-')
    .replace(':', '-')
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `backup-moldstock-${timestamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function restoreBackup(profile, backup) {
  if (!canRestoreBackups(profile)) {
    await logBackupEvent(profile, {
      action: 'PERMISSION_DENIED',
      entity: 'backup',
      entityId: backup?.id,
      description: 'Tentativa de restaurar backup por usuário sem permissão.',
    })
    throw new Error('Somente o Owner pode restaurar backups.')
  }

  await logBackupEvent(profile, {
    action: 'RESTORE',
    entity: 'backup',
    entityId: backup.id,
    description: 'Tentativa de restauração iniciada.',
    before: backup.counts,
  })

  await createBackup(profile, 'pre_restore')

  const data = backup.data || {}
  const restorePaths = COLLECTIONS.filter((path) => data[path] !== undefined || (path === 'pecas' && data.pieces))
  await Promise.all(
    restorePaths.map((path) =>
      withTimeout(
        set(refPath(path), data[path] || (path === 'pecas' ? data.pieces || {} : {})),
        `Não foi possível restaurar ${path}.`,
        15000,
      ),
    ),
  )

  await logBackupEvent(profile, {
    action: 'RESTORE',
    entity: 'backup',
    entityId: backup.id,
    description: 'Restauração concluída. Um backup de segurança foi criado antes da restauração.',
    after: backup.counts,
  })

  await checkSystemIntegrity(profile)
}


