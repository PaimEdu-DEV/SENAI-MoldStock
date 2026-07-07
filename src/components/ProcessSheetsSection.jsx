import { CalendarClock, ChevronDown, Edit3, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth.js'
import { useToast } from '../contexts/toastContext.js'
import { formatDate } from '../lib/utils.js'
import {
  buildProcessSheet,
  createProcessSheet,
  deleteProcessSheet,
  removeProcessPhoto,
  updateProcessSheet,
  uploadProcessPhotos,
  watchProcessSheets,
  watchPublicProcessSheets,
} from '../services/moldTechService.js'
import { processSheetTopics } from '../types/moldTech.js'
import AttachmentGrid from './AttachmentGrid.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import TextPromptDialog from './TextPromptDialog.jsx'
import { Button } from './ui/button.jsx'
import { Card } from './ui/card.jsx'
import { Textarea } from './ui/input.jsx'

function updateSheetList(sheets, sheetId, updater) {
  return sheets.map((sheet) => (sheet.id === sheetId ? updater(sheet) : sheet))
}

export default function ProcessSheetsSection({
  pieceId,
  sheets: controlledSheets,
  onSheetsChange,
  draftMode = false,
  title = 'Fichas de Processo',
  description = 'Parâmetros por unidade, organizados em cartões técnicos.',
  publicOnly = false,
}) {
  const { profile, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const [localSheets, setLocalSheets] = useState([])
  const [openId, setOpenId] = useState('')
  const [error, setError] = useState('')
  const [renameTarget, setRenameTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [dialogLoading, setDialogLoading] = useState(false)

  const sheets = controlledSheets || localSheets
  const canEdit = isSuperAdmin

  useEffect(() => {
    if (draftMode || !pieceId) return undefined
    const watchSheets = publicOnly ? watchPublicProcessSheets : watchProcessSheets
    const unsubscribe = watchSheets(pieceId, setLocalSheets, (err) => setError(err.message))
    return unsubscribe
  }, [draftMode, pieceId, publicOnly])

  function setSheets(next) {
    if (onSheetsChange) onSheetsChange(next)
    else setLocalSheets(next)
  }

  async function addSheet() {
    if (!canEdit) return
    if (draftMode) {
      const next = [...sheets, buildProcessSheet(sheets.length, profile)]
      setSheets(next)
      setOpenId(next.at(-1).id)
      return
    }
    await createProcessSheet(pieceId, sheets.length, profile)
  }

  async function confirmRename(name) {
    if (!renameTarget || name === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    setDialogLoading(true)
    setError('')
    if (draftMode) {
      setSheets(updateSheetList(sheets, renameTarget.id, (item) => ({ ...item, name, updatedAt: Date.now() })))
      setRenameTarget(null)
      setDialogLoading(false)
      return
    }

    try {
      await updateProcessSheet(pieceId, renameTarget.id, { name }, profile, renameTarget)
      toast({ title: 'Ficha renomeada', tone: 'success' })
      setRenameTarget(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível renomear', description: err.message, tone: 'error' })
    } finally {
      setDialogLoading(false)
    }
  }

  async function confirmRemoveSheet() {
    if (!deleteTarget) return
    setDialogLoading(true)
    setError('')
    if (draftMode) {
      setSheets(sheets.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDialogLoading(false)
      return
    }
    try {
      await deleteProcessSheet(pieceId, deleteTarget, profile)
      toast({ title: 'Ficha excluída', tone: 'success' })
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível excluir', description: err.message, tone: 'error' })
    } finally {
      setDialogLoading(false)
    }
  }

  function updateTopicNotes(sheet, topicName, notes) {
    const topic = sheet.topics?.[topicName] || { title: topicName, photos: [] }
    const topics = { ...sheet.topics, [topicName]: { ...topic, notes } }

    if (draftMode) {
      setSheets(updateSheetList(sheets, sheet.id, (item) => ({ ...item, topics, updatedAt: Date.now() })))
      return
    }

    updateProcessSheet(pieceId, sheet.id, { topics }, profile, sheet)
  }

  async function togglePublicVisibility(sheet) {
    if (!canEdit) return
    const publicVisible = !sheet.publicVisible

    if (draftMode) {
      setSheets(updateSheetList(sheets, sheet.id, (item) => ({ ...item, publicVisible, updatedAt: Date.now() })))
      return
    }

    try {
      await updateProcessSheet(pieceId, sheet.id, { publicVisible }, profile, sheet)
      toast({
        title: publicVisible ? 'Ficha visível ao público' : 'Ficha oculta do público',
        tone: 'success',
      })
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível alterar visibilidade', description: err.message, tone: 'error' })
    }
  }

  function uploadDraftPhotos(sheet, topicName, files) {
    const topic = sheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
    const currentPhotos = topic.photos || []
    const availableSlots = Math.max(0, 10 - currentPhotos.length)
    const selectedFiles = Array.isArray(files) ? files : [files]
    const filesToAdd = selectedFiles.slice(0, availableSlots)

    if (!filesToAdd.length) {
      setError('Limite de 10 imagens por tópico.')
      return
    }

    const nextPhotos = filesToAdd.map((file) => ({
      id: `draft-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      file,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }))
    const topics = {
      ...sheet.topics,
      [topicName]: { ...topic, photos: [...currentPhotos, ...nextPhotos] },
    }
    setSheets(updateSheetList(sheets, sheet.id, (item) => ({ ...item, topics, updatedAt: Date.now() })))
  }

  function removeDraftPhoto(sheet, topicName, photo) {
    if (photo.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url)
    const topic = sheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
    const topics = {
      ...sheet.topics,
      [topicName]: {
        ...topic,
        photos: (topic.photos || []).filter((entry) => entry.id !== photo.id),
      },
    }
    setSheets(updateSheetList(sheets, sheet.id, (item) => ({ ...item, topics, updatedAt: Date.now() })))
  }

  return (
    <Card className="grid gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {canEdit && (
          <Button type="button" variant="secondary" onClick={addSheet}>
            <Plus className="h-4 w-4" />
            Inserir ficha de processo
          </Button>
        )}
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="grid gap-3">
        {sheets.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            {publicOnly ? 'Nenhuma ficha pública cadastrada.' : 'Nenhuma ficha cadastrada.'}
          </p>
        )}

        {sheets.map((sheet) => {
          const open = openId === sheet.id
          return (
            <article key={sheet.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 text-left"
                  onClick={() => setOpenId(open ? '' : sheet.id)}
                >
                  <span>
                    <strong className="block text-slate-950">{sheet.name}</strong>
                    <span className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Última atualização: {draftMode ? 'rascunho' : formatDate(sheet.updatedAt)}
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
                </button>
                {canEdit && !publicOnly && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={sheet.publicVisible ? 'Ocultar do público' : 'Mostrar ao público'}
                    aria-label={sheet.publicVisible ? 'Ocultar ficha do público' : 'Mostrar ficha ao público'}
                    onClick={() => togglePublicVisibility(sheet)}
                  >
                    {sheet.publicVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {open && (
                <div className="grid gap-4 border-t border-slate-200 bg-slate-50/70 p-4">
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setRenameTarget(sheet)}>
                        <Edit3 className="h-4 w-4" />
                        Renomear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-600"
                        onClick={() => setDeleteTarget(sheet)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {processSheetTopics.map((topicName) => {
                      const topic = sheet.topics?.[topicName] || { title: topicName, notes: '', photos: [] }
                      return (
                        <section key={topicName} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <h3 className="font-semibold text-slate-950">{topicName}</h3>
                          <AttachmentGrid
                            files={topic.photos || []}
                            canEdit={canEdit}
                            compact
                            onUpload={(files) =>
                              draftMode
                                ? uploadDraftPhotos(sheet, topicName, files)
                                : uploadProcessPhotos(pieceId, sheet, topicName, files, profile)
                            }
                            onDelete={(photo) =>
                              draftMode
                                ? removeDraftPhoto(sheet, topicName, photo)
                                : removeProcessPhoto(pieceId, sheet, topicName, photo, profile)
                            }
                          />
                          <label className="grid gap-2 text-sm font-semibold text-slate-700">
                            Observações
                            <Textarea
                              className="min-h-20"
                              disabled={!canEdit}
                              value={topic.notes || ''}
                              onChange={(event) => updateTopicNotes(sheet, topicName, event.target.value)}
                              placeholder="Parâmetros, cuidados e ajustes"
                            />
                          </label>
                        </section>
                      )
                    })}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <TextPromptDialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Renomear ficha de processo"
        description={`Altere o nome de "${renameTarget?.name}".`}
        label="Nome da ficha"
        initialValue={renameTarget?.name || ''}
        confirmLabel="Salvar alteração"
        loading={dialogLoading}
        onConfirm={confirmRename}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir ficha de processo?"
        description={`Você está prestes a excluir "${deleteTarget?.name}". Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir ficha"
        loading={dialogLoading}
        onConfirm={confirmRemoveSheet}
      />
    </Card>
  )
}
