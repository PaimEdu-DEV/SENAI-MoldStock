import { motion } from 'framer-motion'
import { Download, RotateCcw, ShieldAlert, Vault } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { formatDate } from '../lib/utils.js'
import {
  canRestoreBackups,
  createBackup,
  downloadBackupJson,
  restoreBackup,
  watchBackups,
} from '../services/backupService.js'
import { reauthenticateCurrentUser } from '../services/securityService.js'

export default function Backups() {
  const { profile } = useAuth()
  const [backups, setBackups] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const canRestore = canRestoreBackups(profile)

  useEffect(() => watchBackups(setBackups, (err) => setError(err.message)), [])

  async function handleCreateBackup() {
    setLoading('create')
    setError('')
    try {
      await createBackup(profile, 'manual')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  async function handleRestore(backup) {
    const confirmation = window.prompt(
      'Esta acao pode substituir dados atuais do sistema. Digite RESTAURAR para continuar.',
    )
    if (confirmation !== 'RESTAURAR') return
    const password = window.prompt('Confirme sua senha de Super Admin para restaurar.')
    if (!password) return
    setLoading(backup.id)
    setError('')
    try {
      await reauthenticateCurrentUser(password)
      await restoreBackup(profile, backup)
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
        description="Crie, exporte e restaure snapshots do Realtime Database. O sistema mantem somente os dois backups mais recentes."
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
            <h2 className="font-semibold text-amber-950">Restauracao exige cuidado</h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Antes de restaurar, o MoldStock cria um backup pre_restore. Imagens nao sao
              duplicadas: o backup guarda apenas as URLs/base64 usadas pelas pecas.
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
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
                    <Badge variant={backup.type === 'pre_restore' ? 'maintenance' : 'blue'}>
                      {backup.type}
                    </Badge>
                    <strong className="text-lg text-slate-950">
                      {formatDate(backup.createdAt)}
                    </strong>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Criado por {backup.createdByName || 'Sistema'} - Pecas:{' '}
                    {backup.counts?.pieces || 0} - Ocorrencias:{' '}
                    {backup.counts?.occurrences || 0} - Usuarios:{' '}
                    {backup.counts?.users || 0} - Logs: {backup.counts?.logs || 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => downloadBackupJson(backup)}
                  >
                    <Download className="h-4 w-4" />
                    Baixar JSON
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleRestore(backup)}
                    disabled={Boolean(loading) || !canRestore}
                    title={!canRestore ? 'Somente epaim@dev.com.br pode restaurar por enquanto.' : undefined}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {loading === backup.id ? 'Restaurando...' : 'Restaurar'}
                  </Button>
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
                Crie o primeiro snapshot manual para proteger os dados atuais.
              </p>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
