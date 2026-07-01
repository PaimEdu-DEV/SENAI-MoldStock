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

const COLLECTIONS = ['pecas', 'ocorrencias', 'admins', 'logs']

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
  const [pieces, occurrences, users, logs] = await Promise.all([
    readPath('pecas'),
    readPath('ocorrencias'),
    readPath('admins'),
    readPath('logs'),
  ])

  const newBackupRef = push(backupsRef())
  const backup = {
    createdAt: Date.now(),
    createdBy: profile?.uid || '',
    createdByName: profile?.nome || profile?.email || 'Sistema',
    version: '1.0.0',
    type,
    collections: COLLECTIONS,
    counts: {
      pieces: Object.keys(pieces).length,
      occurrences: Object.keys(occurrences).length,
      users: Object.keys(users).length,
      logs: Object.keys(logs).length,
    },
    data: {
      pieces,
      occurrences,
      users,
      logs,
    },
  }

  await withTimeout(set(newBackupRef, backup), 'Nao foi possivel criar backup.', 12000)
  await rotateBackups()
  await createAuditLog(profile, {
    action: 'BACKUP',
    entity: 'backup',
    entityId: newBackupRef.key,
    description: `Backup ${type} criado.`,
    after: backup.counts,
  })

  return { id: newBackupRef.key, ...backup }
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
  await createBackup(profile, 'pre_restore')

  const data = backup.data || {}
  await withTimeout(
    Promise.all([
      set(refPath('pecas'), data.pieces || {}),
      set(refPath('ocorrencias'), data.occurrences || {}),
      set(refPath('admins'), data.users || {}),
      set(refPath('logs'), data.logs || {}),
    ]),
    'Nao foi possivel restaurar backup.',
    15000,
  )

  await createAuditLog(profile, {
    action: 'RESTORE',
    entity: 'backup',
    entityId: backup.id,
    description: 'Backup restaurado. Um backup pre_restore foi criado antes da restauracao.',
    after: backup.counts,
  })
}
