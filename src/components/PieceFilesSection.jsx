import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth.js'
import { useToast } from '../contexts/toastContext.js'
import { createPieceFile, deletePieceFile, updatePieceFile, watchPieceFiles } from '../services/documentService.js'
import { pieceFileCategories } from '../types/moldTech.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import FileLibrary from './FileLibrary.jsx'
import { Card } from './ui/card.jsx'

export default function PieceFilesSection({ pieceId }) {
  const { profile, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = watchPieceFiles(pieceId, setFiles, (err) => setError(err.message))
    return unsubscribe
  }, [pieceId])

  async function confirmDelete() {
    if (!deleteTarget) return
    setLoading(true)
    setError('')
    try {
      await deletePieceFile(pieceId, deleteTarget, profile)
      toast({ title: 'Arquivo excluído', description: `"${deleteTarget.title}" foi removido.`, tone: 'success' })
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível excluir', description: err.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      <FileLibrary
        title="Arquivos"
        description="Biblioteca exclusiva deste molde: desenhos, manuais, CAD, certificados e relatórios."
        files={files}
        categories={pieceFileCategories}
        canManage={isSuperAdmin}
        createLabel="Enviar arquivo"
        onCreate={(data, file) => createPieceFile(pieceId, data, file, profile)}
        onUpdate={(item, data) => updatePieceFile(pieceId, item.id, data, profile, item)}
        onDelete={setDeleteTarget}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir arquivo?"
        description={`Você está prestes a excluir "${deleteTarget?.title}". Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir arquivo"
        loading={loading}
        onConfirm={confirmDelete}
      />
    </Card>
  )
}
