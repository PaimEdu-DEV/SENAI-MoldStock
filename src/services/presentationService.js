import { get, ref as databaseRef, update } from 'firebase/database'
import { OWNER_PROTECTED_MESSAGE, isOwner } from '../config/security.js'
import { createAuditLog } from './auditService.js'
import { createBackup } from './backupService.js'
import { db, requireFirebase } from './firebase.js'

const testPatterns = ['teste', 'test', 'demo', 'exemplo', 'temporario', 'temporário', 'validacao', 'validação']
const criticalLogActions = new Set([
  'BACKUP',
  'RESTORE',
  'BACKUP_PROTECTION_ON',
  'BACKUP_PROTECTION_OFF',
  'BACKUP_PROTECTION_OVERRIDE',
  'USER_DELETE',
  'PERMISSION_DENIED',
])

function refPath(path) {
  requireFirebase()
  return databaseRef(db, path)
}

async function readPath(path) {
  const snapshot = await get(refPath(path))
  return snapshot.val() || {}
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function containsTestSignal(...values) {
  const text = normalize(values.join(' '))
  return testPatterns.some((pattern) => text.includes(pattern))
}

function getObjectEntries(value = {}) {
  return Object.entries(value || {})
}

export async function preparePresentationEnvironment(profile) {
  if (!isOwner(profile)) {
    await createAuditLog(profile, {
      action: 'PERMISSION_DENIED',
      entity: 'system',
      description: 'Tentativa bloqueada de preparar ambiente por usuário sem permissão de Owner.',
    }).catch(() => {})
    throw new Error('Somente o Owner pode preparar o ambiente para apresentação.')
  }

  await createBackup(profile, 'pre_restore')
  await createAuditLog(profile, {
    action: 'BACKUP',
    entity: 'backup',
    description: 'Backup criado antes da preparação para apresentação.',
  }).catch(() => {})

  const [pieces, materials, machines, occurrences, documents, pieceFiles, logs] = await Promise.all([
    readPath('pecas'),
    readPath('materials'),
    readPath('machines'),
    readPath('ocorrencias'),
    readPath('documents'),
    readPath('pieceFiles'),
    readPath('logs'),
  ])

  const updates = {}
  const counts = {
    pieces: 0,
    materials: 0,
    machines: 0,
    occurrences: 0,
    documents: 0,
    pieceFiles: 0,
    logs: 0,
  }

  getObjectEntries(pieces).forEach(([id, piece]) => {
    if (containsTestSignal(piece.nome, piece.codigo, piece.descricao, piece.observacoes)) {
      updates[`pecas/${id}/deleted`] = true
      updates[`pecas/${id}/deletedAt`] = Date.now()
      updates[`pecas/${id}/deletedBy`] = profile.uid
      updates[`pecas/${id}/deletedByName`] = profile.nome || profile.email || 'Owner'
      counts.pieces += 1
    }
  })

  getObjectEntries(materials).forEach(([id, item]) => {
    if (containsTestSignal(item.name, item.nome)) {
      updates[`materials/${id}`] = null
      counts.materials += 1
    }
  })

  getObjectEntries(machines).forEach(([id, item]) => {
    if (containsTestSignal(item.name, item.nome)) {
      updates[`machines/${id}`] = null
      counts.machines += 1
    }
  })

  getObjectEntries(occurrences).forEach(([id, item]) => {
    if (containsTestSignal(item.titulo, item.title, item.descricao, item.description, item.pieceName)) {
      updates[`ocorrencias/${id}`] = null
      counts.occurrences += 1
    }
  })

  getObjectEntries(documents).forEach(([id, item]) => {
    if (containsTestSignal(item.title, item.description, item.fileName)) {
      updates[`documents/${id}`] = null
      counts.documents += 1
    }
  })

  getObjectEntries(pieceFiles).forEach(([pieceId, files]) => {
    getObjectEntries(files).forEach(([id, item]) => {
      if (containsTestSignal(item.title, item.description, item.fileName)) {
        updates[`pieceFiles/${pieceId}/${id}`] = null
        counts.pieceFiles += 1
      }
    })
  })

  getObjectEntries(logs).forEach(([id, log]) => {
    if (criticalLogActions.has(log.action)) return
    if (containsTestSignal(log.description, log.entityId, log.userName, log.userEmail)) {
      updates[`archivedLogs/${id}`] = {
        ...log,
        archivedAt: Date.now(),
        archivedBy: profile.uid,
        archiveReason: 'Preparação para apresentação',
      }
      updates[`logs/${id}`] = null
      counts.logs += 1
    }
  })

  if (Object.keys(updates).length > 0) {
    await update(refPath('/'), updates)
  }

  await createAuditLog(profile, {
    action: 'CONFIG_UPDATE',
    entity: 'system',
    description: 'Ambiente preparado para apresentação.',
    after: counts,
  })

  return counts
}

export async function assertOwnerIsProtected(target, actingProfile) {
  if (!isOwner(target)) return
  await createAuditLog(actingProfile, {
    action: 'PERMISSION_DENIED',
    entity: 'user',
    entityId: target?.uid || null,
    description: 'Tentativa bloqueada de remover/alterar/desativar Owner.',
    before: target,
  }).catch(() => {})
  throw new Error(OWNER_PROTECTED_MESSAGE)
}
