import { CheckCircle2, Factory, Package, Plus, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FiltersBar from '../components/FiltersBar.jsx'
import OccurrenceModal from '../components/OccurrenceModal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PieceTable from '../components/PieceTable.jsx'
import QRCodeModal from '../components/QRCodeModal.jsx'
import StatsCard from '../components/StatsCard.jsx'
import { Button } from '../components/ui/button.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { createAuditLog } from '../services/auditService.js'
import { deletePiece, watchPieces } from '../services/pieceService.js'

const initialFilters = {
  search: '',
  status: 'Todos',
  localizacao: '',
}

function isMaintenanceStatus(status) {
  return status === 'Em manutenção' || status === 'Em manutenÃ§Ã£o'
}

function filterPieces(pieces, filters) {
  const search = filters.search.trim().toLowerCase()
  const location = filters.localizacao.trim().toLowerCase()
  return pieces.filter((piece) => {
    const haystack = [
      piece.codigo,
      piece.nome,
      piece.categoria,
      piece.localizacao,
    ]
      .join(' ')
      .toLowerCase()
    const matchSearch = !search || haystack.includes(search)
    const matchStatus =
      filters.status === 'Todos' ||
      piece.status === filters.status ||
      (filters.status === 'Em manutenção' && isMaintenanceStatus(piece.status))
    const matchLocation = !location || piece.localizacao?.toLowerCase().includes(location)
    return matchSearch && matchStatus && matchLocation
  })
}

export default function AdminDashboard() {
  const { profile, isSuperAdmin } = useAuth()
  const [pieces, setPieces] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [qrPiece, setQrPiece] = useState(null)
  const [occurrencePiece, setOccurrencePiece] = useState(null)
  const [statusPiece, setStatusPiece] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = watchPieces(setPieces, (err) => setError(err.message))
    return unsubscribe
  }, [])

  const filteredPieces = useMemo(() => filterPieces(pieces, filters), [pieces, filters])
  const stats = useMemo(
    () => ({
      total: pieces.length,
      ok: pieces.filter((piece) => piece.status === 'OK').length,
      maintenance: pieces.filter((piece) => isMaintenanceStatus(piece.status)).length,
      broken: pieces.filter((piece) => piece.status === 'Quebrado').length,
    }),
    [pieces],
  )

  async function handleDelete(piece) {
    if (!isSuperAdmin) {
      await createAuditLog(profile, {
        action: 'PERMISSION_DENIED',
        entity: 'piece',
        entityId: piece.id,
        description: `Tentativa negada de excluir a peca ${piece.nome}.`,
      }).catch(() => {})
      setError('Apenas Super Admin pode excluir pecas.')
      return
    }

    const confirmed = window.confirm(`Excluir a peca ${piece.nome}?`)
    if (confirmed) await deletePiece(piece.id, profile, piece)
  }

  async function handleQrCode(piece) {
    setQrPiece(piece)
    await createAuditLog(profile, {
      action: 'EXPORT',
      entity: 'qrcode',
      entityId: piece.id,
      description: `QR Code gerado para ${piece.nome}.`,
    }).catch(() => {})
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Painel operacional"
        title="Estoque de moldes"
        description="Gerencie disponibilidade, manutencao, ocorrencias e QR Codes com uma visao rapida do estado do laboratorio."
        action={
          <Button asChild size="lg">
            <Link to="/admin/pecas/nova">
              <Plus className="h-5 w-5" />
              Nova peca
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={Package}
          label="Total de moldes"
          value={stats.total}
          description="Base cadastrada no estoque."
        />
        <StatsCard
          icon={CheckCircle2}
          label="Disponiveis"
          value={stats.ok}
          description="Prontos para utilizacao."
          tone="ok"
        />
        <StatsCard
          icon={Factory}
          label="Em manutencao"
          value={stats.maintenance}
          description="Aguardando reparo ou inspecao."
          tone="maintenance"
        />
        <StatsCard
          icon={TriangleAlert}
          label="Quebrados"
          value={stats.broken}
          description="Bloqueados para uso."
          tone="broken"
        />
      </section>

      <FiltersBar filters={filters} setFilters={setFilters} />
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <PieceTable
        pieces={filteredPieces}
        admin
        canDelete={isSuperAdmin}
        onQrCode={handleQrCode}
        onOccurrence={setOccurrencePiece}
        onStatus={setStatusPiece}
        onDelete={handleDelete}
      />

      <QRCodeModal piece={qrPiece} onClose={() => setQrPiece(null)} />
      <OccurrenceModal piece={occurrencePiece} onClose={() => setOccurrencePiece(null)} />
      <OccurrenceModal
        piece={statusPiece}
        mode="status"
        onClose={() => setStatusPiece(null)}
      />
    </div>
  )
}
