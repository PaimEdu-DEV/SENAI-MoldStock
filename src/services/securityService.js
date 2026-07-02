import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth'
import { ref as databaseRef, update } from 'firebase/database'
import { createAuditLog } from './auditService.js'
import { auth, db, requireFirebase } from './firebase.js'
import { withTimeout } from './timeout.js'

export async function sendPasswordReset(email) {
  requireFirebase()
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined
  return withTimeout(
    sendPasswordResetEmail(auth, email, {
      url: `${origin || 'https://senai-mold-stock.vercel.app'}/login`,
      handleCodeInApp: false,
    }),
    'Nao foi possivel enviar o e-mail de recuperacao.',
    10000,
  )
}

export async function reauthenticateCurrentUser(password) {
  requireFirebase()
  const user = auth.currentUser
  if (!user?.email) {
    throw new Error('Usuario autenticado nao encontrado.')
  }

  const credential = EmailAuthProvider.credential(user.email, password)
  return withTimeout(
    reauthenticateWithCredential(user, credential),
    'Nao foi possivel confirmar sua senha atual.',
    10000,
  )
}

export async function completeFirstAccessPassword({ newPassword, profile }) {
  requireFirebase()
  const user = auth.currentUser
  if (!user?.email) {
    throw new Error('Usuario autenticado nao encontrado.')
  }

  await withTimeout(
    updatePassword(user, newPassword),
    'Nao foi possivel alterar a senha.',
    10000,
  )
  try {
    await update(databaseRef(db, `admins/${user.uid}`), {
      mustChangePassword: false,
      temporaryPassword: null,
      updatedAt: Date.now(),
    })
  } catch (error) {
    if (String(error?.message || '').includes('PERMISSION_DENIED')) {
      throw new Error('Acesso negado ao finalizar primeiro acesso. Publique as regras atualizadas do banco e tente novamente.')
    }
    throw error
  }
  await createAuditLog(profile, {
    action: 'UPDATE',
    entity: 'user',
    entityId: user.uid,
    description: 'Senha inicial definida no primeiro acesso.',
  }).catch(() => {})
}
