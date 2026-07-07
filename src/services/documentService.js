import { off, onValue, push, ref as databaseRef, remove, set, update } from 'firebase/database'
import { createAuditLog } from './auditService.js'
import { db, requireFirebase } from './firebase.js'
import {
  assertAllowedFile,
  deleteStoredFile,
  fileToDatabaseAttachment,
  uploadFile,
} from './storageService.js'
import { documentAllowedExtensions, pieceFileAllowedExtensions } from '../types/moldTech.js'

function ref(path) {
  requireFirebase()
  return databaseRef(db, path)
}

function toList(snapshot) {
  const value = snapshot.val() || {}
  return Object.entries(value)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
}

export function watchDocuments(callback, onError) {
  const listRef = ref('documents')
  onValue(listRef, (snapshot) => callback(toList(snapshot)), onError)
  return () => off(listRef)
}

export function watchPieceFiles(pieceId, callback, onError) {
  const listRef = ref(`pieceFiles/${pieceId}`)
  onValue(listRef, (snapshot) => callback(toList(snapshot)), onError)
  return () => off(listRef)
}

function buildMetadata(data, upload, profile) {
  const now = Date.now()
  return {
    title: String(data.title || upload.fileName).trim(),
    description: data.description || '',
    category: data.category || '',
    responsible: data.responsible || profile?.nome || profile?.email || 'Professor',
    url: upload.url,
    storagePath: upload.storagePath,
    fileName: upload.fileName,
    mimeType: upload.mimeType,
    size: upload.size,
    extension: upload.extension,
    createdAt: now,
    updatedAt: now,
  }
}

export async function createDocument(data, file, profile) {
  assertAllowedFile(file, documentAllowedExtensions)
  const upload = await uploadFile(file, 'documents')
  const newRef = push(ref('documents'))
  const document = buildMetadata(data, upload, profile)
  await set(newRef, document)
  await createAuditLog(profile, {
    action: 'CREATE',
    entity: 'document',
    entityId: newRef.key,
    description: `Documento '${document.title}' enviado.`,
    after: document,
  })
}

export async function updateDocument(id, updates, profile, before = null) {
  await update(ref(`documents/${id}`), { ...updates, updatedAt: Date.now() })
  await createAuditLog(profile, {
    action: 'UPDATE',
    entity: 'document',
    entityId: id,
    description: `Documento '${updates.title || before?.title || id}' editado.`,
    before,
    after: updates,
  })
}

export async function deleteDocument(document, profile) {
  await deleteStoredFile(document.storagePath)
  await remove(ref(`documents/${document.id}`))
  await createAuditLog(profile, {
    action: 'DELETE',
    entity: 'document',
    entityId: document.id,
    description: `Documento '${document.title}' excluído.`,
    before: document,
  })
}

export async function createPieceFile(pieceId, data, file, profile) {
  assertAllowedFile(file, pieceFileAllowedExtensions)
  const upload = await fileToDatabaseAttachment(file)
  const newRef = push(ref(`pieceFiles/${pieceId}`))
  const pieceFile = buildMetadata(data, upload, profile)
  await set(newRef, pieceFile)
  await createAuditLog(profile, {
    action: 'CREATE',
    entity: 'pieceFile',
    entityId: newRef.key,
    description: `Arquivo '${pieceFile.title}' enviado ao molde.`,
    after: { ...pieceFile, pieceId },
  })
}

export async function updatePieceFile(pieceId, id, updates, profile, before = null) {
  await update(ref(`pieceFiles/${pieceId}/${id}`), { ...updates, updatedAt: Date.now() })
  await createAuditLog(profile, {
    action: 'UPDATE',
    entity: 'pieceFile',
    entityId: id,
    description: `Arquivo '${updates.title || before?.title || id}' editado.`,
    before,
    after: updates,
  })
}

export async function deletePieceFile(pieceId, file, profile) {
  await deleteStoredFile(file.storagePath)
  await remove(ref(`pieceFiles/${pieceId}/${file.id}`))
  await createAuditLog(profile, {
    action: 'DELETE',
    entity: 'pieceFile',
    entityId: file.id,
    description: `Arquivo '${file.title}' excluído do molde.`,
    before: file,
  })
}
