import { motion } from 'framer-motion'
import { CheckCircle2, Factory, Package, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import senaiMoldStockLogo from '../assets/SENAI_MoldStock.png'
import FiltersBar from '../components/FiltersBar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PieceCard from '../components/PieceCard.jsx'
import PieceTable from '../components/PieceTable.jsx'
import StatsCard from '../components/StatsCard.jsx'
import { Button } from '../components/ui/button.jsx'
import { watchPieces } from '../services/pieceService.js'

const initialFilters = {
  search: '',
  status: 'Todos',
  localizacao: '',
}

function applyFilters(pieces, filters) {
  const search = filters.search.trim().toLowerCase()
  const location = filters.localizacao.trim().toLowerCase()

  return pieces.filter((piece) => {
    const haystack = [
      piece.codigo,
      piece.nome,
      piece.localizacao,
    ]
      .join(' ')
      .toLowerCase()
    const matchSearch = !search || haystack.includes(search)
    const matchStatus = filters.status === 'Todos' || piece.status === filters.status
    const matchLocation = !location || piece.localizacao?.toLowerCase().includes(location)
    return matchSearch && matchStatus && matchLocation
  })
}

export default function PublicHome() {
  const [pieces, setPieces] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = watchPieces(
      (items) => {
        setPieces(items)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  const filteredPieces = useMemo(() => applyFilters(pieces, filters), [pieces, filters])
  const stats = useMemo(
    () => ({
      total: pieces.length,
      ok: pieces.filter((piece) => piece.status === 'OK').length,
      maintenance: pieces.filter((piece) => piece.status === 'Em manutenção').length,
      broken: pieces.filter((piece) => piece.status === 'Quebrado').length,
    }),
    [pieces],
  )

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Catálogo público · SENAI"
        title="Catálogo público de moldes"
        description="Visualize, pesquise e acompanhe o estado dos moldes do setor de Plásticos com precisão."
        action={
          <div className="hidden w-[430px] justify-items-center lg:grid">
            <img
              src={senaiMoldStockLogo}
              alt="SENAI MoldStock"
              className="h-52 w-auto max-w-[460px] object-contain drop-shadow-[0_22px_45px_rgba(15,23,42,0.14)]"
            />
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm">
            <Factory className="h-4 w-4" />
            Setor de Plásticos
          </Button>
          <Button variant="quiet" size="sm">
            Somente visualização
          </Button>
        </div>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={Package}
          label="Total de moldes"
          value={stats.total}
          description="Base cadastrada no estoque."
        />
        <StatsCard
          icon={CheckCircle2}
          label="Disponíveis"
          value={stats.ok}
          description="Prontos para utilização."
          tone="ok"
        />
        <StatsCard
          icon={Factory}
          label="Em manutenção"
          value={stats.maintenance}
          description="Aguardando reparo ou inspeção."
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

      {loading && (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white/80"
            />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!loading && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="hidden lg:block">
            <PieceTable pieces={filteredPieces} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {filteredPieces.map((piece) => (
              <PieceCard key={piece.id} piece={piece} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}


