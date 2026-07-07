import { CheckSquare, Edit3, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'
import TextPromptDialog from './TextPromptDialog.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useToast } from '../contexts/toastContext.js'
import { useTaxonomy } from '../hooks/useTaxonomy.js'
import { cn } from '../lib/utils.js'
import {
  createTaxonomyItem,
  deleteTaxonomyItem,
  updateTaxonomyItem,
} from '../services/taxonomyService.js'
import { Button } from './ui/button.jsx'

export default function TaxonomySelector({ type, title, selectedIds, onChange }) {
  const { profile, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const { items, error, setError } = useTaxonomy(type)
  const [editing, setEditing] = useState(null)
  const [prompt, setPrompt] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(false)
  const selectedCount = selectedIds?.length || 0
  const allSelected = items.length > 0 && selectedCount === items.length
  const singular = type === 'machines' ? 'Máquina' : 'Material'
  const newLabel = type === 'machines' ? 'Nova Máquina' : 'Novo Material'

  function toggle(id) {
    const current = selectedIds || []
    onChange(current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  function toggleAll() {
    onChange(allSelected ? [] : items.map((item) => item.id))
  }

  async function handlePromptConfirm(name) {
    setLoading(true)
    setError('')
    try {
      if (prompt?.mode === 'edit') {
        await updateTaxonomyItem(type, prompt.item.id, name, profile, prompt.item)
        toast({ title: `${singular} atualizado`, tone: 'success' })
      } else {
        await createTaxonomyItem(type, name, profile)
        toast({ title: `${singular} criado`, tone: 'success' })
      }
      setPrompt(null)
      setEditing(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível salvar', description: err.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function removeItem() {
    if (!deleteTarget) return
    setLoading(true)
    setError('')
    try {
      await deleteTaxonomyItem(type, deleteTarget, profile)
      onChange((selectedIds || []).filter((id) => id !== deleteTarget.id))
      toast({ title: `${singular} excluído`, tone: 'success' })
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível excluir', description: err.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
          <p className="text-xs font-medium text-slate-500">Seleção múltipla vinculada ao molde.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={allSelected ? 'quiet' : 'secondary'}
            onClick={toggleAll}
            disabled={!items.length}
          >
            {allSelected ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {allSelected ? 'Limpar' : 'Marcar todas'}
          </Button>
          {isSuperAdmin && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setPrompt({ mode: 'create' })}
            >
              <Plus className="h-4 w-4" />
              {newLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = selectedIds?.includes(item.id)
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 transition',
                checked ? 'border-senai-blue/40 ring-4 ring-senai-blue/10' : 'border-slate-200',
              )}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-senai-blue"
                  checked={Boolean(checked)}
                  onChange={() => toggle(item.id)}
                />
                <span className="truncate">{item.name}</span>
              </label>
              {isSuperAdmin && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditing(item.id)
                      setPrompt({ mode: 'edit', item })
                    }}
                    aria-label={`Editar ${item.name}`}
                  >
                    <Edit3 className={cn('h-4 w-4', editing === item.id && 'text-senai-blue')} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-600"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Excluir ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      <TextPromptDialog
        open={Boolean(prompt)}
        onOpenChange={(open) => {
          if (!open) {
            setPrompt(null)
            setEditing(null)
          }
        }}
        title={prompt?.mode === 'edit' ? `Editar ${singular.toLowerCase()}` : newLabel}
        description={
          prompt?.mode === 'edit'
            ? `Altere o nome de "${prompt.item?.name}".`
            : `Cadastre um novo item em ${title.toLowerCase()}.`
        }
        label={`Nome do ${singular.toLowerCase()}`}
        initialValue={prompt?.item?.name || ''}
        confirmLabel={prompt?.mode === 'edit' ? 'Salvar alteração' : 'Criar'}
        loading={loading}
        onConfirm={handlePromptConfirm}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Excluir ${singular.toLowerCase()}?`}
        description={`Você está prestes a excluir "${deleteTarget?.name}". Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir"
        loading={loading}
        onConfirm={removeItem}
      />
    </section>
  )
}
