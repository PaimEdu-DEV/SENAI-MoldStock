const actionLabels = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
  STATUS_CHANGE: 'Alteração de status',
  BACKUP: 'Backup',
  BACKUP_SKIPPED: 'Backup ignorado',
  BACKUP_PROTECTION_ON: 'Proteção ativada',
  BACKUP_PROTECTION_OFF: 'Proteção encerrada',
  BACKUP_PROTECTION_OVERRIDE: 'Proteção ignorada',
  RESTORE: 'Restauração',
  USER_CREATE: 'Criação de usuário',
  USER_DELETE: 'Exclusão de usuário',
  USER_PROMOTE: 'Promoção de usuário',
  USER_DEMOTE: 'Rebaixamento de usuário',
  OCCURRENCE_CREATE: 'Registro de ocorrência',
  CONFIG_UPDATE: 'Alteração de configuração',
  PERMISSION_DENIED: 'Acesso negado',
}

const entityLabels = {
  piece: 'Molde',
  pieces: 'Moldes',
  user: 'Usuário',
  users: 'Usuários',
  backup: 'Backup',
  occurrence: 'Ocorrência',
  occurrences: 'Ocorrências',
  system: 'Sistema',
  qrcode: 'QR Code',
  config: 'Configuração',
}

const actionVariants = {
  CREATE: 'ok',
  USER_CREATE: 'ok',
  OCCURRENCE_CREATE: 'ok',
  UPDATE: 'blue',
  USER_PROMOTE: 'blue',
  USER_DEMOTE: 'maintenance',
  CONFIG_UPDATE: 'blue',
  STATUS_CHANGE: 'maintenance',
  DELETE: 'broken',
  USER_DELETE: 'broken',
  BACKUP: 'blue',
  BACKUP_SKIPPED: 'maintenance',
  BACKUP_PROTECTION_ON: 'maintenance',
  BACKUP_PROTECTION_OFF: 'ok',
  BACKUP_PROTECTION_OVERRIDE: 'blue',
  RESTORE: 'maintenance',
  PERMISSION_DENIED: 'broken',
}

export function formatAction(action) {
  return actionLabels[action] || action || 'Ação'
}

export function formatEntity(entity) {
  return entityLabels[entity] || entity || 'Sistema'
}

export function getActionVariant(action) {
  return actionVariants[action] || 'neutral'
}

export function formatBackupType(type) {
  const labels = {
    manual: 'Backup manual',
    automatic: 'Backup automático',
    pre_restore: 'Backup de segurança',
  }
  return labels[type] || 'Backup'
}

export function getBackupVariant(type) {
  const variants = {
    manual: 'blue',
    automatic: 'ok',
    pre_restore: 'maintenance',
  }
  return variants[type] || 'neutral'
}

function getPieceLabel(log) {
  const source = log?.before || log?.after || {}
  const name = source.nome || source.name || source.codigo || source.code
  if (!name) return ''
  const code = source.codigo && source.codigo !== name ? ` (${source.codigo})` : ''
  return `${name}${code}`
}

export function formatLogDescription(log) {
  const description = log?.description || ''
  const pieceLabel = log?.entity === 'piece' ? getPieceLabel(log) : ''

  if (pieceLabel && description.includes('foi exclu')) {
    return `Molde '${pieceLabel}' foi excluído do sistema.`
  }

  if (pieceLabel && description.includes('foi atualizado')) {
    return `Molde '${pieceLabel}' foi atualizado.`
  }

  if (pieceLabel && description.includes('foi cadastrado')) {
    return `Molde '${pieceLabel}' foi cadastrado.`
  }

  if (/^Molde .+ criado\.$/.test(description)) {
    const name = description.replace(/^Molde /, '').replace(/ criado\.$/, '')
    return `Molde '${name}' foi cadastrado.`
  }

  if (/^Molde .+ atualizado\.$/.test(description)) {
    const name = description.replace(/^Molde /, '').replace(/ atualizado\.$/, '')
    return `Molde '${name}' foi atualizado.`
  }

  if (description === 'Molde excluído.') {
    return 'Um molde foi excluído do sistema.'
  }

  if (description.startsWith('Status alterado para ')) {
    return description.replace('Status alterado para ', 'Status do molde alterado para ')
  }

  if (description === 'Backup pre_restore criado.') {
    return 'Backup de segurança criado antes da restauração.'
  }

  if (description === 'Backup manual criado.') {
    return 'Backup manual criado com sucesso.'
  }

  if (description === 'Backup automatic criado.' || description === 'Backup automatico criado.') {
    return 'Backup automático criado pelo sistema.'
  }

  if (description === 'Backup restaurado. Um backup pre_restore foi criado antes da restauração.') {
    return 'Backup restaurado com sucesso. Um backup de segurança foi criado antes da restauração.'
  }

  if (description.includes('promovido a Super Admin')) {
    return description.replace('promovido a Super Admin.', 'foi promovido para Super Admin.')
  }

  if (description.includes('rebaixado para professor')) {
    return description.replace('rebaixado para professor.', 'foi rebaixado para professor.')
  }

  if (description.includes('criado como professor administrador')) {
    return description.replace('criado como professor administrador.', 'foi cadastrado como professor.')
  }

  if (description.includes('removido do painel administrativo')) {
    return description.replace('removido do painel administrativo', 'foi removido do painel administrativo')
  }

  return description
}
