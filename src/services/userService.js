import {
  get,
  off,
  onValue,
  ref as databaseRef,
  remove,
  set,
  update,
} from 'firebase/database'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, createSecondaryAuth, db, requireFirebase } from './firebase.js'
import { createAuditLog } from './auditService.js'
import { withTimeout } from './timeout.js'

function adminRef(uid = '') {
  requireFirebase()
  return databaseRef(db, uid ? `admins/${uid}` : 'admins')
}

export async function getAdminProfile(uid) {
  requireFirebase()
  const snapshot = await withTimeout(
    get(adminRef(uid)),
    'Nao foi possivel consultar o professor no Realtime Database. Confira as regras do banco.',
  )
  if (!snapshot.exists()) return null
  return { uid, ...snapshot.val() }
}

export async function loginAdmin(email, password) {
  requireFirebase()
  const credential = await withTimeout(
    signInWithEmailAndPassword(auth, email, password),
    'Login demorou demais. Confira se Authentication > E-mail/senha esta ativado.',
  )
  const profile = await getAdminProfile(credential.user.uid)
  if (!profile) {
    const userEmail = credential.user.email || email
    if (userEmail.toLowerCase().endsWith('@docente.senai.br')) {
      const repairedProfile = {
        nome: userEmail.split('@')[0],
        name: userEmail.split('@')[0],
        email: userEmail.toLowerCase(),
        role: 'admin',
        active: true,
        mustChangePassword: false,
        criadoEm: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await set(adminRef(credential.user.uid), repairedProfile)
      return { uid: credential.user.uid, ...repairedProfile }
    }

    await signOut(auth)
    throw new Error('Este usuario existe no Authentication, mas nao esta cadastrado em admins no Realtime Database.')
  }
  if (profile.active === false) {
    await signOut(auth)
    throw new Error('Este acesso esta desativado. Procure um Super Admin.')
  }
  return profile
}

export async function registerSelfAdmin({ nome, email, password }) {
  requireFirebase()
  if (!email.toLowerCase().endsWith('@docente.senai.br')) {
    throw new Error('Cadastro livre permitido apenas para e-mail @docente.senai.br.')
  }

  const credential = await withTimeout(
    createUserWithEmailAndPassword(auth, email, password),
    'Cadastro no Authentication demorou demais. Confira se E-mail/senha esta ativado.',
  )

  try {
    await withTimeout(
      set(adminRef(credential.user.uid), {
        nome,
        name: nome,
        email: email.toLowerCase(),
        role: 'admin',
        active: true,
        mustChangePassword: false,
        criadoEm: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      'Usuario criado no Authentication, mas o Realtime Database nao aceitou salvar o professor. Confira as regras do Realtime Database.',
    )
  } catch (error) {
    await signOut(auth)
    throw error
  }

  return { uid: credential.user.uid, nome, email, role: 'admin' }
}

export async function createProfessor({ nome, email, password, role }, actingProfile) {
  const secondary = createSecondaryAuth()
  try {
    const credential = await withTimeout(
      createUserWithEmailAndPassword(secondary.auth, email, password),
      'Cadastro do professor demorou demais. Confira o Authentication.',
    )
    await withTimeout(
      set(adminRef(credential.user.uid), {
        nome,
        name: nome,
        email: email.toLowerCase(),
        role,
        active: true,
        mustChangePassword: true,
        createdBy: actingProfile?.uid || '',
        criadoEm: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      'Professor criado no Authentication, mas o Realtime Database nao aceitou salvar.',
    )
    await createAuditLog(actingProfile, {
      action: 'CREATE',
      entity: 'user',
      entityId: credential.user.uid,
      description: `Professor ${email} criado com role ${role}.`,
      after: { nome, email, role },
    })
    await signOut(secondary.auth)
  } finally {
    await secondary.cleanup()
  }
}

export function watchAdmins(callback, onError) {
  const listRef = adminRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const admins = Object.entries(value)
        .map(([uid, data]) => ({ uid, ...data }))
        .sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0))
      callback(admins)
    },
    onError,
  )
  return () => off(listRef)
}

export async function updateProfessor(uid, data, actingProfile, before = null) {
  requireFirebase()
  await update(adminRef(uid), {
    ...data,
    updatedAt: Date.now(),
  })
  await createAuditLog(actingProfile, {
    action: 'UPDATE',
    entity: 'user',
    entityId: uid,
    description: 'Permissoes ou dados de professor atualizados.',
    before,
    after: data,
  })
}

export async function deleteProfessor(uid, actingProfile, before = null) {
  requireFirebase()
  await remove(adminRef(uid))
  await createAuditLog(actingProfile, {
    action: 'DELETE',
    entity: 'user',
    entityId: uid,
    description: 'Professor removido do painel administrativo.',
    before,
  })
}
