import { motion } from 'framer-motion'
import {
  Eye,
  FilePenLine,
  MapPin,
  Package,
  QrCode,
  RotateCw,
  Siren,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDate } from '../lib/utils.js'
import PieceImage from './PieceImage.jsx'
import StatusBadge from './StatusBadge.jsx'
import { Button } from './ui/button.jsx'
import { Card } from './ui/card.jsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.jsx'

function ActionButton({ label, children, className, onClick, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-soft ${className || ''}`}
          onClick={(event) => {
            event.stopPropagation()
            onClick?.(event)
          }}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ActionLink({ label, children, to, className }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className={`grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-soft ${className || ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function PieceTable({
  pieces,
  admin = false,
  onQrCode,
  onOccurrence,
  onStatus,
  onDelete,
}) {
  const navigate = useNavigate()

  function openPiece(piece) {
    navigate(`/peca/${piece.id}`)
  }

  if (!pieces.length) {
    return (
      <Card className="grid min-h-56 place-items-center p-8 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-950">Nenhuma peca encontrada</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ajuste os filtros ou cadastre um novo molde no painel administrativo.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-5 py-4">Peca</th>
                <th className="px-5 py-4">Categoria</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Observacao</th>
                <th className="px-5 py-4">Localizacao</th>
                <th className="px-5 py-4">Qtd.</th>
                <th className="px-5 py-4">Atualizacao</th>
                {admin && <th className="px-5 py-4 text-right">Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {pieces.map((piece, index) => (
                <motion.tr
                  key={piece.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPiece(piece)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openPiece(piece)
                    }
                  }}
                  className="group cursor-pointer border-b border-slate-100 bg-white transition hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <PieceImage
                          src={piece.fotoPecaUrl}
                          alt={piece.nome}
                          className="h-full w-full object-cover"
                          placeholderClassName="[&>div>span]:hidden [&>div>div]:h-9 [&>div>div]:w-9 [&_svg]:h-4 [&_svg]:w-4"
                        />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-senai-blue">
                          {piece.codigo}
                        </div>
                        <div className="mt-1 font-semibold text-slate-950">{piece.nome}</div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          Clique para abrir a ficha completa
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">
                    {piece.categoria || 'Sem categoria'}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={piece.status} />
                  </td>
                  <td className="max-w-[280px] px-5 py-4 text-sm leading-6 text-slate-500">
                    <span className="line-clamp-2">
                      {piece.observacao || 'Sem observacao registrada'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {piece.localizacao || 'Nao informada'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                    {piece.quantidade || 1}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(piece.atualizadoEm)}
                  </td>
                  {admin && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="quiet" size="sm">
                          <Link
                            to={`/peca/${piece.id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Link>
                        </Button>
                        <ActionLink label="Editar" to={`/admin/pecas/${piece.id}/editar`}>
                          <FilePenLine className="h-4 w-4" />
                        </ActionLink>
                        <ActionButton label="Alterar status" onClick={() => onStatus(piece)}>
                          <RotateCw className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton label="Gerar QR Code" onClick={() => onQrCode(piece)}>
                          <QrCode className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          label="Registrar ocorrencia"
                          onClick={() => onOccurrence(piece)}
                        >
                          <Siren className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          label="Excluir"
                          className="text-rose-500 hover:text-rose-700"
                          onClick={() => onDelete(piece)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </TooltipProvider>
  )
}
