import { motion } from 'framer-motion'
import { Download, RotateCcw, ShieldAlert, Vault } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { formatBackupType, getBackupVariant } from '../lib/auditFormat.js'
import { formatDate } from '../lib/utils.js'
import {
  canRestoreBackups,
  createBackup,
  downloadBackupJson,
  ensureAutomaticBackup,
  restoreBackup,
  watchBackups,
} from '../services/backupService.js'
import { reauthenticateCurrentUser } from '../services/securityService.js'

export default function Backups() {
  const { profile } = useAuth()
  const [backups, setBackups] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState('')
  const [advancedBackupId, setAdvancedBackupId] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreForm, setRestoreForm] = useState({ confirmation: '', password: '' })
  const canRestore = canRestoreBackups(profile)

  useEffect(() => watchBackups(setBackups, (err) => setError(err.message)), [])

  useEffect(() => {
    if (!profile?.uid) return
    ensureAutomaticBackup(profile)
      .then((backup) => {
        if (backup) {
          setSuccess('Backup automático criado pelo sistema.')
        }
      })
      .catch(() => {
        // Backup automático não deve interromper o uso da tela.
      })
  }, [profile])

  async function handleCreateBackup() {
    setLoading('create')
    setError('')
    setSuccess('')
    try {
      await createBackup(profile, 'manual')
      setSuccess('Backup manual criado com sucesso.')
    } catch (err) {
      setError(err.message)
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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Backups internos"
        description="Crie, exporte e restaure snapshots do banco. O sistema mantém somente os dois backups mais recentes."
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
              Antes de restaurar, o MoldStock cria um backup de segurança. Imagens não são
              duplicadas: o backup guarda apenas os moldes e as URLs/base64 das imagens.
            </p>
          </div>
        </div>
      </Card>

      {error && (
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
                    Criado por {backup.createdByName || 'Sistema'} - Moldes:{' '}
                    {backup.counts?.pieces || 0} - Ocorrências:{' '}
                    {backup.counts?.occurrences || 0} - Usuários:{' '}
                    {backup.counts?.users || 0} - Registros:{' '}
                    {backup.counts?.logs || 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => openRestoreDialog(backup)}
                    disabled={Boolean(loading) || !canRestore}
                    title={!canRestore ? 'Somente epaim@dev.com.br pode restaurar por enquanto.' : undefined}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {loading === backup.id ? 'Restaurando...' : 'Restaurar'}
                  </Button>
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

      <Dialog open={Boolean(restoreTarget)} onOpenChange={(open) => !open && setRestoreTarget(null)}>
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
    </div>
  )
}


