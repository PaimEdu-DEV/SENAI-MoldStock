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

const BOOTSTRAP_SUPERADMIN_EMAIL = 'epaim@dev.com.br'
const BOOTSTRAP_SUPERADMIN_PASSWORD = '1234567'

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

async function createBootstrapSuperAdmin(email, password) {
  if (
    email.toLowerCase() !== BOOTSTRAP_SUPERADMIN_EMAIL ||
    password !== BOOTSTRAP_SUPERADMIN_PASSWORD
  ) {
    throw new Error('Credenciais invalidas.')
  }

  let credential
  try {
    credential = await withTimeout(
      createUserWithEmailAndPassword(auth, email, password),
      'Nao foi possivel criar o Super Admin inicial no Authentication.',
    )
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail ja existe. Use a senha correta ou redefina a senha.')
    }
    throw error
  }
  const profile = {
    nome: 'Eduardo Paim',
    name: 'Eduardo Paim',
    email: BOOTSTRAP_SUPERADMIN_EMAIL,
    role: 'superadmin',
    active: true,
    mustChangePassword: false,
    bootstrap: true,
    criadoEm: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await withTimeout(
    set(adminRef(credential.user.uid), profile),
    'Super Admin criado no Authentication, mas o banco recusou salvar o perfil. Confira as regras.',
  )
  return { uid: credential.user.uid, ...profile }
}

export async function loginAdmin(email, password) {
  requireFirebase()
  let credential
  try {
    credential = await withTimeout(
      signInWithEmailAndPassword(auth, email, password),
      'Login demorou demais. Confira se Authentication > E-mail/senha esta ativado.',
    )
  } catch (error) {
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-login-credentials'
    ) {
      return createBootstrapSuperAdmin(email, password)
    }
    throw error
  }
  const profile = await getAdminProfile(credential.user.uid)
  if (!profile) {
    const userEmail = credential.user.email || email
    if (userEmail.toLowerCase() === BOOTSTRAP_SUPERADMIN_EMAIL) {
      const bootstrapProfile = {
        nome: 'Eduardo Paim',
        name: 'Eduardo Paim',
        email: BOOTSTRAP_SUPERADMIN_EMAIL,
        role: 'superadmin',
        active: true,
        mustChangePassword: false,
        bootstrap: true,
        criadoEm: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await set(adminRef(credential.user.uid), bootstrapProfile)
      return { uid: credential.user.uid, ...bootstrapProfile }
    }

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

export async function createProfessor({ nome, email, password, role }, actingProfile) {
  const secondary = createSecondaryAuth()
  try {
    let credential
    try {
      credential = await withTimeout(
        createUserWithEmailAndPassword(secondary.auth, email, password),
        'Cadastro do professor demorou demais. Confira o Authentication.',
      )
    } catch (error) {
      if (error.code !== 'auth/email-already-in-use') {
        throw error
      }

      credential = await withTimeout(
        signInWithEmailAndPassword(secondary.auth, email, password),
        'Este e-mail ja existe no Authentication. Use a mesma senha temporaria anterior ou remova o usuario no Firebase Authentication.',
      )
    }

    await withTimeout(
      set(adminRef(credential.user.uid), {
        nome,
        name: nome,
        email: email.toLowerCase(),
        role,
        active: true,
        mustChangePassword: true,
        temporaryPassword: password,
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
      after: { nome, email, role, mustChangePassword: true },
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
