import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import PieceImage from './PieceImage.jsx'
import StatusBadge from './StatusBadge.jsx'
import { Button } from './ui/button.jsx'
import { Card } from './ui/card.jsx'

export default function PieceCard({ piece }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
    >
      <Card className="overflow-hidden">
        <div className="aspect-[4/3] bg-slate-100">
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
          <Button asChild variant="secondary" className="w-full">
            <Link to={`/peca/${piece.id}`}>
              Abrir detalhes
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </motion.article>
  )
}


