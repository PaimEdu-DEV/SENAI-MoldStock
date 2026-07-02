import {
  get,
  off,
  onValue,
  push,
  ref as databaseRef,
  remove,
  set,
  update,
} from 'firebase/database'
import { db, requireFirebase } from './firebase.js'
import { createAuditLog } from './auditService.js'
import { withTimeout } from './timeout.js'

const codeSorter = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
})

function sortByCode(items) {
  return items.sort((a, b) =>
    codeSorter.compare(String(a.codigo || ''), String(b.codigo || '')),
  )
}

function piecesRef(id = '') {
  requireFirebase()
  return databaseRef(db, id ? `pecas/${id}` : 'pecas')
}

export function watchPieces(callback, onError) {
  const listRef = piecesRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const pieces = Object.entries(value).map(([id, data]) => ({ id, ...data }))
      callback(sortByCode(pieces))
    },
    onError,
  )
  return () => off(listRef)
}

export async function getPiece(id) {
  requireFirebase()
  const snapshot = await get(piecesRef(id))
  if (!snapshot.exists()) return null
  return { id, ...snapshot.val() }
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function optimizeImage(file) {
  if (!file) return ''

  const image = await readImage(file)
  const maxSide = 1100
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
  const width = Math.round(image.width * ratio)
  const height = Math.round(image.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', 0.78)
}

export async function createPiece(data, files, userProfile) {
  const newPieceRef = push(piecesRef())
  const now = Date.now()
  const [fotoPecaUrl, fotoMoldeUrl] = await Promise.all([
    optimizeImage(files.fotoPeca),
    optimizeImage(files.fotoMolde),
  ])

  await withTimeout(set(newPieceRef, {
    ...data,
    codigo: String(data.codigo).trim(),
    quantidade: Number(data.quantidade || 1),
    fotoPecaUrl,
    fotoMoldeUrl,
    criadoPor: userProfile?.nome || userProfile?.email || 'Professor',
    criadoEm: now,
    atualizadoEm: now,
  }), 'Não foi possível salvar a peça no Realtime Database. Confira as regras de escrita.')
  await createAuditLog(userProfile, {
    action: 'CREATE',
    entity: 'piece',
    entityId: newPieceRef.key,
    description: `Peça ${data.nome} criada.`,
    after: { ...data, codigo: String(data.codigo).trim() },
  })

  return { id: newPieceRef.key, imageError: '' }
}

export async function updatePiece(id, data, files, userProfile, before = null) {
  requireFirebase()
  const updates = {
    ...data,
    codigo: String(data.codigo).trim(),
    quantidade: Number(data.quantidade || 1),
    atualizadoEm: Date.now(),
  }

  const [fotoPecaUrl, fotoMoldeUrl] = await Promise.all([
    optimizeImage(files.fotoPeca),
    optimizeImage(files.fotoMolde),
  ])

  if (fotoPecaUrl) updates.fotoPecaUrl = fotoPecaUrl
  if (fotoMoldeUrl) updates.fotoMoldeUrl = fotoMoldeUrl

  await withTimeout(
    update(piecesRef(id), updates),
    'Não foi possível atualizar a peça no Realtime Database. Confira as regras de escrita.',
  )
  await createAuditLog(userProfile, {
    action: 'UPDATE',
    entity: 'piece',
    entityId: id,
    description: `Peça ${data.nome} atualizada.`,
    before,
    after: updates,
  })
}

export async function updatePieceStatus(id, status, userProfile, before = null) {
  requireFirebase()
  await update(piecesRef(id), {
    status,
    atualizadoEm: Date.now(),
  })
  await createAuditLog(userProfile, {
    action: 'UPDATE',
    entity: 'piece',
    entityId: id,
    description: `Status alterado para ${status}.`,
    before,
    after: { status },
  })
}

export async function deletePiece(id, userProfile, before = null) {
  requireFirebase()
  await remove(piecesRef(id))
  await createAuditLog(userProfile, {
    action: 'DELETE',
    entity: 'piece',
    entityId: id,
    description: 'Peça excluída.',
    before,
  })
}


