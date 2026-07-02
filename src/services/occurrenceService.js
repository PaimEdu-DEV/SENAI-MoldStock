import {
  off,
  onValue,
  push,
  ref as databaseRef,
  set,
} from 'firebase/database'
import { db, requireFirebase } from './firebase.js'
import { createAuditLog } from './auditService.js'

function occurrencesRef(id = '') {
  requireFirebase()
  return databaseRef(db, id ? `ocorrencias/${id}` : 'ocorrencias')
}

export function watchOccurrences(pieceId, callback, onError) {
  const listRef = occurrencesRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const items = Object.entries(value)
        .map(([id, data]) => ({ id, ...data }))
        .filter((item) => item.pecaId === pieceId)
        .sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0))
      callback(items)
    },
    onError,
  )
  return () => off(listRef)
}

export async function createOccurrence(data, userProfile) {
  const newOccurrenceRef = push(occurrencesRef())
  await set(newOccurrenceRef, {
    ...data,
    registradoPor: userProfile?.nome || userProfile?.email || 'Professor',
    criadoEm: Date.now(),
  })
  await createAuditLog(userProfile, {
    action: 'CREATE',
    entity: 'occurrence',
    entityId: newOccurrenceRef.key,
    description: `Ocorrência registrada: ${data.tipo}.`,
    after: data,
  })
}


