import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { maxPhotosPerItem } from '../types/moldTech.js'
import FilePreviewDialog from './FilePreviewDialog.jsx'
import { Button } from './ui/button.jsx'

function withUiTimeout(promise) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error('O upload demorou demais. Tente novamente com imagens menores ou confira a conexão.')),
      18000,
    )
  })
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer))
}

export default function AttachmentGrid({ files = [], canEdit, onUpload, onDelete, compact = false }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(fileList) {
    const selectedFiles = Array.from(fileList || [])
    if (!selectedFiles.length) return

    const availableSlots = Math.max(0, maxPhotosPerItem - files.length)
    const filesToUpload = selectedFiles.slice(0, availableSlots)
    if (!filesToUpload.length) {
      setError('Limite de 10 imagens atingido.')
      return
    }

    setUploading(true)
    setError('')
    try {
      await withUiTimeout(Promise.resolve(onUpload?.(filesToUpload)))
      if (selectedFiles.length > filesToUpload.length) {
        setError('Algumas imagens não foram adicionadas porque o limite é de 10 por tópico.')
      }
    } catch (err) {
      setError(err.message || 'Não foi possível enviar as imagens.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {files.slice(0, maxPhotosPerItem).map((file) => (
            <div key={file.id || file.url} className="group relative">
              <button
                type="button"
                onClick={() => setPreview(file)}
                className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img src={file.url} alt={file.name || ''} className="h-full w-full object-cover" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete?.(file)}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white opacity-0 shadow-soft transition group-hover:opacity-100"
                  aria-label="Excluir foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && files.length < maxPhotosPerItem && (
          <>
            <Button
              type="button"
              size={compact ? 'icon' : 'sm'}
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {!compact && 'Upload'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                handleFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </>
        )}
      </div>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
