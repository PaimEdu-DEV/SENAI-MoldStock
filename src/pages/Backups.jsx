import { motion } from 'framer-motion'
import { Download, RotateCcw, ShieldAlert, Trash2, Vault } from 'lucide-react'
import { useEffect, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.jsx'
import { Input } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useToast } from '../contexts/toastContext.js'
import { isOwner } from '../config/security.js'
import { formatBackupType, getBackupVariant } from '../lib/auditFormat.js'
import { formatDate } from '../lib/utils.js'
import { AUTO_BACKUP_INTERVAL } from '../config/security.js'
import {
  canRestoreBackups,
  createBackup,
  downloadBackupJson,
  ensureAutomaticBackup,
  overrideBackupProtection,
  restoreBackup,
  watchBackupProtection,
  watchBackups,
} from '../services/backupService.js'
import {
  RESET_CONFIRMATION,
  resetSystemForDelivery,
} from '../services/deliveryResetService.js'
import { preparePresentationEnvironment } from '../services/presentationService.js'
import { reauthenticateCurrentUser } from '../services/securityService.js'

export default function Backups() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [backups, setBackups] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState('')
  const [advancedBackupId, setAdvancedBackupId] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreForm, setRestoreForm] = useState({ confirmation: '', password: '' })
  const [overrideConfirmOpen, setOverrideConfirmOpen] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [preparePassword, setPreparePassword] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetForm, setResetForm] = useState({ password: '', confirmation: '' })
  const [protection, setProtection] = useState({ active: false })
  const canRestore = canRestoreBackups(profile)
  const canOverrideProtection = canRestore
  const canPreparePresentation = isOwner(profile)

  useEffect(() => watchBackups(setBackups, (err) => setError(err.message)), [])
  useEffect(() => watchBackupProtection(setProtection, (err) => setError(err.message)), [])

  useEffect(() => {
    if (!profile?.uid) return
    let active = true

    async function runAutomaticBackup() {
      try {
        const backup = await ensureAutomaticBackup(profile)
        if (active && backup) {
          setSuccess('Backup automático criado pelo sistema.')
          toast({ title: 'Backup automático criado', description: 'Snapshot do sistema salvo às 03:00.', tone: 'success' })
        }
      } catch {
        // Backup automático não deve interromper o uso da tela.
      }
    }

    runAutomaticBackup()
    const timer = window.setInterval(runAutomaticBackup, AUTO_BACKUP_INTERVAL)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [profile, toast])

  async function handleCreateBackup() {
    setLoading('create')
    setError('')
    setSuccess('')
    try {
      await createBackup(profile, 'manual')
      setSuccess('Backup manual criado com sucesso.')
      toast({ title: 'Backup manual criado', tone: 'success' })
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível criar backup', description: err.message, tone: 'error' })
    } finally {
      setLoading('')
    }
  }

  function openRestoreDialog(backup) {
    setError('')
    setSuccess('')
    setRestoreTarget(backup)
    setRestoreForm({ confirmation: '', password: '' })
  }

  async function handleOverrideProtection() {
    setLoading('override')
    setError('')
    setSuccess('')
    try {
      await overrideBackupProtection(profile)
      setSuccess('Proteção ignorada temporariamente pelo Owner.')
      toast({ title: 'Proteção ignorada temporariamente', tone: 'warning' })
      setOverrideConfirmOpen(false)
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível alterar a proteção', description: err.message, tone: 'error' })
    } finally {
      setLoading('')
    }
  }

  async function handleRestore(event) {
    event.preventDefault()
    if (!restoreTarget || restoreForm.confirmation !== 'RESTAURAR') return
    setLoading(restoreTarget.id)
    setError('')
    setSuccess('')
    try {
      await reauthenticateCurrentUser(restoreForm.password)
      await restoreBackup(profile, restoreTarget)
      setRestoreTarget(null)
      setRestoreForm({ confirmation: '', password: '' })
      setSuccess('Backup restaurado com sucesso.')
      toast({ title: 'Backup restaurado', description: 'O sistema foi restaurado com segurança.', tone: 'success' })
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível restaurar', description: err.message, tone: 'error' })
    } finally {
      setLoading('')
    }
  }

  async function handlePreparePresentation(event) {
    event.preventDefault()
    setLoading('prepare')
    setError('')
    setSuccess('')
    try {
      await reauthenticateCurrentUser(preparePassword)
      const counts = await preparePresentationEnvironment(profile)
      setPrepareOpen(false)
      setPreparePassword('')
      setSuccess('Ambiente preparado para apresentação.')
      toast({
        title: 'Ambiente preparado',
        description: `${counts.pieces} moldes, ${counts.materials} materiais, ${counts.machines} máquinas e ${counts.logs} logs tratados.`,
        tone: 'success',
      })
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível preparar o ambiente', description: err.message, tone: 'error' })
    } finally {
      setLoading('')
    }
  }

  async function handleDeliveryReset(event) {
    event.preventDefault()
    if (resetForm.confirmation !== RESET_CONFIRMATION) return
    setLoading('delivery-reset')
    setError('')
    setSuccess('')
    try {
      await reauthenticateCurrentUser(resetForm.password)
      const counts = await resetSystemForDelivery(profile, resetForm.confirmation)
      setResetOpen(false)
      setResetForm({ password: '', confirmation: '' })
      setSuccess('Sistema zerado para entrega.')
      toast({
        title: 'Sistema zerado para entrega',
        description: `${counts.pieces} moldes, ${counts.occurrences} ocorrências, ${counts.processSheets} fichas e ${counts.logs} logs antigos tratados.`,
        tone: 'success',
      })
    } catch (err) {
      setError(err.message)
      toast({ title: 'Não foi possível zerar o sistema', description: err.message, tone: 'error' })
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Backups internos"
        description="Crie, exporte e restaure snapshots protegidos contra perda crítica de dados."
        action={
          <Button type="button" onClick={handleCreateBackup} disabled={Boolean(loading)}>
            <Vault className="h-4 w-4" />
            {loading === 'create' ? 'Criando...' : 'Criar backup agora'}
          </Button>
        }
      />

      <Card className="border-amber-200 bg-amber-50/80 p-5">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <h2 className="font-semibold text-amber-950">Restauração exige cuidado</h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Antes de restaurar, o MoldStock cria um backup de segurança. Somente o Owner pode
              restaurar. Imagens e arquivos não são duplicados: o backup guarda URLs, paths,
              base64 e metadados.
            </p>
          </div>
        </div>
      </Card>

      {protection.active && (
        <Card className="border-orange-300 bg-orange-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-orange-700" />
              <div>
                <h2 className="font-extrabold uppercase tracking-[0.18em] text-orange-950">
                  Proteção ativa
                </h2>
                <p className="mt-2 text-sm leading-6 text-orange-900">
                  Foi detectada uma redução crítica de dados. Os backups automáticos foram
                  suspensos para preservar o último backup válido.
                </p>
                <p className="mt-2 text-sm font-semibold text-orange-950">
                  Último backup válido:{' '}
                  {protection.lastValidBackupAt ? formatDate(protection.lastValidBackupAt) : 'Não informado'}
                </p>
                <p className="mt-1 text-xs font-semibold text-orange-800">
                  Somente o proprietário do sistema pode desativar esta proteção.
                </p>
              </div>
            </div>
            {canOverrideProtection && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOverrideConfirmOpen(true)}
                disabled={Boolean(loading)}
              >
                <ShieldAlert className="h-4 w-4" />
                {loading === 'override' ? 'Aplicando...' : 'Ignorar proteção temporariamente'}
              </Button>
            )}
          </div>
        </Card>
      )}

      {canPreparePresentation && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-blue-200 bg-blue-50/70 p-5 dark:border-blue-300/20 dark:bg-blue-400/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <Vault className="mt-0.5 h-6 w-6 shrink-0 text-senai-blue dark:text-blue-200" />
                <div>
                  <h2 className="font-semibold text-slate-950">Preparação para apresentação</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Remove dados de teste e organiza o ambiente para demonstração. Antes de
                    continuar, será criado um backup de segurança.
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => setPrepareOpen(true)} disabled={Boolean(loading)}>
                <Vault className="h-4 w-4" />
                Preparar ambiente
              </Button>
            </div>
          </Card>
          <Card className="border-rose-200 bg-rose-50/70 p-5 dark:border-rose-300/20 dark:bg-rose-400/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <Trash2 className="mt-0.5 h-6 w-6 shrink-0 text-rose-700 dark:text-rose-200" />
                <div>
                  <h2 className="font-semibold text-slate-950">Zerar sistema para entrega</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Remove moldes, logs e dados operacionais de teste para entregar o MoldStock
                    limpo. Usuários, professores, permissões, Owner, configurações e manual serão
                    preservados.
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => setResetOpen(true)} disabled={Boolean(loading)}>
                <Trash2 className="h-4 w-4" />
                Zerar sistema
              </Button>
            </div>
          </Card>
        </section>
      )}

      {error && !restoreTarget && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <section className="grid gap-4">
        {backups.length ? (
          backups.map((backup, index) => (
            <motion.article
              key={backup.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={getBackupVariant(backup.type)}>
                      {formatBackupType(backup.type)}
                    </Badge>
                    <strong className="text-lg text-slate-950">
                      {formatDate(backup.createdAt)}
                    </strong>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Criado por {backup.type === 'automatic' ? 'MoldStock' : backup.createdByName || 'Sistema'}
                  </p>
                  {backup.label && (
                    <p className="mt-1 text-sm font-semibold text-slate-700">{backup.label}</p>
                  )}
                  <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                    <span className="rounded-xl bg-slate-50 px-3 py-2">
                      Moldes: {backup.counts?.pieces || 0}
                    </span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">
                      Ocorrências: {backup.counts?.occurrences || 0}
                    </span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">
                      Usuários: {backup.counts?.users || 0}
                    </span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">
                      Logs: {backup.counts?.logs || 0}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canRestore && (
                    <Button
                      type="button"
                      onClick={() => openRestoreDialog(backup)}
                      disabled={Boolean(loading)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {loading === backup.id ? 'Restaurando...' : 'Restaurar'}
                    </Button>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <button
                    type="button"
                    className="text-xs font-bold text-slate-400 transition hover:text-slate-700"
                    onClick={() =>
                      setAdvancedBackupId((current) => (current === backup.id ? '' : backup.id))
                    }
                  >
                    {advancedBackupId === backup.id
                      ? 'Ocultar ferramentas avançadas'
                      : 'Ferramentas avançadas'}
                  </button>
                  {advancedBackupId === backup.id && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadBackupJson(backup)}
                      >
                        <Download className="h-4 w-4" />
                        Exportar arquivo técnico
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.article>
          ))
        ) : (
          <Card className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Vault className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">
                Nenhum backup criado
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Crie o primeiro backup para proteger os moldes cadastrados.
              </p>
            </div>
          </Card>
        )}
      </section>

      <Dialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null)
            setError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <DialogTitle>Confirmar restauração</DialogTitle>
            <DialogDescription>
              Esta ação pode substituir dados atuais do sistema. Digite RESTAURAR e confirme
              sua senha para continuar.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleRestore}>
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Confirmação
              <Input
                required
                value={restoreForm.confirmation}
                onChange={(event) =>
                  setRestoreForm({ ...restoreForm, confirmation: event.target.value })
                }
                placeholder="Digite RESTAURAR"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sua senha
              <Input
                type="password"
                required
                value={restoreForm.password}
                onChange={(event) =>
                  setRestoreForm({ ...restoreForm, password: event.target.value })
                }
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setRestoreTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={Boolean(loading) || restoreForm.confirmation !== 'RESTAURAR'}
              >
                <RotateCcw className="h-4 w-4" />
                {loading === restoreTarget?.id ? 'Restaurando...' : 'Restaurar backup'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={overrideConfirmOpen}
        onOpenChange={setOverrideConfirmOpen}
        title="Ignorar proteção temporariamente?"
        description="Isso permite criar backups mesmo com redução crítica de dados. Use apenas se a redução foi intencional e validada pelo Owner."
        confirmLabel="Ignorar proteção"
        tone="warning"
        loading={loading === 'override'}
        onConfirm={handleOverrideProtection}
      />
      <Dialog
        open={prepareOpen}
        onOpenChange={(open) => {
          setPrepareOpen(open)
          if (!open) setPreparePassword('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-senai-blue dark:bg-blue-400/10 dark:text-blue-200">
              <Vault className="h-6 w-6" />
            </div>
            <DialogTitle>Preparar ambiente para apresentação?</DialogTitle>
            <DialogDescription>
              Essa ação criará um backup de segurança e removerá dados de teste, como moldes
              fictícios, registros temporários e logs de desenvolvimento. Dados reais, usuários
              reais, configurações importantes, backups e o Owner serão preservados.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handlePreparePresentation}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sua senha
              <Input
                type="password"
                required
                value={preparePassword}
                onChange={(event) => setPreparePassword(event.target.value)}
                autoFocus
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setPrepareOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading === 'prepare'}>
                <Vault className="h-4 w-4" />
                {loading === 'prepare' ? 'Preparando...' : 'Preparar ambiente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open)
          if (!open) setResetForm({ password: '', confirmation: '' })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle>Zerar sistema para entrega?</DialogTitle>
            <DialogDescription>
              Essa ação vai remover moldes, ocorrências, checklists, fichas de processo, arquivos
              vinculados, timelines e logs antigos. Usuários, professores, permissões, Owner,
              configurações, manual e backups de segurança serão preservados. Um backup de
              segurança será criado antes da limpeza.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleDeliveryReset}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sua senha
              <Input
                type="password"
                required
                value={resetForm.password}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, password: event.target.value }))
                }
                autoFocus
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Digite ZERAR MOLDSTOCK para confirmar
              <Input
                required
                value={resetForm.confirmation}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, confirmation: event.target.value }))
                }
                placeholder="ZERAR MOLDSTOCK"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading === 'delivery-reset' || resetForm.confirmation !== RESET_CONFIRMATION}
              >
                <Trash2 className="h-4 w-4" />
                {loading === 'delivery-reset' ? 'Zerando...' : 'Zerar sistema'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


