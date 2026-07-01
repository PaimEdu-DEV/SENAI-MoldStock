import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(value) {
  if (!value) return 'Nao informado'
  const date = value?.toDate ? value.toDate() : new Date(value)
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function statusTone(status) {
  if (status === 'OK') return 'ok'
  if (status === 'Em manutenção') return 'maintenance'
  if (status === 'Quebrado') return 'broken'
  return 'neutral'
}
