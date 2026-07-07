import { motion } from 'framer-motion'
import {
  BookOpen,
  Building2,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Info,
  Layers3,
  ShieldCheck,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { createAuditLog } from '../services/auditService.js'

const manualPath = '/docs/Manual_MoldStock_Design_Moderno.pdf'

const systemInfo = [
  { label: 'Versão', value: '1.0.0', icon: ShieldCheck },
  { label: 'Sistema', value: 'Produção', icon: Cpu },
  { label: 'Área', value: 'Setor de Plásticos', icon: Layers3 },
  { label: 'Instituição', value: 'SENAI', icon: Building2 },
]

const technologies = ['React', 'TypeScript', 'Firebase', 'Tailwind CSS', 'Vite', 'PWA']

function GitHubMark(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.86 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.2-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .08 1.53 1.07 1.53 1.07.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.04 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.35 9.35 0 0 1 12 6.93c.85 0 1.7.12 2.5.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.46.1 2.72.64.71 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.11 10.11 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

export default function AboutSystem() {
  const isMobile = useIsMobile()
  const { profile } = useAuth()
  const Item = isMobile ? 'article' : motion.article

  function logManualAction(action) {
    if (!profile) return
    createAuditLog(profile, {
      action: 'UPDATE',
      entity: 'system',
      description: action === 'download' ? 'Manual do usuário baixado.' : 'Manual do usuário acessado.',
      after: { manual: 'Manual_MoldStock_Design_Moderno.pdf' },
    }).catch(() => {})
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Institucional"
        title="Sobre o Sistema"
        description="Informações institucionais, técnicas e de desenvolvimento do MoldStock."
      />

      <Card className="grid gap-8 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr] lg:items-start">
          <div>
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-senai-blue shadow-soft dark:border-white/10 dark:bg-white/[0.055] dark:text-blue-200">
              <Info className="h-5 w-5" />
            </div>
            <Badge variant="blue">MoldStock</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Sobre o Sistema
            </h2>
            <div className="mt-5 grid gap-4 text-sm leading-7 text-slate-500 sm:text-base">
              <p>
                O MoldStock foi desenvolvido para centralizar o gerenciamento de moldes,
                componentes, ocorrências, fichas de processo, documentos e demais informações
                técnicas do laboratório de Plásticos do SENAI.
              </p>
              <p>
                O objetivo do sistema é proporcionar rastreabilidade, organização, segurança dos
                dados e facilitar a gestão dos ativos do laboratório.
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.035]">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
              <Code2 className="h-4 w-4 text-senai-blue dark:text-blue-200" />
              Tecnologias
            </div>
            <div className="flex flex-wrap gap-2">
              {technologies.map((technology) => (
                <Badge key={technology} variant="neutral">
                  {technology}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      </Card>

      <Card className="grid gap-5 p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-senai-blue shadow-soft dark:border-blue-300/20 dark:bg-blue-400/10 dark:text-blue-100">
          <BookOpen className="h-7 w-7" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Manual do Usuário
            </h2>
            <Badge variant="red">Versão 1.0 · Julho/2026</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Consulte o guia completo de utilização do MoldStock, com explicações sobre catálogo,
            cadastro de moldes, materiais, máquinas, checklist, fichas de processo, arquivos,
            ocorrências, backups, PWA e permissões.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button asChild>
            <a href={manualPath} target="_blank" rel="noreferrer" onClick={() => logManualAction('open')}>
              <FileText className="h-4 w-4" />
              Abrir manual
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={manualPath} download onClick={() => logManualAction('download')}>
              <Download className="h-4 w-4" />
              Baixar PDF
            </a>
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {systemInfo.map((item, index) => {
          const Icon = item.icon
          const motionProps = isMobile
            ? {}
            : {
                initial: { opacity: 0, y: 14 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: index * 0.05 },
              }

          return (
            <Item
              key={item.label}
              {...motionProps}
              className="premium-card rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-xl"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-senai-blue ring-1 ring-slate-200 dark:bg-white/[0.055] dark:text-blue-200 dark:ring-white/10">
                <Icon className="h-4 w-4" />
              </div>
              <span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </span>
              <strong className="mt-2 block text-lg font-semibold text-slate-950">
                {item.value}
              </strong>
            </Item>
          )
        })}
      </section>

      <Card className="grid gap-5 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-senai-red">
            Desenvolvimento
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Desenvolvido por
          </h2>
          <p className="mt-2 text-lg font-semibold text-slate-700">Eduardo Paim</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Desenvolvimento focado em organização técnica, rastreabilidade e operação interna do
            laboratório.
          </p>
        </div>
        <Button asChild variant="secondary">
          <a href="https://github.com/PaimEdu-DEV" target="_blank" rel="noreferrer">
            <GitHubMark className="h-4 w-4" />
            GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </Card>

      <footer className="rounded-2xl border border-slate-200/80 bg-white/70 px-5 py-6 text-center shadow-soft backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.03]">
        <p className="text-sm font-semibold text-slate-700">MoldStock © 2026</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Sistema desenvolvido para uso interno do Setor de Plásticos do SENAI.
        </p>
        <p className="mt-4 text-xs font-medium text-slate-400 opacity-75">
          MoldStock v1.0.0 · Build 2026.07 · Desenvolvido para o Setor de Plásticos do SENAI
        </p>
        <p className="mt-2 text-[11px] font-medium text-slate-400 opacity-55">
          Todos os direitos reservados · SENAI MoldStock
        </p>
      </footer>
    </div>
  )
}
