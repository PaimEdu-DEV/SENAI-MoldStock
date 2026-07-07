import { get, push, ref as databaseRef, update } from 'firebase/database'
import { OWNER_PROTECTED_MESSAGE, isOwner } from '../config/security.js'
import { initialMachines, initialMaterials } from '../types/moldTech.js'
import { createAuditLog } from './auditService.js'
import { createBackup } from './backupService.js'
import { db, requireFirebase } from './firebase.js'
import { deleteStoredFile } from './storageService.js'

const RESET_CONFIRMATION = 'ZERAR MOLDSTOCK'
const TEST_PATTERNS = ['teste', 'test', 'demo', 'exemplo']
const REAL_MATERIALS = new Set(initialMaterials.map(normalizeName))
const REAL_MACHINES = new Set(
  initialMachines.filter((name) => normalizeName(name) !== 'todas').map(normalizeName),
)

function refPath(path) {
  requireFirebase()
  return databaseRef(db, path)
}

async function readPath(path) {
  const snapshot = await get(refPath(path))
  return snapshot.val() || {}
}

function entries(value = {}) {
  return Object.entries(value || {})
}

function normalizeName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isClearlyTestValue(...values) {
  const text = normalizeName(values.join(' '))
  return TEST_PATTERNS.some((pattern) => text.includes(pattern))
}

function collectStoragePathsFromValue(value, bucket = new Set()) {
  if (!value) return bucket
  if (Array.isArray(value)) {
    value.forEach((item) => collectStoragePathsFromValue(item, bucket))
    return bucket
  }
  if (typeof value === 'object') {
    if (value.storagePath) bucket.add(value.storagePath)
    Object.values(value).forEach((item) => collectStoragePathsFromValue(item, bucket))
  }
  return bucket
}

function countNested(value = {}) {
  return Object.values(value || {}).reduce(
    (total, child) => total + Object.keys(child || {}).length,
    0,
  )
}

function shouldRemoveMaterial(item) {
  return isClearlyTestValue(item?.name, item?.nome)
}

function shouldRemoveMachine(item) {
  const name = normalizeName(item?.name || item?.nome)
  return name === 'todas' || isClearlyTestValue(item?.name, item?.nome)
}

function preserveTaxonomyDefaults(updates, type, currentItems, defaults, realSet) {
  const existingNames = new Set(
    entries(currentItems)
      .map(([, item]) => normalizeName(item.name || item.nome))
      .filter(Boolean),
  )

  defaults.forEach((name, index) => {
    const normalized = normalizeName(name)
    if (!realSet.has(normalized) || existingNames.has(normalized)) return
    const newRef = push(refPath(type))
    updates[`${type}/${newRef.key}`] = {
      name,
      active: true,
      order: index + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  })
}

export async function resetSystemForDelivery(profile, confirmationText) {
  if (!isOwner(profile)) {
    await createAuditLog(profile, {
      action: 'PERMISSION_DENIED',
      entity: 'system',
      description: 'Tentativa bloqueada de zerar sistema para entrega por usuario sem permissao de Owner.',
    }).catch(() => {})
    throw new Error(OWNER_PROTECTED_MESSAGE)
  }

  if (confirmationText !== RESET_CONFIRMATION) {
    throw new Error('Digite ZERAR MOLDSTOCK para confirmar a limpeza final.')
  }

  const backup = await createBackup(profile, 'manual', {
    confirmSuspicious: true,
    label: 'Backup antes da limpeza final para entrega',
    description:
      'Backup criado antes de remover moldes, ocorrencias, checklists, fichas, arquivos de moldes e logs antigos para entrega do sistema.',
    logDescription: 'Backup antes da limpeza final para entrega.',
  })

  if (!backup?.id) {
    throw new Error('Backup nao criado. A limpeza foi cancelada por seguranca.')
  }

  const [
    pieces,
    occurrences,
    checklists,
    processSheets,
    pieceFiles,
    logs,
    backups,
    materials,
    machines,
  ] = await Promise.all([
    readPath('pecas'),
    readPath('ocorrencias'),
    readPath('pieceChecklists'),
    readPath('processSheets'),
    readPath('pieceFiles'),
    readPath('logs'),
    readPath('backups'),
    readPath('materials'),
    readPath('machines'),
  ])

  const storagePaths = collectStoragePathsFromValue({
    pieceChecklists: checklists,
    processSheets,
    pieceFiles,
  })

  const updates = {
    pecas: null,
    ocorrencias: null,
    pieceChecklists: null,
    processSheets: null,
    pieceFiles: null,
    'systemProtection/backup': {
      active: false,
      deliveryResetAt: Date.now(),
      deliveryResetBy: profile.uid,
      deliveryResetByName: profile.nome || profile.email || 'Owner',
      reasons: [],
    },
  }

  entries(logs).forEach(([id, log]) => {
    updates[`archivedLogs/${id}`] = {
      ...log,
      archivedAt: Date.now(),
      archivedBy: profile.uid,
      archiveReason: 'Limpeza final para entrega',
    }
    updates[`logs/${id}`] = null
  })

  entries(backups).forEach(([id, item]) => {
    if (id === backup.id) return
    updates[`backups/${id}/hiddenFromList`] = true
    updates[`backups/${id}/archivedAt`] = Date.now()
    updates[`backups/${id}/archiveReason`] = 'Ocultado da tela principal pela limpeza final para entrega'
    updates[`backups/${id}/valid`] = item?.baselineAfterDeliveryReset === true ? true : item?.valid !== false
  })

  entries(materials).forEach(([id, item]) => {
    if (shouldRemoveMaterial(item)) updates[`materials/${id}`] = null
  })

  entries(machines).forEach(([id, item]) => {
    if (shouldRemoveMachine(item)) updates[`machines/${id}`] = null
  })

  preserveTaxonomyDefaults(updates, 'materials', materials, initialMaterials, REAL_MATERIALS)
  preserveTaxonomyDefaults(updates, 'machines', machines, initialMachines, REAL_MACHINES)

  await update(refPath('/'), updates)

  const cleanBaseline = await createBackup(profile, 'manual', {
    confirmSuspicious: true,
    skipIntegrity: true,
    label: 'Baseline tecnico do sistema zerado para entrega',
    description: 'Backup tecnico oculto usado como linha de base do estado limpo apos a entrega.',
    hiddenFromList: true,
    baselineAfterDeliveryReset: true,
    skipAudit: true,
  })

  if (cleanBaseline?.id) {
    await update(refPath(`backups/${cleanBaseline.id}`), {
      hiddenFromList: true,
      baselineAfterDeliveryReset: true,
      valid: true,
    })
  }

  await Promise.allSettled([...storagePaths].map((path) => deleteStoredFile(path)))

  const result = {
    backupId: backup.id,
    backupCreated: true,
    pieces: Object.keys(pieces || {}).length,
    occurrences: Object.keys(occurrences || {}).length,
    checklists: countNested(checklists),
    processSheets: countNested(processSheets),
    pieceFiles: countNested(pieceFiles),
    logs: Object.keys(logs || {}).length,
    storageFiles: storagePaths.size,
    materials: entries(materials).filter(([, item]) => shouldRemoveMaterial(item)).length,
    machines: entries(machines).filter(([, item]) => shouldRemoveMachine(item)).length,
    backupsPreserved: Object.keys(backups || {}).length + (cleanBaseline?.id ? 1 : 0),
    backupsHidden:
      Object.keys(backups || {}).filter((id) => id !== backup.id).length + (cleanBaseline?.id ? 1 : 0),
    usersPreserved: true,
    ownerPreserved: true,
  }

  await createAuditLog(profile, {
    action: 'CONFIG_UPDATE',
    entity: 'system',
    description: 'Sistema zerado para entrega pelo Owner.',
    after: result,
  })

  return result
}

export { RESET_CONFIRMATION }
