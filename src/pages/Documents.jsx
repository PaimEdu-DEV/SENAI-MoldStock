import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FileLibrary from '../components/FileLibrary.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { Card } from '../components/ui/card.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useToast } from '../contexts/toastContext.js'
import { createDocument, deleteDocument, updateDocument, watchDocuments } from '../services/documentService.js'
import { pieceFileCategories } from '../types/moldTech.js'

export default function Documents() {
  const { profile, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = watchDocuments(setDocuments, (err) => setError(err.message))
    return unsubscribe
  }, [])

  async function confirmDelete() {
    if (!deleteTarget) return
    setLoading(true)
    setError('')
    try {
      await deleteDocument(deleteTarget, profile)
      toast({ title: 'Documento excluído', description: `"${deleteTarget.title}" foi removido.`, tone: 'success' })
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível excluir', description: err.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Biblioteca técnica"
        title="Biblioteca de Documentos"
        description="Arquivos gerais do laboratório, disponíveis para consulta e download pelos professores."
        action={
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-senai-blue shadow-soft">
            <BookOpen className="h-6 w-6" />
          </div>
        }
      />
      <Card className="p-6">
        {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        <FileLibrary
          title="Documentos"
          description="Materiais técnicos gerais do laboratório."
          files={documents}
          categories={pieceFileCategories}
          canManage={isSuperAdmin}
          createLabel="Novo documento"
          onCreate={(data, file) => createDocument(data, file, profile)}
          onUpdate={(item, data) => updateDocument(item.id, data, profile, item)}
          onDelete={setDeleteTarget}
        />
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir documento?"
        description={`Você está prestes a excluir "${deleteTarget?.title}". Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir documento"
        loading={loading}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
