import { get, off, onValue, push, ref as databaseRef, remove, set, update } from 'firebase/database'
import { createAuditLog } from './auditService.js'
import { db, requireFirebase } from './firebase.js'
import { deleteStoredFile, imageFileToAttachment, uploadFile } from './storageService.js'
import { initialChecklistItems, maxPhotosPerItem, processSheetTopics } from '../types/moldTech.js'

function listRef(path) {
  requireFirebase()
  return databaseRef(db, path)
}

function entries(snapshot) {
  const value = snapshot.val() || {}
  return Object.entries(value).map(([id, data]) => ({ id, ...data }))
}

export function buildProcessSheet(currentCount, profile = null) {
  const now = Date.now()
  return {
    id: `draft-${now}-${Math.random().toString(36).slice(2)}`,
    name: `Ficha de Processo ${currentCount + 1}`,
    topics: processSheetTopics.reduce((acc, topic) => {
      acc[topic] = { title: topic, notes: '', photos: [] }
      return acc
    }, {}),
    createdBy: profile?.uid || '',
    createdAt: now,
    updatedAt: now,
    publicVisible: false,
  }
}

async function ensureChecklistDefaults(pieceId) {
  const path = `pieceChecklists/${pieceId}`
  const snapshot = await get(listRef(path))
  if (snapshot.exists()) return
  const now = Date.now()
  await Promise.all(
    initialChecklistItems.map((item, index) =>
      set(push(listRef(path)), {
        item,
        status: 'N/A',
        notes: '',
        photos: [],
        order: index + 1,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  )
}

export function watchChecklist(pieceId, callback, onError) {
  ensureChecklistDefaults(pieceId).catch(onError)
  const ref = listRef(`pieceChecklists/${pieceId}`)
  onValue(
    ref,
    (snapshot) => {
      callback(entries(snapshot).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)))
    },
    onError,
  )
  return () => off(ref)
}

export async function createChecklistItem(pieceId, name, profile) {
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('Informe o nome do item.')
  const newRef = push(listRef(`pieceChecklists/${pieceId}`))
  const item = {
    item: cleanName,
    status: 'N/A',
    notes: '',
    photos: [],
    order: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await set(newRef, item)
  await createAuditLog(profile, {
    action: 'CREATE',
    entity: 'checklistItem',
    entityId: newRef.key,
    description: `Item do checklist '${cleanName}' criado.`,
    after: item,
  })
}

export async function updateChecklistItem(pieceId, itemId, updates, profile, before = null) {
  await update(listRef(`pieceChecklists/${pieceId}/${itemId}`), {
    ...updates,
    updatedAt: Date.now(),
  })
  await createAuditLog(profile, {
    action: updates.status && updates.status !== before?.status ? 'STATUS_CHANGE' : 'UPDATE',
    entity: 'checklistItem',
    entityId: itemId,
    description: updates.status
      ? `Status do checklist alterado para ${updates.status}.`
      : 'Item do checklist editado.',
    before,
    after: updates,
  })
}

export async function deleteChecklistItem(pieceId, item, profile) {
  await remove(listRef(`pieceChecklists/${pieceId}/${item.id}`))
  await createAuditLog(profile, {
    action: 'DELETE',
    entity: 'checklistItem',
    entityId: item.id,
    description: `Item do checklist '${item.item}' excluído.`,
    before: item,
  })
}

export async function uploadChecklistPhoto(pieceId, item, file, profile) {
  const photos = item.photos || []
  if (photos.length >= maxPhotosPerItem) throw new Error('Limite de 10 fotos por item.')
  const upload = await uploadFile(file, `pecas/${pieceId}/checklist/${item.id}`)
  const nextPhotos = [...photos, { ...upload, id: `${Date.now()}` }]
  await updateChecklistItem(pieceId, item.id, { photos: nextPhotos }, profile, item)
}

export async function uploadChecklistPhotos(pieceId, item, files, profile) {
  const selectedFiles = Array.isArray(files) ? files : [files]
  const snapshot = await get(listRef(`pieceChecklists/${pieceId}/${item.id}`))
  const latestItem = snapshot.exists() ? { ...item, ...snapshot.val() } : item
  const photos = latestItem.photos || []
  const availableSlots = Math.max(0, maxPhotosPerItem - photos.length)
  const filesToUpload = selectedFiles.slice(0, availableSlots)
  if (!filesToUpload.length) throw new Error('Limite de 10 fotos por item.')

  const uploads = await Promise.all(
    filesToUpload.map((file) => imageFileToAttachment(file)),
  )
  const nextPhotos = [
    ...photos,
    ...uploads.map((upload) => ({
      ...upload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })),
  ]
  await updateChecklistItem(pieceId, item.id, { photos: nextPhotos }, profile, latestItem)
}

export async function removeChecklistPhoto(pieceId, item, photo, profile) {
  await deleteStoredFile(photo.storagePath)
  const nextPhotos = (item.photos || []).filter((entry) => entry.id !== photo.id && entry.url !== photo.url)
  await updateChecklistItem(pieceId, item.id, { photos: nextPhotos }, profile, item)
}

export function watchProcessSheets(pieceId, callback, onError) {
  const ref = listRef(`processSheets/${pieceId}`)
  onValue(
    ref,
    (snapshot) => {
      callback(entries(snapshot).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)))
    },
    onError,
  )
  return () => off(ref)
}

export function watchPublicProcessSheets(pieceId, callback, onError) {
  const ref = listRef(`publicProcessSheets/${pieceId}`)
  onValue(
    ref,
    (snapshot) => {
      callback(entries(snapshot).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)))
    },
    onError,
  )
  return () => off(ref)
}

function publicSheetRef(pieceId, sheetId) {
  return listRef(`publicProcessSheets/${pieceId}/${sheetId}`)
}

function toPublicSheet(sheet) {
  const { createdBy: _createdBy, ...publicSheet } = sheet
  return publicSheet
}

export async function createProcessSheet(pieceId, currentCount, profile) {
  const newRef = push(listRef(`processSheets/${pieceId}`))
  const sheet = buildProcessSheet(currentCount, profile)
  const { id: _draftId, ...persistedSheet } = sheet
  await set(newRef, persistedSheet)
  await createAuditLog(profile, {
    action: 'CREATE',
    entity: 'processSheet',
    entityId: newRef.key,
    description: `${sheet.name} foi criada para o molde.`,
    after: persistedSheet,
  })
}

export async function updateProcessSheet(pieceId, sheetId, updates, profile, before = null) {
  const updatedAt = Date.now()
  const nextUpdates = {
    ...updates,
    updatedAt,
  }
  await update(listRef(`processSheets/${pieceId}/${sheetId}`), nextUpdates)

  const nextSheet = {
    ...(before || {}),
    ...updates,
    id: sheetId,
    updatedAt,
  }
  if (updates.publicVisible === false) {
    await remove(publicSheetRef(pieceId, sheetId))
  } else if (updates.publicVisible === true || before?.publicVisible) {
    await set(publicSheetRef(pieceId, sheetId), toPublicSheet(nextSheet))
  }

  await createAuditLog(profile, {
    action: 'UPDATE',
    entity: 'processSheet',
    entityId: sheetId,
    description: 'Ficha de processo editada.',
    before,
    after: updates,
  })
}

export async function deleteProcessSheet(pieceId, sheet, profile) {
  await remove(listRef(`processSheets/${pieceId}/${sheet.id}`))
  await remove(publicSheetRef(pieceId, sheet.id))
  await createAuditLog(profile, {
    action: 'DELETE',
    entity: 'processSheet',
    entityId: sheet.id,
    description: `${sheet.name} excluída.`,
    before: sheet,
  })
}

export async function uploadProcessPhoto(pieceId, sheet, topicName, file, profile) {
  const topic = sheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
  if ((topic.photos || []).length >= maxPhotosPerItem) throw new Error('Limite de 10 imagens por tópico.')
  const upload = await uploadFile(file, `pecas/${pieceId}/processSheets/${sheet.id}/${topicName}`)
  const topics = {
    ...sheet.topics,
    [topicName]: {
      ...topic,
      photos: [...(topic.photos || []), { ...upload, id: `${Date.now()}` }],
    },
  }
  await updateProcessSheet(pieceId, sheet.id, { topics }, profile, sheet)
  try {
    await createAuditLog(profile, {
      action: 'CREATE',
      entity: 'processSheetImage',
      entityId: sheet.id,
      description: `Imagem adicionada ao tópico ${topicName}.`,
      after: upload,
    })
  } catch {
    // O upload já foi salvo; auditoria extra não deve prender a interface.
  }
}

export async function uploadProcessPhotos(pieceId, sheet, topicName, files, profile) {
  const selectedFiles = Array.isArray(files) ? files : [files]
  const snapshot = await get(listRef(`processSheets/${pieceId}/${sheet.id}`))
  const latestSheet = snapshot.exists() ? { ...sheet, ...snapshot.val() } : sheet
  const topic = latestSheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
  const currentPhotos = topic.photos || []
  const availableSlots = Math.max(0, maxPhotosPerItem - currentPhotos.length)
  const filesToUpload = selectedFiles.slice(0, availableSlots)
  if (!filesToUpload.length) throw new Error('Limite de 10 imagens por tópico.')

  const uploads = await Promise.all(
    filesToUpload.map((file) => imageFileToAttachment(file)),
  )
  const topics = {
    ...latestSheet.topics,
    [topicName]: {
      ...topic,
      photos: [
        ...currentPhotos,
        ...uploads.map((upload) => ({
          ...upload,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        })),
      ],
    },
  }
  await updateProcessSheet(pieceId, sheet.id, { topics }, profile, latestSheet)
  try {
    await createAuditLog(profile, {
      action: 'CREATE',
      entity: 'processSheetImage',
      entityId: latestSheet.id,
      description:
        filesToUpload.length === 1
          ? `Imagem adicionada ao tópico ${topicName}.`
          : `${filesToUpload.length} imagens adicionadas ao tópico ${topicName}.`,
      after: uploads,
    })
  } catch {
    // O upload já foi salvo; auditoria extra não deve prender a interface.
  }
}

export async function removeProcessPhoto(pieceId, sheet, topicName, photo, profile) {
  await deleteStoredFile(photo.storagePath)
  const topic = sheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
  const topics = {
    ...sheet.topics,
    [topicName]: {
      ...topic,
      photos: (topic.photos || []).filter((entry) => entry.id !== photo.id && entry.url !== photo.url),
    },
  }
  await updateProcessSheet(pieceId, sheet.id, { topics }, profile, sheet)
  await createAuditLog(profile, {
    action: 'DELETE',
    entity: 'processSheetImage',
    entityId: sheet.id,
    description: `Imagem removida do tópico ${topicName}.`,
    before: photo,
  })
}

export async function saveDraftProcessSheets(pieceId, sheets, profile, piece = null) {
  if (!sheets?.length) return

  await Promise.all(
    sheets.map(async (sheet) => {
      const newRef = push(listRef(`processSheets/${pieceId}`))
      const topics = {}

      for (const topicName of processSheetTopics) {
        const topic = sheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
        const photos = []

        for (const photo of (topic.photos || []).slice(0, maxPhotosPerItem)) {
          if (photo.file) {
            const upload = await imageFileToAttachment(photo.file)
            photos.push({
              ...upload,
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              uploadedAt: Date.now(),
              uploadedBy: profile?.uid || '',
            })
          } else {
            photos.push(photo)
          }
        }

        topics[topicName] = {
          title: topic.title || topicName,
          notes: topic.notes || '',
          photos,
        }
      }

      const persistedSheet = {
        name: sheet.name,
        topics,
        createdBy: profile?.uid || '',
        createdAt: sheet.createdAt || Date.now(),
        updatedAt: Date.now(),
        publicVisible: Boolean(sheet.publicVisible),
      }

      await set(newRef, persistedSheet)
      if (persistedSheet.publicVisible) {
        await set(publicSheetRef(pieceId, newRef.key), toPublicSheet({ id: newRef.key, ...persistedSheet }))
      }
      await createAuditLog(profile, {
        action: 'CREATE',
        entity: 'processSheet',
        entityId: newRef.key,
        description: `${sheet.name} foi criada para o molde ${piece?.codigo || piece?.nome || pieceId}.`,
        after: persistedSheet,
      })
    }),
  )
}
