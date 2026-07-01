import { motion } from 'framer-motion'
import { Download, Search, ScrollText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input, Select } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { formatDate } from '../lib/utils.js'
import {
  exportLogsPdf,
  filterLogs,
  watchLogs,
} from '../services/auditService.js'

const initialFilters = {
  search: '',
  action: 'Todos',
  entity: 'Todos',
  user: 'Todos',
  startDate: '',
  endDate: '',
}

const actions = [
  'Todos',
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'BACKUP',
  'RESTORE',
  'EXPORT',
  'PERMISSION_DENIED',
]

const entities = ['Todos', 'piece', 'user', 'backup', 'system', 'occurrence', 'qrcode']

export default function AuditLogs() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(80)

  useEffect(() => watchLogs(setLogs, (err) => setError(err.message)), [])

  const users = useMemo(
    () => ['Todos', ...new Set(logs.map((log) => log.userEmail || log.userName).filter(Boolean))],
    [logs],
  )

  const filteredLogs = useMemo(() => filterLogs(logs, filters), [logs, filters])
  const visibleLogs = filteredLogs.slice(0, limit)

  function handleExport() {
    exportLogsPdf(filteredLogs, filters, profile)
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Auditoria do sistema"
        description="Rastreie acoes administrativas, seguranca, backups e operacoes sensiveis."
        action={
          <Button type="button" onClick={handleExport} disabled={!filteredLogs.length}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        }
      />

      <Card className="grid gap-4 p-4 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Pesquisar usuario, acao, entidade ou descricao"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </label>
        <Select
          value={filters.action}
          onChange={(event) => setFilters({ ...filters, action: event.target.value })}
        >
          {actions.map((action) => (
            <option key={action}>{action}</option>
          ))}
        </Select>
        <Select
          value={filters.entity}
          onChange={(event) => setFilters({ ...filters, entity: event.target.value })}
        >
          {entities.map((entity) => (
            <option key={entity}>{entity}</option>
          ))}
        </Select>
        <Select
          value={filters.user}
          onChange={(event) => setFilters({ ...filters, user: event.target.value })}
        >
          {users.map((user) => (
            <option key={user}>{user}</option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {visibleLogs.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-4">Data</th>
                    <th className="px-5 py-4">Usuario</th>
                    <th className="px-5 py-4">Acao</th>
                    <th className="px-5 py-4">Entidade</th>
                    <th className="px-5 py-4">Descricao</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.01, 0.2) }}
                      className="border-b border-slate-100 bg-white"
                    >
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-950">
                          {log.userName || 'Sistema'}
                        </div>
                        <div className="text-xs text-slate-400">{log.userEmail || '-'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={log.action === 'PERMISSION_DENIED' ? 'broken' : 'blue'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {log.entity}
                      </td>
                      <td className="max-w-xl px-5 py-4 text-sm leading-6 text-slate-500">
                        {log.description}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > visibleLogs.length && (
              <div className="border-t border-slate-100 p-4 text-center">
                <Button type="button" variant="secondary" onClick={() => setLimit(limit + 80)}>
                  Carregar mais logs
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <ScrollText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">Nenhum log encontrado</h3>
              <p className="mt-1 text-sm text-slate-500">
                Ajuste os filtros para ampliar a busca.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
