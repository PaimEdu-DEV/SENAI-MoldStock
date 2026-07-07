import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { formatDimensions, idsToNames } from '../lib/pieceMeta.js'
import PieceImage from './PieceImage.jsx'
import StatusBadge from './StatusBadge.jsx'
import { Button } from './ui/button.jsx'
import { Card } from './ui/card.jsx'

export default function PieceCard({ piece, materials = [], machines = [] }) {
  const materialNames = idsToNames(piece.materialIds, materials)
  const machineNames = idsToNames(piece.machineIds, machines)
  const dimensions = formatDimensions(piece.dimensoes)
  const isMobile = useIsMobile()
  const Wrapper = isMobile ? 'article' : motion.article
  const wrapperProps = isMobile
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        whileHover: { y: -4 },
        transition: { duration: 0.22 },
      }

  return (
    <Wrapper {...wrapperProps}>
      <Card className="overflow-hidden">
        <div className="aspect-[16/10] bg-slate-100 sm:aspect-[4/3]">
          <PieceImage
            src={piece.fotoMoldeUrl || piece.fotoPecaUrl}
            alt={piece.nome}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-senai-blue">
                {piece.codigo}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">{piece.nome}</h3>
            </div>
            <StatusBadge status={piece.status} />
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-slate-500">
            {piece.descricao || 'Sem descrição registrada.'}
          </p>
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            <span>Peso: {piece.pesoKg ? `${piece.pesoKg} kg` : 'Não informado'}</span>
            <span>Dimensões: {dimensions || 'Não informado'}</span>
            {!isMobile && (
              <>
                <span>Materiais: {materialNames.length ? materialNames.join(', ') : 'Não informado'}</span>
                <span>Máquinas: {machineNames.length ? machineNames.join(', ') : 'Não informado'}</span>
              </>
            )}
          </div>
          <Button asChild variant="secondary" className="w-full">
            <Link to={`/peca/${piece.id}`}>
              Abrir detalhes
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </Wrapper>
  )
}
