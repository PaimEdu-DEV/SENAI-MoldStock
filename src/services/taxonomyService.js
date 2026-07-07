import { get, off, onValue, push, ref as databaseRef, remove, set, update } from 'firebase/database'
import { db, requireFirebase } from './firebase.js'
import { createAuditLog } from './auditService.js'
import { initialMachines, initialMaterials } from '../types/moldTech.js'

const taxonomyConfig = {
  materials: {
    path: 'materials',
    entity: 'material',
    label: 'Material',
    defaults: initialMaterials,
  },
  machines: {
    path: 'machines',
    entity: 'machine',
    label: 'Máquina',
    defaults: initialMachines,
  },
}

function taxonomyRef(type, id = '') {
  requireFirebase()
  const config = taxonomyConfig[type]
  return databaseRef(db, id ? `${config.path}/${id}` : config.path)
}

function sortByName(items) {
  return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
}

async function ensureDefaults(type) {
  const snapshot = await get(taxonomyRef(type))
  if (snapshot.exists()) return
  const config = taxonomyConfig[type]
  await Promise.all(
    config.defaults.map((name, index) =>
      set(push(taxonomyRef(type)), {
        name,
        active: true,
        order: index + 1,
        createdAt: Date.now(),
      }),
    ),
  )
}

export function watchTaxonomy(type, callback, onError) {
  ensureDefaults(type).catch(onError)
  const listRef = taxonomyRef(type)
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      callback(sortByName(Object.entries(value).map(([id, data]) => ({ id, ...data }))))
    },
    onError,
  )
  return () => off(listRef)
}

export async function createTaxonomyItem(type, name, profile) {
  const config = taxonomyConfig[type]
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('Informe um nome.')
  const newRef = push(taxonomyRef(type))
  const item = { name: cleanName, active: true, createdAt: Date.now(), updatedAt: Date.now() }
  await set(newRef, item)
  await createAuditLog(profile, {
    action: 'CREATE',
    entity: config.entity,
    entityId: newRef.key,
    description: `${config.label} '${cleanName}' criado.`,
    after: item,
  })
}

export async function updateTaxonomyItem(type, id, name, profile, before = null) {
  const config = taxonomyConfig[type]
  const updates = { name: String(name || '').trim(), updatedAt: Date.now() }
  if (!updates.name) throw new Error('Informe um nome.')
  await update(taxonomyRef(type, id), updates)
  await createAuditLog(profile, {
    action: 'UPDATE',
    entity: config.entity,
    entityId: id,
    description: `${config.label} '${updates.name}' editado.`,
    before,
    after: updates,
  })
}

export async function deleteTaxonomyItem(type, item, profile) {
  const config = taxonomyConfig[type]
  await remove(taxonomyRef(type, item.id))
  await createAuditLog(profile, {
    action: 'DELETE',
    entity: config.entity,
    entityId: item.id,
    description: `${config.label} '${item.name}' excluído.`,
    before: item,
  })
}
