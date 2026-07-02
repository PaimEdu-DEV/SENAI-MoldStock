import { motion } from 'framer-motion'
import { ImagePlus, QrCode, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import OccurrenceModal from '../components/OccurrenceModal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import QRCodeModal from '../components/QRCodeModal.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input, Textarea } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { cn } from '../lib/utils.js'
import { createPiece, getPiece, updatePiece } from '../services/pieceService.js'
import { withTimeout } from '../services/timeout.js'

const emptyForm = {
  codigo: '',
  nome: '',
  status: 'OK',
  observacao: '',
  descricao: '',
  localizacao: '',
  quantidade: 1,
  categoria: '',
}

const statusOptions = [
  {
    value: 'OK',
    label: 'OK',
    hint: 'Disponível para uso',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'Em manutenção',
    label: 'Manutenção',
    hint: 'Em reparo ou inspeção',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    value: 'Quebrado',
    label: 'Quebrado',
    hint: 'Bloqueado para uso',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
]

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  )
}

function UploadField({ label, currentUrl, onChange }) {
  return (
    <label className="group grid cursor-pointer gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-senai-blue/50 hover:bg-blue-50/40">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl bg-white">
        {currentUrl ? (
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-slate-400">
            <ImagePlus className="mx-auto h-8 w-8" />
            <span className="mt-2 block text-sm font-medium">Selecionar imagem</span>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onChange(event.target.files[0])}
      />
    </label>
  )
}

export default function PieceForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [originalPiece, setOriginalPiece] = useState(null)
  const [previousStatus, setPreviousStatus] = useState('OK')
  const [files, setFiles] = useState({ fotoPeca: null, fotoMolde: null })
  const [currentImages, setCurrentImages] = useState({})
  const [savedPieceForStatus, setSavedPieceForStatus] = useState(null)
  const [createdQrPiece, setCreatedQrPiece] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditing) return
    getPiece(id).then((piece) => {
      if (!piece) return
      setOriginalPiece(piece)
      setForm({
        codigo: piece.codigo || '',
        nome: piece.nome || '',
        status: piece.status || 'OK',
        observacao: piece.observacao || '',
        descricao: piece.descricao || '',
        localizacao: piece.localizacao || '',
        quantidade: piece.quantidade || 1,
        categoria: piece.categoria || '',
      })
      setPreviousStatus(piece.status || 'OK')
      setCurrentImages({
        fotoPecaUrl: piece.fotoPecaUrl,
        fotoMoldeUrl: piece.fotoMoldeUrl,
      })
    })
  }, [id, isEditing])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (isEditing) {
        await withTimeout(
          updatePiece(id, form, files, profile, originalPiece),
          'Salvar demorou demais. Confira as regras do banco.',
          15000,
        )
        if (form.status !== previousStatus) {
          setSavedPieceForStatus({
            id,
            nome: form.nome,
            status: previousStatus,
            statusNovo: form.status,
          })
          setPreviousStatus(form.status)
          return
        }
        navigate('/admin')
      } else {
        const created = await withTimeout(
          createPiece(form, files, profile),
          'Criar peça demorou demais. Confira as regras do banco.',
          15000,
        )
        setCreatedQrPiece({ id: created.id, codigo: form.codigo, nome: form.nome })
        if (created.imageError) {
          setNotice(`Peça salva e QR gerado. As imagens não subiram: ${created.imageError}`)
        } else {
          setNotice('Peça salva com sucesso. QR Code gerado.')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function closeCreatedQr() {
    const createdId = createdQrPiece?.id
    setCreatedQrPiece(null)
    if (createdId) navigate(`/peca/${createdId}`)
  }

  function closeStatusModal() {
    setSavedPieceForStatus(null)
    navigate('/admin')
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={isEditing ? 'Editar cadastro' : 'Nova peça'}
        title={isEditing ? form.nome || 'Editar peça' : 'Cadastrar molde ou peça'}
        description="Organize dados técnicos, localização, status operacional e imagens em uma ficha pronta para QR Code."
      />

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6"
        onSubmit={handleSubmit}
      >
        <Card className="grid gap-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Código">
              <Input
                required
                value={form.codigo}
                onChange={(event) => setForm({ ...form, codigo: event.target.value })}
                placeholder="Ex: A-01, MOLDE-B7, 120C"
              />
            </Field>
            <Field label="Nome">
              <Input
                required
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                placeholder="Nome técnico da peça"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Categoria">
              <Input
                value={form.categoria}
                onChange={(event) => setForm({ ...form, categoria: event.target.value })}
                placeholder="Molde, componente..."
              />
            </Field>
            <Field label="Localização">
              <Input
                value={form.localizacao}
                onChange={(event) => setForm({ ...form, localizacao: event.target.value })}
                placeholder="Armário 2, prateleira B"
              />
            </Field>
            <Field label="N° Cav.">
              <Input
                type="number"
                min="1"
                value={form.quantidade}
                onChange={(event) => setForm({ ...form, quantidade: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Status operacional">
            <div className="grid gap-3 md:grid-cols-3">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  className={cn(
                    'rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft',
                    form.status === status.value
                      ? status.className
                      : 'border-slate-200 text-slate-500',
                  )}
                  onClick={() => setForm({ ...form, status: status.value })}
                >
                  <span className="block text-sm font-extrabold">{status.label}</span>
                  <span className="mt-1 block text-xs font-medium opacity-75">
                    {status.hint}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Observação resumida">
            <Input
              value={form.observacao}
              onChange={(event) => setForm({ ...form, observacao: event.target.value })}
              placeholder="Resumo visível na ficha completa"
            />
          </Field>

          <Field label="Descrição completa">
            <Textarea
              value={form.descricao}
              onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              placeholder="Descreva uso, condições, cuidados e detalhes técnicos."
            />
          </Field>
        </Card>

        <Card className="grid gap-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Imagens</h2>
            <p className="mt-1 text-sm text-slate-500">
              Adicione fotos limpas da peça e do molde para facilitar a identificação.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <UploadField
              label="Foto da peça"
              currentUrl={
                files.fotoPeca
                  ? URL.createObjectURL(files.fotoPeca)
                  : currentImages.fotoPecaUrl
              }
              onChange={(file) => setFiles({ ...files, fotoPeca: file })}
            />
            <UploadField
              label="Foto do molde"
              currentUrl={
                files.fotoMolde
                  ? URL.createObjectURL(files.fotoMolde)
                  : currentImages.fotoMoldeUrl
              }
              onChange={(file) => setFiles({ ...files, fotoMolde: file })}
            />
          </div>
        </Card>

        {notice && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {isEditing ? <Save className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar e gerar QR'}
          </Button>
        </div>
      </motion.form>

      <OccurrenceModal
        piece={savedPieceForStatus}
        mode="status"
        onClose={closeStatusModal}
      />
      <QRCodeModal piece={createdQrPiece} onClose={closeCreatedQr} />
    </div>
  )
}


