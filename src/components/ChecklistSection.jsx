import { ChevronDown, Edit3, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/useAuth.js'
import { useToast } from '../contexts/toastContext.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import {
  createChecklistItem,
  deleteChecklistItem,
  removeChecklistPhoto,
  updateChecklistItem,
  uploadChecklistPhotos,
  watchChecklist,
} from '../services/moldTechService.js'
import { checklistStatuses } from '../types/moldTech.js'
import AttachmentGrid from './AttachmentGrid.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import TextPromptDialog from './TextPromptDialog.jsx'
import { Badge } from './ui/badge.jsx'
import { Button } from './ui/button.jsx'
import { Card } from './ui/card.jsx'
import { Select, Textarea } from './ui/input.jsx'

function statusVariant(status) {
  if (status === 'OK') return 'ok'
  if (status === 'Atenção') return 'maintenance'
  if (status === 'Danificado') return 'broken'
  return 'neutral'
}

export default function ChecklistSection({ pieceId }) {
  const { profile, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem(`moldstock-checklist-collapsed-${pieceId}`)
    return saved ? saved === 'true' : false
  })
  const [openItems, setOpenItems] = useState([])
  const [prompt, setPrompt] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = watchChecklist(pieceId, setItems, (err) => setError(err.message))
    return unsubscribe
  }, [pieceId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`moldstock-checklist-collapsed-${pieceId}`, String(collapsed))
    }
  }, [collapsed, pieceId])

  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile])

  const summary = useMemo(() => {
    const byStatus = checklistStatuses.reduce((acc, status) => ({ ...acc, [status]: 0 }), {})
    items.forEach((item) => {
      const status = item.status || 'N/A'
      byStatus[status] = Number(byStatus[status] || 0) + 1
    })
    return {
      byStatus,
      pending: items.filter((item) => ['Atenção', 'Danificado'].includes(item.status)).length,
      withNotes: items.filter((item) => item.notes?.trim()).length,
    }
  }, [items])

  function toggleItem(id) {
    setOpenItems((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    )
  }

  async function savePrompt(name) {
    setLoading(true)
    setError('')
    try {
      if (prompt?.mode === 'edit') {
        await updateChecklistItem(pieceId, prompt.item.id, { item: name }, profile, prompt.item)
        toast({ title: 'Item do checklist atualizado', tone: 'success' })
      } else {
        await createChecklistItem(pieceId, name, profile)
        toast({ title: 'Item do checklist criado', tone: 'success' })
      }
      setPrompt(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível salvar', description: err.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setLoading(true)
    setError('')
    try {
      await deleteChecklistItem(pieceId, deleteTarget, profile)
      toast({ title: 'Item do checklist excluído', tone: 'success' })
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível excluir', description: err.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="grid gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Checklist</h2>
          <p className="mt-1 text-sm text-slate-500">Inspeção técnica independente deste molde.</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {items.length} itens cadastrados · {summary.pending} pendentes ·{' '}
            {summary.byStatus.OK || 0} OK · {summary.byStatus['N/A'] || 0} N/A ·{' '}
            {summary.withNotes} com observações
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setCollapsed(!collapsed)}>
            <ChevronDown className={`h-4 w-4 transition ${collapsed ? '' : 'rotate-180'}`} />
            {collapsed ? 'Mostrar checklist' : 'Ocultar checklist'}
          </Button>
          {isSuperAdmin && !collapsed && (
            <Button type="button" variant="secondary" onClick={() => setPrompt({ mode: 'create' })}>
              <Plus className="h-4 w-4" />
              Criar item
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}

      {collapsed && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <Badge variant="neutral">{items.length} itens</Badge>
          <Badge variant="ok">{summary.byStatus.OK || 0} OK</Badge>
          <Badge variant="maintenance">{summary.byStatus['Atenção'] || 0} atenção</Badge>
          <Badge variant="broken">{summary.byStatus.Danificado || 0} danificados</Badge>
          <Badge variant="neutral">{summary.byStatus['N/A'] || 0} N/A</Badge>
        </div>
      )}

      {!collapsed && (
        <div className="grid gap-3">
          {items.map((item) => {
            const open = openItems.includes(item.id)
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => toggleItem(item.id)}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-slate-950">{item.item}</strong>
                    <span className="mt-1 block text-xs font-medium text-slate-500">
                      {(item.photos || []).length} fotos ·{' '}
                      {item.notes?.trim() ? 'com observações' : 'sem observações'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={statusVariant(item.status)}>{item.status || 'N/A'}</Badge>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {open && (
                  <div className="grid gap-4 border-t border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[170px_1.3fr_220px]">
                    <label className="grid content-start gap-2 text-sm font-semibold text-slate-700">
                      Status
                      <Select
                        value={item.status || 'N/A'}
                        onChange={(event) =>
                          updateChecklistItem(pieceId, item.id, { status: event.target.value }, profile, item)
                        }
                      >
                        {checklistStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Observações
                      <Textarea
                        className="min-h-20"
                        value={item.notes || ''}
                        onChange={(event) =>
                          updateChecklistItem(pieceId, item.id, { notes: event.target.value }, profile, item)
                        }
                        placeholder="Observações técnicas do item"
                      />
                    </label>
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Fotos</span>
                      <AttachmentGrid
                        files={item.photos || []}
                        canEdit
                        compact
                        onUpload={(files) => uploadChecklistPhotos(pieceId, item, files, profile)}
                        onDelete={(photo) => removeChecklistPhoto(pieceId, item, photo, profile)}
                      />
                    </div>
                    {isSuperAdmin && (
                      <div className="flex flex-wrap gap-2 lg:col-span-3">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setPrompt({ mode: 'edit', item })}>
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <TextPromptDialog
        open={Boolean(prompt)}
        onOpenChange={(open) => !open && setPrompt(null)}
        title={prompt?.mode === 'edit' ? 'Editar item do checklist' : 'Criar item do checklist'}
        description={
          prompt?.mode === 'edit'
            ? `Altere o nome de "${prompt.item?.item}".`
            : 'Adicione um novo item técnico ao checklist.'
        }
        label="Nome do item"
        initialValue={prompt?.item?.item || ''}
        confirmLabel={prompt?.mode === 'edit' ? 'Salvar alteração' : 'Criar item'}
        loading={loading}
        onConfirm={savePrompt}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir item do checklist?"
        description={`Você está prestes a excluir "${deleteTarget?.item}". Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir item"
        loading={loading}
        onConfirm={confirmDelete}
      />
    </Card>
  )
}
