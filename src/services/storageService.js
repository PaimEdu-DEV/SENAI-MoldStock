import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { storage, requireFirebase } from './firebase.js'

function withStorageTimeout(promise, message, timeoutMs = 120000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer))
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function imageToDataUrl(file, options = {}) {
  const image = await readImage(file)
  const maxSide = options.maxSide || 1100
  const quality = options.quality || 0.72
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
  const width = Math.round(image.width * ratio)
  const height = Math.round(image.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

export async function imageFileToAttachment(file) {
  const url = await imageToDataUrl(file)
  return {
    url,
    storagePath: '',
    fileName: file.name,
    mimeType: 'image/jpeg',
    size: file.size || 0,
    extension: 'jpg',
  }
}

export async function fileToDatabaseAttachment(file) {
  return {
    url: await readFileAsDataUrl(file),
    storagePath: '',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size || 0,
    extension: getFileExtension(file.name),
    storageMode: 'database',
  }
}

export function getFileExtension(fileName = '') {
  return String(fileName).split('.').pop()?.toLowerCase() || ''
}

export function assertAllowedFile(file, allowedExtensions) {
  if (!file) throw new Error('Selecione um arquivo.')
  const extension = getFileExtension(file.name)
  if (!allowedExtensions.includes(extension)) {
    throw new Error(`Formato .${extension || '?'} não permitido.`)
  }
}

export function formatFileSize(bytes = 0) {
  const size = Number(bytes || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function isImageFile(file = {}) {
  const type = file.type || file.mimeType || ''
  const extension = getFileExtension(file.name || file.fileName)
  return type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)
}

export function isPdfFile(file = {}) {
  const type = file.type || file.mimeType || ''
  const extension = getFileExtension(file.name || file.fileName)
  return type === 'application/pdf' || extension === 'pdf'
}

export async function uploadFile(file, pathPrefix) {
  requireFirebase()
  const cleanName = file.name.replace(/[^\w.-]+/g, '-')
  const path = `${pathPrefix}/${Date.now()}-${cleanName}`
  const target = storageRef(storage, path)
  let url = ''
  let storagePath = path

  try {
    const snapshot = await withStorageTimeout(
      uploadBytes(target, file, {
        contentType: file.type || undefined,
      }),
      'O envio do arquivo demorou demais. Confira sua conexão e tente novamente.',
    )
    url = await withStorageTimeout(
      getDownloadURL(snapshot.ref),
      'O arquivo subiu, mas o link demorou demais para ser gerado.',
      30000,
    )
  } catch (error) {
    if (!file.type?.startsWith('image/')) throw error
    url = await imageToDataUrl(file)
    storagePath = ''
  }

  return {
    url,
    storagePath,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size || 0,
    extension: getFileExtension(file.name),
  }
}

export async function deleteStoredFile(path) {
  if (!path) return
  requireFirebase()
  await deleteObject(storageRef(storage, path))
}
