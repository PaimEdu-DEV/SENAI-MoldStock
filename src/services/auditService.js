import { off, onValue, push, ref as databaseRef, set } from 'firebase/database'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatAction, formatEntity, formatLogDescription } from '../lib/auditFormat.js'
import { db, requireFirebase } from './firebase.js'
import { withTimeout } from './timeout.js'

function logsRef(id = '') {
  requireFirebase()
  return databaseRef(db, id ? `logs/${id}` : 'logs')
}

export function buildActor(profile) {
  return {
    userId: profile?.uid || '',
    userName: profile?.nome || profile?.name || 'Sistema',
    userEmail: profile?.email || '',
    userRole: profile?.role || 'public',
  }
}

export async function createAuditLog(profile, payload) {
  const actor = buildActor(profile)
  const newLogRef = push(logsRef())
  const log = {
    ...actor,
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId || null,
    description: payload.description,
    before: payload.before || null,
    after: payload.after || null,
    createdAt: Date.now(),
  }

  await withTimeout(
    set(newLogRef, log),
    'Não foi possível registrar auditoria.',
    8000,
  )
  return { id: newLogRef.key, ...log }
}

export function watchLogs(callback, onError) {
  const listRef = logsRef()
  onValue(
    listRef,
    (snapshot) => {
      const value = snapshot.val() || {}
      const logs = Object.entries(value)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      callback(logs)
    },
    onError,
  )
  return () => off(listRef)
}

export function filterLogs(logs, filters) {
  const search = filters.search.trim().toLowerCase()
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : 0
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`).getTime() : Infinity

  return logs.filter((log) => {
    const haystack = [
      log.userName,
      log.userEmail,
      log.action,
      log.entity,
      log.description,
      log.entityId,
    ]
      .join(' ')
      .toLowerCase()

    const matchSearch = !search || haystack.includes(search)
    const matchAction = filters.action === 'Todos' || log.action === filters.action
    const matchEntity = filters.entity === 'Todos' || log.entity === filters.entity
    const matchUser =
      filters.user === 'Todos' || log.userEmail === filters.user || log.userName === filters.user
    const time = Number(log.createdAt || 0)
    return matchSearch && matchAction && matchEntity && matchUser && time >= start && time <= end
  })
}

export async function exportLogsPdf(logs, filters, profile) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const issuedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('SENAI MoldStock', 14, 16)
  doc.setFontSize(13)
  doc.text('Relatório de Auditoria', 14, 25)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Emitido em: ${issuedAt}`, 14, 33)
  doc.text(`Exportado por: ${profile?.nome || profile?.email || 'Sistema'}`, 14, 39)
  doc.text(
    `Filtros: ação=${filters.action === 'Todos' ? 'Todas' : formatAction(filters.action)}; entidade=${filters.entity === 'Todos' ? 'Todas' : formatEntity(filters.entity)}; usuário=${filters.user}; período=${filters.startDate || '-'} até ${filters.endDate || '-'}`,
    14,
    45,
  )

  autoTable(doc, {
    startY: 52,
    head: [['Data', 'Usuário', 'Função', 'Ação', 'Entidade', 'Descrição']],
    body: logs.map((log) => [
      new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(log.createdAt || Date.now())),
      log.userName || log.userEmail || '-',
      log.userRole || '-',
      formatAction(log.action),
      formatEntity(log.entity),
      formatLogDescription(log) || '-',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [36, 84, 166] },
    alternateRowStyles: { fillColor: [246, 248, 252] },
  })

  const pageCount = doc.getNumberOfPages()
  for (let index = 1; index <= pageCount; index += 1) {
    doc.setPage(index)
    doc.setFontSize(8)
    doc.text(
      `MoldStock SENAI - Página ${index} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8,
    )
  }

  doc.save(`logs-moldstock-${new Date().toISOString().slice(0, 10)}.pdf`)
}


