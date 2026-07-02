import {
  get,
  off,
  onValue,
  push,
  ref as databaseRef,
  remove,
  set,
} from 'firebase/database'
import { createAuditLog } from './auditService.js'
import { db, requireFirebase } from './firebase.js'
import { withTimeout } from './timeout.js'

const COLLECTIONS = ['pecas']
const RESTORE_OWNER_EMAIL = 'epaim@dev.com.br'

export function canRestoreBackups(profile) {
  return profile?.email?.toLowerCase() === RESTORE_OWNER_EMAIL
}

export function canCreateBackups(profile) {
  return profile?.role === 'superadmin'
}

function refPath(path) {
  requireFirebase()
  return databaseRef(db, path)
}

function backupsRef(id = '') {
  return refPath(id ? `backups/${id}` : 'backups')
}

async function readPath(path) {
  const snapshot = await get(refPath(path))
  return snapshot.val() || {}
}

function objectToArray(value) {
  return Object.entries(value || {}).map(([id, data]) => ({ id, ...data }))
}

export function watchBackups(callback, onError) {
  const listRef = backupsRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const backups = Object.entries(value)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      callback(backups)
    },
    onError,
  )
  return () => off(listRef)
}

async function rotateBackups() {
  const backups = objectToArray(await readPath('backups')).sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
  )
  const oldBackups = backups.slice(2)
  await Promise.all(oldBackups.map((backup) => remove(backupsRef(backup.id))))
}

export async function createBackup(profile, type = 'manual') {
  const pieces = await readPath('pecas')

  const newBackupRef = push(backupsRef())
  const backup = {
    createdAt: Date.now(),
    createdBy: profile?.uid || '',
    createdByName: profile?.nome || profile?.email || 'Sistema',
    version: '1.1.0',
    type,
    collections: COLLECTIONS,
    counts: {
      pieces: Object.keys(pieces).length,
    },
    data: {
      pieces,
    },
  }

  await withTimeout(set(newBackupRef, backup), 'Não foi possível criar backup.', 12000)
  await rotateBackups()
  try {
    await createAuditLog(profile, {
      action: 'BACKUP',
      entity: 'backup',
      entityId: newBackupRef.key,
      description: `Backup ${type} criado.`,
      after: backup.counts,
    })
  } catch {
    // O backup não deve falhar se o registro de auditoria for recusado.
  }

  return { id: newBackupRef.key, ...backup }
}

export async function ensureAutomaticBackup(profile) {
  if (!canCreateBackups(profile)) return null

  const today = new Date()
  const day = today.getDate()
  const cycleDay = day >= 15 ? 15 : 1
  const cycleKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(cycleDay).padStart(2, '0')}`
  const backups = objectToArray(await readPath('backups'))
  const alreadyCreated = backups.some(
    (backup) => backup.type === 'automatic' && backup.cycleKey === cycleKey,
  )

  if (alreadyCreated) return null

  const backup = await createBackup(profile, 'automatic')
  await set(backupsRef(backup.id), {
    ...backup,
    cycleKey,
  })
  await rotateBackups()
  return { ...backup, cycleKey }
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
    throw new Error('Por enquanto, apenas epaim@dev.com.br pode restaurar backups.')
  }

  await createBackup(profile, 'pre_restore')

  const data = backup.data || {}
  await withTimeout(
    set(refPath('pecas'), data.pieces || {}),
    'Não foi possível restaurar backup.',
    15000,
  )

  try {
    await createAuditLog(profile, {
      action: 'RESTORE',
      entity: 'backup',
      entityId: backup.id,
      description: 'Backup restaurado. Um backup pre_restore foi criado antes da restauração.',
      after: backup.counts,
    })
  } catch {
    // A restauração já foi concluída; falha de log não deve virar erro visual.
  }
}


