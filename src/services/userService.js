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
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { auth, createSecondaryAuth, db, requireFirebase } from './firebase.js'
import { createAuditLog } from './auditService.js'
import { withTimeout } from './timeout.js'
import {
  OWNER_EMAIL,
  OWNER_PROTECTED_MESSAGE,
  OWNER_ROLE,
  isOwner,
} from '../config/security.js'

const BOOTSTRAP_SUPERADMIN_EMAIL = OWNER_EMAIL
const BOOTSTRAP_SUPERADMIN_PASSWORD = '1234567'

export function isRootSuperAdmin(profile) {
  return isOwner(profile)
}

function isAdministrativeProfile(profile) {
  return isOwner(profile) || (['admin', 'superadmin'].includes(profile?.role) && !profile?.adminAccessRevoked)
}

async function logBlockedOwnerAttempt(actingProfile, target, description) {
  await createAuditLog(actingProfile, {
    action: 'PERMISSION_DENIED',
    entity: 'user',
    entityId: target?.uid || null,
    description,
    before: target,
  }).catch(() => {})
}

async function assertNotOwnerTarget(target, actingProfile, description) {
  if (!isOwner(target)) return
  await logBlockedOwnerAttempt(
    actingProfile,
    target,
    description || 'Tentativa bloqueada de alterar/remover/desativar Owner.',
  )
  throw new Error(OWNER_PROTECTED_MESSAGE)
}

function adminRef(uid = '') {
  requireFirebase()
  return databaseRef(db, uid ? `admins/${uid}` : 'admins')
}

export async function getAdminProfile(uid) {
  requireFirebase()
  const snapshot = await withTimeout(
    get(adminRef(uid)),
    'Não foi possível consultar o professor. Confira as regras do banco.',
  )
  if (!snapshot.exists()) return null
  return { uid, ...snapshot.val() }
}

async function createBootstrapSuperAdmin(email, password) {
  if (
    email.toLowerCase() !== BOOTSTRAP_SUPERADMIN_EMAIL ||
    password !== BOOTSTRAP_SUPERADMIN_PASSWORD
  ) {
    throw new Error('Credenciais inválidas.')
  }

  let credential
  try {
    credential = await withTimeout(
      createUserWithEmailAndPassword(auth, email, password),
      'Não foi possível criar o administrador inicial.',
    )
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já existe. Use a senha correta ou fale com o administrador.')
    }
    throw error
  }
  const profile = {
    nome: 'Eduardo Paim',
    name: 'Eduardo Paim',
    email: BOOTSTRAP_SUPERADMIN_EMAIL,
    role: OWNER_ROLE,
    active: true,
    mustChangePassword: false,
    bootstrap: true,
    criadoEm: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await withTimeout(
    set(adminRef(credential.user.uid), profile),
    'Administrador criado, mas o banco recusou salvar o perfil. Confira as regras.',
  )
  return { uid: credential.user.uid, ...profile }
}

export async function loginAdmin(email, password) {
  requireFirebase()
  let credential
  try {
    credential = await withTimeout(
      signInWithEmailAndPassword(auth, email, password),
      'O login demorou demais. Confira se e-mail/senha está ativo.',
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
        role: OWNER_ROLE,
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

    await signOut(auth)
    throw new Error('Este usuário existe na autenticação, mas não está cadastrado como professor.')
  }
  if (isOwner(profile) && (profile.role !== OWNER_ROLE || profile.active !== true)) {
    const ownerPatch = {
      role: OWNER_ROLE,
      active: true,
      updatedAt: Date.now(),
    }
    await update(adminRef(credential.user.uid), ownerPatch)
    return { ...profile, ...ownerPatch }
  }
  if (profile.active === false) {
    await signOut(auth)
    throw new Error('Este acesso está desativado. Procure um administrador.')
  }
  return profile
}

export async function createProfessor({ nome, email, password, role }, actingProfile) {
  const secondary = createSecondaryAuth()
  try {
    const adminsSnapshot = await get(adminRef())
    const admins = adminsSnapshot.val() || {}
    const existingEntry = Object.entries(admins).find(
      ([, data]) => data.email?.toLowerCase() === email.toLowerCase(),
    )

    if (existingEntry) {
      const [uid, existing] = existingEntry
      if (existing.active !== false) {
        throw new Error('Este e-mail já está cadastrado como professor.')
      }
      await assertNotOwnerTarget({ uid, ...existing }, actingProfile, 'Tentativa bloqueada de reativar/alterar Owner.')
      if (existing.temporaryPassword) {
        await signInWithEmailAndPassword(
          secondary.auth,
          existing.email,
          existing.temporaryPassword,
        )
        await updatePassword(secondary.auth.currentUser, password)
      }
      await withTimeout(
        set(adminRef(uid), {
          ...existing,
          nome,
          name: nome,
          email: email.toLowerCase(),
          role,
          active: true,
          mustChangePassword: true,
          temporaryPassword: password,
          updatedAt: Date.now(),
        }),
        'Não foi possível reativar o professor no banco.',
      )
      await createAuditLog(actingProfile, {
        action: 'USER_CREATE',
        entity: 'user',
        entityId: uid,
        description: `${nome} foi reativado com senha temporária.`,
        before: existing,
        after: { nome, email, role, active: true, mustChangePassword: true },
      })
      await signOut(secondary.auth)
      return
    }

    let credential
    try {
      credential = await withTimeout(
        createUserWithEmailAndPassword(secondary.auth, email, password),
        'O cadastro do professor demorou demais. Confira a autenticação.',
      )
    } catch (error) {
      if (error.code !== 'auth/email-already-in-use') {
        throw error
      }

      credential = await withTimeout(
        signInWithEmailAndPassword(secondary.auth, email, password),
        'Este e-mail já existe. Use a mesma senha temporária anterior ou remova o usuário no Firebase Authentication.',
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
      'Professor criado, mas o banco não aceitou salvar o perfil.',
    )
    await createAuditLog(actingProfile, {
      action: 'USER_CREATE',
      entity: 'user',
      entityId: credential.user.uid,
      description: `${nome} foi cadastrado como professor.`,
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
        .filter(isAdministrativeProfile)
        .sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0))
      callback(admins)
    },
    onError,
  )
  return () => off(listRef)
}

export async function updateProfessor(uid, data, actingProfile, before = null) {
  requireFirebase()
  await assertNotOwnerTarget(before, actingProfile, 'Tentativa bloqueada de alterar role/acesso do Owner.')
  await update(adminRef(uid), {
    ...data,
    updatedAt: Date.now(),
  })
  let description = 'Dados do professor atualizados.'
  let action = 'UPDATE'
  if (Object.hasOwn(data, 'role') && before?.role !== data.role) {
    const name = before?.nome || before?.name || before?.email || 'Professor'
    if (data.role === 'superadmin') {
      action = 'USER_PROMOTE'
      description = `${name} foi promovido para Super Admin.`
    } else {
      action = 'USER_DEMOTE'
      description = `${name} foi rebaixado para professor.`
    }
  } else if (Object.hasOwn(data, 'active')) {
    const name = before?.nome || before?.name || before?.email || 'Professor'
    description = data.active ? `${name} reativado.` : `${name} desativado.`
  }
  await createAuditLog(actingProfile, {
    action,
    entity: 'user',
    entityId: uid,
    description,
    before,
    after: data,
  })
}

export async function deleteProfessor(uid, actingProfile, before = null) {
  requireFirebase()
  await revokeAdminAccess(uid, actingProfile, before)
}

export async function revokeAdminAccess(uid, actingProfile, before = null) {
  requireFirebase()
  await assertNotOwnerTarget(before, actingProfile, 'Tentativa bloqueada de revogar acesso administrativo do Owner.')

  const now = Date.now()
  const updateData = {
    role: 'public',
    active: true,
    adminAccessRevoked: true,
    adminAccessRevokedAt: now,
    adminAccessRevokedBy: actingProfile?.uid || '',
    adminAccessRevokedByName: actingProfile?.nome || actingProfile?.name || actingProfile?.email || 'Sistema',
    adminAccessRevokedReason: 'Acesso administrativo revogado pelo painel',
    adminRevocationNoticePending: true,
    mustChangePassword: false,
    temporaryPassword: null,
    updatedAt: now,
  }
  await update(adminRef(uid), updateData)
  await createAuditLog(actingProfile, {
    action: 'USER_DELETE',
    entity: 'user',
    entityId: uid,
    description: `${before?.nome || before?.email || 'Professor'} teve o acesso administrativo revogado.`,
    before,
    after: updateData,
  })
}

export async function acknowledgeAdminRevocation(profile) {
  requireFirebase()
  if (!profile?.uid || isOwner(profile)) return
  await createAuditLog(profile, {
    action: 'UPDATE',
    entity: 'user',
    entityId: profile.uid,
    description: 'Usuário notificado sobre revogação de acesso administrativo e removido da base administrativa.',
  }).catch(() => {})
  await remove(adminRef(profile.uid))
  if (auth.currentUser?.uid === profile.uid) {
    await deleteUser(auth.currentUser).catch(() => {})
  }
}


