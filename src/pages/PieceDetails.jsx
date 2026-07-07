import {
  CalendarClock,
  Boxes,
  Gauge,
  MapPin,
  PackageSearch,
  QrCode,
  Ruler,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChecklistSection from '../components/ChecklistSection.jsx'
import OccurrenceModal from '../components/OccurrenceModal.jsx'
import PieceImage from '../components/PieceImage.jsx'
import PieceFilesSection from '../components/PieceFilesSection.jsx'
import ProcessSheetsSection from '../components/ProcessSheetsSection.jsx'
import QRCodeModal from '../components/QRCodeModal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useTaxonomy } from '../hooks/useTaxonomy.js'
import { formatDimensions, idsToNames } from '../lib/pieceMeta.js'
import { formatDate } from '../lib/utils.js'
import { watchOccurrences } from '../services/occurrenceService.js'
import { getPiece } from '../services/pieceService.js'

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Icon className="mb-3 h-5 w-5 text-senai-blue" />
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-slate-950">{value}</strong>
    </div>
  )
}

function NamesBadges({ label, ids = [], options = [] }) {
  const names = idsToNames(ids, options)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Boxes className="mb-3 h-5 w-5 text-senai-blue" />
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {names.length ? (
          names.map((name) => (
            <Badge key={name} variant="blue">
              {name}
            </Badge>
          ))
        ) : (
          <strong className="text-sm text-slate-950">Não informado</strong>
        )}
      </div>
    </div>
  )
}

function Timeline({ occurrences }) {
  if (!occurrences.length) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Nenhuma ocorrência registrada para este molde.
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      {occurrences.map((occurrence) => (
        <article
          key={occurrence.id}
          className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant={occurrence.statusNovo === 'Quebrado' ? 'broken' : 'blue'}>
              {occurrence.tipo}
            </Badge>
            <span className="text-xs font-semibold text-slate-400">
              {formatDate(occurrence.criadoEm)}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{occurrence.descricao}</p>
          <div className="mt-4 grid gap-2 text-xs font-medium text-slate-500 sm:grid-cols-2">
            <span>Professor: {occurrence.registradoPor || 'Não informado'}</span>
            {occurrence.alunoEnvolvido && (
              <span>Pessoa envolvida: {occurrence.alunoEnvolvido}</span>
            )}
            {occurrence.statusNovo && (
              <span>
                Status: {occurrence.statusAnterior || '-'} -&gt; {occurrence.statusNovo}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

export default function PieceDetails() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const { items: materials } = useTaxonomy('materials')
  const { items: machines } = useTaxonomy('machines')
  const [piece, setPiece] = useState(null)
  const [occurrences, setOccurrences] = useState([])
  const [qrOpen, setQrOpen] = useState(false)
  const [occurrenceOpen, setOccurrenceOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPiece(id)
      .then((data) => {
        setPiece(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!isAdmin || !id) return undefined
    return watchOccurrences(id, setOccurrences, (err) => setError(err.message))
  }, [id, isAdmin])

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-[2rem] bg-white" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
        </div>
      </div>
    )
  }

  if (!piece) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="p-8 text-center">Molde não encontrado.</Card>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section id="informações-gerais" className="grid scroll-mt-28 gap-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
          <Card className="self-start p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                <PieceImage
                  src={piece.fotoPecaUrl}
                  alt={piece.nome}
                  className="h-72 w-full object-cover"
                />
                <div className="border-t border-slate-200 bg-white/80 px-4 py-3">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Foto da peça
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                <PieceImage
                  src={piece.fotoMoldeUrl}
                  alt={`Molde ${piece.nome}`}
                  className="h-72 w-full object-cover"
                />
                <div className="border-t border-slate-200 bg-white/80 px-4 py-3">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Foto do molde
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid content-start gap-5">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-senai-blue">
                    {piece.codigo}
                  </span>
                  <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                    {piece.nome}
                  </h1>
                </div>
                <StatusBadge status={piece.status} />
              </div>
              <p className="mt-5 leading-7 text-slate-500">
                {piece.descricao || piece.observacao || 'Sem descrição cadastrada.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {isAdmin && (
                  <>
                    <Button asChild variant="secondary">
                      <Link to={`/admin/pecas/${piece.id}/editar`}>Editar</Link>
                    </Button>
                    <Button variant="secondary" onClick={() => setQrOpen(true)}>
                      <QrCode className="h-4 w-4" />
                      QR Code
                    </Button>
                    <Button onClick={() => setOccurrenceOpen(true)}>
                      Registrar ocorrência
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <InfoItem icon={MapPin} label="Localização" value={piece.localizacao || 'Não informada'} />
          <InfoItem icon={PackageSearch} label="N° Cav." value={piece.quantidade || 1} />
          <InfoItem icon={Gauge} label="Peso do molde" value={piece.pesoKg ? `${piece.pesoKg} kg` : 'Não informado'} />
          <InfoItem
            icon={Ruler}
            label="Dimensões em Milímetros"
            value={
              formatDimensions(piece.dimensoes) || 'Não informado'
            }
          />
          <InfoItem icon={UserRound} label="Responsável" value={piece.criadoPor || 'Não informado'} />
          <InfoItem icon={CalendarClock} label="Cadastro" value={formatDate(piece.criadoEm)} />
          <InfoItem icon={CalendarClock} label="Atualização" value={formatDate(piece.atualizadoEm)} />
          <NamesBadges label="Materiais" ids={piece.materialIds} options={materials} />
          <NamesBadges label="Máquinas" ids={piece.machineIds} options={machines} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-soft">
        {['Informações Gerais', 'Observações', 'Checklist', 'Fichas de Processo', 'Arquivos', 'Timeline']
          .filter((item) => isAdmin || ['Informações Gerais', 'Observações', 'Fichas de Processo'].includes(item))
          .map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replaceAll(' ', '-')}`}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item}
            </a>
          ))}
      </div>

      <Card className="p-6">
        <div id="observações" className="mb-2 scroll-mt-28">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Observações
          </h2>
          <p className="mt-2 text-slate-500">
            {piece.observacao || 'Nenhuma observação resumida cadastrada.'}
          </p>
        </div>
      </Card>

      {!isAdmin && (
        <div id="fichas-de-processo" className="scroll-mt-28">
          <ProcessSheetsSection
            pieceId={piece.id}
            publicOnly
            title="Fichas de Processo"
            description="Fichas liberadas para consulta pública."
          />
        </div>
      )}

      {isAdmin && (
        <>
          <div id="checklist" className="scroll-mt-28">
            <ChecklistSection pieceId={piece.id} />
          </div>
          <div id="fichas-de-processo" className="scroll-mt-28">
            <ProcessSheetsSection pieceId={piece.id} />
          </div>
          <div id="arquivos" className="scroll-mt-28">
            <PieceFilesSection pieceId={piece.id} />
          </div>
          <Card id="timeline" className="scroll-mt-28 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Timeline de ocorrências
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Histórico operacional visível apenas para professores.
              </p>
            </div>
            <Timeline occurrences={occurrences} />
          </Card>
        </>
      )}

      <QRCodeModal piece={qrOpen ? piece : null} onClose={() => setQrOpen(false)} />
      <OccurrenceModal
        piece={occurrenceOpen ? piece : null}
        onClose={() => setOccurrenceOpen(false)}
      />
    </div>
  )
}


