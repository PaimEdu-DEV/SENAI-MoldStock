import {
  get,
  off,
  onValue,
  push,
  ref as databaseRef,
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

function normalizePieceData(data) {
  return {
    ...data,
    codigo: String(data.codigo).trim(),
    quantidade: Number(data.quantidade || 1),
    materialIds: data.materialIds || [],
    machineIds: data.machineIds || [],
    pesoKg: data.pesoKg === '' || data.pesoKg == null ? '' : Number(data.pesoKg),
    dimensoes: {
      altura: data.dimensoes?.altura === '' || data.dimensoes?.altura == null ? '' : Number(data.dimensoes.altura),
      largura: data.dimensoes?.largura === '' || data.dimensoes?.largura == null ? '' : Number(data.dimensoes.largura),
      comprimento: data.dimensoes?.comprimento === '' || data.dimensoes?.comprimento == null ? '' : Number(data.dimensoes.comprimento),
    },
  }
}

export function watchPieces(callback, onError) {
  const listRef = piecesRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const pieces = Object.entries(value)
        .map(([id, data]) => ({ id, ...data }))
        .filter((piece) => piece.deleted !== true)
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
  const piece = { id, ...snapshot.val() }
  if (piece.deleted === true) return null
  return piece
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
    ...normalizePieceData(data),
    fotoPecaUrl,
    fotoMoldeUrl,
    criadoPor: userProfile?.nome || userProfile?.email || 'Professor',
    criadoEm: now,
    atualizadoEm: now,
  }), 'Não foi possível salvar o molde no Realtime Database. Confira as regras de escrita.')
  await createAuditLog(userProfile, {
    action: 'CREATE',
    entity: 'piece',
    entityId: newPieceRef.key,
    description: `Molde '${data.nome}' foi cadastrado.`,
    after: normalizePieceData(data),
  })

  return { id: newPieceRef.key, imageError: '' }
}

export async function updatePiece(id, data, files, userProfile, before = null) {
  requireFirebase()
  const updates = {
    ...normalizePieceData(data),
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
    'Não foi possível atualizar o molde no Realtime Database. Confira as regras de escrita.',
  )
  await createAuditLog(userProfile, {
    action: 'UPDATE',
    entity: 'piece',
    entityId: id,
    description: `Molde '${data.nome}' foi atualizado.`,
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
    action: 'STATUS_CHANGE',
    entity: 'piece',
    entityId: id,
    description: `Status do molde alterado para ${status}.`,
    before,
    after: { status },
  })
}

export async function deletePiece(id, userProfile, before = null) {
  requireFirebase()
  const deletion = {
    deleted: true,
    deletedAt: Date.now(),
    deletedBy: userProfile?.uid || '',
    deletedByName: userProfile?.nome || userProfile?.email || 'Professor',
    atualizadoEm: Date.now(),
  }
  await update(piecesRef(id), deletion)
  await createAuditLog(userProfile, {
    action: 'DELETE',
    entity: 'piece',
    entityId: id,
    description: before?.nome
      ? `Molde '${before.nome}${before.codigo ? ` (${before.codigo})` : ''}' foi excluído do sistema.`
      : 'Um molde foi excluído do sistema.',
    before,
    after: deletion,
  })
}


