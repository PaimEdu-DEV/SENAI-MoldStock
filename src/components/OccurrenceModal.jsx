import { Siren } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth.js'
import { createOccurrence } from '../services/occurrenceService.js'
import { updatePieceStatus } from '../services/pieceService.js'
import { Button } from './ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.jsx'
import { Input, Select, Textarea } from './ui/input.jsx'

const defaultForm = {
  tipo: 'Observação',
  descricao: '',
  alunoEnvolvido: '',
  statusNovo: '',
}

export default function OccurrenceModal({ piece, mode = 'occurrence', onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const isStatusMode = mode === 'status'
  const open = Boolean(piece)

  useEffect(() => {
    if (!piece) return
    setForm({
      ...defaultForm,
      tipo: isStatusMode ? 'Status alterado' : 'Observação',
      statusNovo: isStatusMode ? piece.statusNovo || piece.status : '',
    })
  }, [piece, isStatusMode])

  if (!piece) return null

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (isStatusMode) {
        await updatePieceStatus(piece.id, form.statusNovo)
      }
      await createOccurrence(
        {
          pecaId: piece.id,
          tipo: form.tipo,
          descricao: form.descricao,
          alunoEnvolvido: form.alunoEnvolvido,
          statusAnterior: isStatusMode ? piece.status : '',
          statusNovo: isStatusMode ? form.statusNovo : '',
        },
        profile,
      )
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-senai-red/10 text-senai-red">
            <Siren className="h-6 w-6" />
          </div>
          <DialogTitle>
            {isStatusMode ? 'Justificativa de status' : 'Registrar ocorrência'}
          </DialogTitle>
          <DialogDescription>
            {isStatusMode
              ? `Informe o motivo da alteração da peça ${piece.nome}.`
              : `Crie um registro operacional para ${piece.nome}.`}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {isStatusMode ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Novo status
              <Select
                value={form.statusNovo}
                onChange={(event) => setForm({ ...form, statusNovo: event.target.value })}
              >
                <option value="OK">OK</option>
                <option value="Em manutenção">Em manutenção</option>
                <option value="Quebrado">Quebrado</option>
              </Select>
            </label>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Tipo
              <Select
                value={form.tipo}
                onChange={(event) => setForm({ ...form, tipo: event.target.value })}
              >
                <option>Status alterado</option>
                <option>Dano</option>
                <option>Manutenção</option>
                <option>Observação</option>
                <option>Outro</option>
              </Select>
            </label>
          )}

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Aluno envolvido
            <Input
              value={form.alunoEnvolvido}
              onChange={(event) => setForm({ ...form, alunoEnvolvido: event.target.value })}
              placeholder="Opcional"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Descrição
            <Textarea
              required
              value={form.descricao}
              onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              placeholder={
                isStatusMode
                  ? `Informe o motivo da alteração para ${form.statusNovo}.`
                  : 'Descreva a ocorrência registrada.'
              }
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar registro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
