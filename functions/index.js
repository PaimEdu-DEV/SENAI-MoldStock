const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

admin.initializeApp()

async function requireSuperAdmin(request) {
  const uid = request.auth && request.auth.uid
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Login obrigatorio.')
  }

  const snapshot = await admin.database().ref(`admins/${uid}`).get()
  const profile = snapshot.val()
  if (!profile || profile.role !== 'superadmin' || profile.active === false) {
    throw new HttpsError('permission-denied', 'Apenas Super Admin pode executar esta acao.')
  }
  return { uid, profile }
}

async function writeLog(actor, payload) {
  await admin.database().ref('logs').push({
    userId: actor.uid,
    userName: actor.profile.nome || actor.profile.name || 'Sistema',
    userEmail: actor.profile.email || '',
    userRole: actor.profile.role || 'superadmin',
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId || null,
    description: payload.description,
    before: payload.before || null,
    after: payload.after || null,
    createdAt: Date.now(),
  })
}

exports.createProfessor = onCall(async (request) => {
  const actor = await requireSuperAdmin(request)
  const { nome, email, password, role } = request.data || {}

  if (!nome || !email || !password || !['admin', 'superadmin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Dados invalidos.')
  }

  const user = await admin.auth().createUser({
    email,
    password,
    displayName: nome,
    disabled: false,
  })

  await admin.database().ref(`admins/${user.uid}`).set({
    nome,
    name: nome,
    email: String(email).toLowerCase(),
    role,
    active: true,
    mustChangePassword: true,
    createdAt: Date.now(),
    criadoEm: Date.now(),
    createdBy: actor.uid,
    updatedAt: Date.now(),
  })

  await writeLog(actor, {
    action: 'CREATE',
    entity: 'user',
    entityId: user.uid,
    description: `Professor ${email} criado via Cloud Function.`,
    after: { nome, email, role },
  })

  return { uid: user.uid }
})

exports.setProfessorRole = onCall(async (request) => {
  const actor = await requireSuperAdmin(request)
  const { uid, role } = request.data || {}
  if (!uid || !['admin', 'superadmin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Role invalida.')
  }

  const ref = admin.database().ref(`admins/${uid}`)
  const before = (await ref.get()).val()
  await ref.update({ role, updatedAt: Date.now() })

  await writeLog(actor, {
    action: 'UPDATE',
    entity: 'user',
    entityId: uid,
    description: `Role atualizada para ${role}.`,
    before,
    after: { role },
  })

  return { ok: true }
})

exports.setProfessorActive = onCall(async (request) => {
  const actor = await requireSuperAdmin(request)
  const { uid, active } = request.data || {}
  if (!uid || typeof active !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Status invalido.')
  }

  const ref = admin.database().ref(`admins/${uid}`)
  const before = (await ref.get()).val()
  await ref.update({ active, updatedAt: Date.now() })
  await admin.auth().updateUser(uid, { disabled: !active }).catch(() => null)

  await writeLog(actor, {
    action: active ? 'UPDATE' : 'DELETE',
    entity: 'user',
    entityId: uid,
    description: active ? 'Professor reativado.' : 'Professor desativado.',
    before,
    after: { active },
  })

  return { ok: true }
})

// Backup/restore can be moved here when Functions is enabled in the Firebase project.
// The frontend implementation already uses the same data shape and rotation policy.
