import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = requiredKeys.every((key) => {
  const value = import.meta.env[key]
  return value && !String(value).includes('coloque_') && !String(value).includes('000000')
})

export const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

export const auth = app ? getAuth(app) : null
export const db = app ? getDatabase(app) : null
export const storage = app ? getStorage(app) : null

export function requireFirebase() {
  if (!isFirebaseConfigured || !app || !auth || !db || !storage) {
    throw new Error('Firebase ainda não configurado. Preencha o arquivo .env e reinicie o Vite.')
  }
}

export function createSecondaryAuth() {
  requireFirebase()
  const name = `admin-create-${Date.now()}`
  const secondaryApp = initializeApp(firebaseConfig, name)
  return {
    auth: getAuth(secondaryApp),
    cleanup: () => deleteApp(secondaryApp),
  }
}


