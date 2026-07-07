import { Download, Edit3, FileArchive, FileImage, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/useAuth.js'
import { formatDate } from '../lib/utils.js'
import { formatFileSize, getFileExtension, isImageFile, isPdfFile } from '../services/storageService.js'
import FilePreviewDialog from './FilePreviewDialog.jsx'
import { Badge } from './ui/badge.jsx'
import { Button } from './ui/button.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog.jsx'
import { Input, Select, Textarea } from './ui/input.jsx'

function fileIcon(file) {
  if (isImageFile(file)) return FileImage
  if (isPdfFile(file)) return FileText
  return FileArchive
}

export default function FileLibrary({
  title,
  description,
  files,
  categories = [],
  canManage,
  onCreate,
  onUpdate,
  onDelete,
  createLabel = 'Novo documento',
  showCategory = true,
}) {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [type, setType] = useState('Todos')
  const [preview, setPreview] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', category: categories[0] || '', responsible: '' })
  const [file, setFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const types = useMemo(
    () => ['Todos', ...Array.from(new Set(files.map((item) => item.extension || getFileExtension(item.fileName)).filter(Boolean)))],
    [files],
  )

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return files.filter((item) => {
      const haystack = [item.title, item.name, item.category, item.responsible].join(' ').toLowerCase()
      const itemType = item.extension || getFileExtension(item.fileName)
      return (
        (!search || haystack.includes(search)) &&
        (category === 'Todas' || item.category === category) &&
        (type === 'Todos' || itemType === type)
      )
    })
  }, [files, query, category, type])

  function openCreate() {
    setEditing({ mode: 'create' })
    setForm({ title: '', description: '', category: categories[0] || '', responsible: profile?.nome || profile?.email || '' })
    setFile(null)
    setFileInputKey((current) => current + 1)
    setError('')
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || categories[0] || '',
      responsible: item.responsible || '',
    })
    setFile(null)
    setFileInputKey((current) => current + 1)
    setError('')
  }

  function selectFile(nextFile) {
    setFile(nextFile)
    if (nextFile && !form.title.trim()) {
      setForm((current) => ({ ...current, title: nextFile.name.replace(/\.[^.]+$/, '') }))
    }
  }

  function clearFile() {
    setFile(null)
    setFileInputKey((current) => current + 1)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing?.mode === 'create') {
        await onCreate(form, file)
      } else {
        await onUpdate(editing, form)
      }
      setEditing(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openFile(item) {
    if (isImageFile(item) || isPdfFile(item)) {
      setPreview(item)
      return
    }
    window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {canManage && (
          <Button type="button" variant="secondary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_220px_160px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, categoria ou responsável" />
        </label>
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>Todas</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          {types.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[64px_1.4fr_.8fr_.9fr_.75fr_.7fr_150px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400 lg:grid">
          <span>Ícone</span>
          <span>Nome</span>
          <span>Categoria</span>
          <span>Responsável</span>
          <span>Data</span>
          <span>Tamanho</span>
          <span>Ações</span>
        </div>
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhum arquivo encontrado.</p>
        ) : (
          filtered.map((item) => {
            const Icon = fileIcon(item)
            return (
              <article key={item.id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[64px_1.4fr_.8fr_.9fr_.75fr_.7fr_150px] lg:items-center">
                <button type="button" onClick={() => openFile(item)} className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-senai-blue">
                  <Icon className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => openFile(item)} className="min-w-0 text-left">
                  <strong className="block truncate text-sm text-slate-950">{item.title || item.fileName}</strong>
                  <span className="mt-1 block truncate text-xs text-slate-500">{item.description || item.fileName}</span>
                </button>
                <div>{showCategory && item.category ? <Badge variant="blue">{item.category}</Badge> : <span className="text-sm text-slate-400">-</span>}</div>
                <span className="text-sm font-medium text-slate-600">{item.responsible || '-'}</span>
                <span className="text-sm font-medium text-slate-500">{formatDate(item.createdAt)}</span>
                <span className="text-sm font-medium text-slate-500">{formatFileSize(item.size)}</span>
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" size="icon" variant="ghost" aria-label="Download">
                    <a href={item.url} download={item.fileName} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {canManage && (
                    <>
                      <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(item)} aria-label="Editar">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="text-rose-600" onClick={() => onDelete(item)} aria-label="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.mode === 'create' ? createLabel : 'Editar informações'}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Título
              <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Descrição
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            {showCategory && (
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Categoria
                <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <option value="">Sem categoria</option>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </label>
            )}
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Responsável
              <Input value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} />
            </label>
            {editing?.mode === 'create' && (
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Arquivo</span>
                <Input
                  key={fileInputKey}
                  required={!file}
                  type="file"
                  onChange={(event) => selectFile(event.target.files?.[0] || null)}
                />
                {file && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-senai-blue">
                        {(() => {
                          const Icon = fileIcon({
                            fileName: file.name,
                            mimeType: file.type,
                          })
                          return <Icon className="h-5 w-5" />
                        })()}
                      </div>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-slate-950">{file.name}</strong>
                        <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-rose-600"
                      onClick={clearFile}
                      aria-label="Remover arquivo selecionado"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
