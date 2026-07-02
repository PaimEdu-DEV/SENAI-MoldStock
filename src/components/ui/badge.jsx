import { cn, statusTone } from '../../lib/utils.js'

const variants = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-700',
  broken: 'border-rose-200 bg-rose-50 text-rose-700',
  blue: 'border-blue-200 bg-blue-50 text-senai-blue',
  red: 'border-red-200 bg-red-50 text-senai-red',
}

export function Badge({ className, variant = 'neutral', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function StatusBadge({ status, className }) {
  const tone = statusTone(status)
  return (
    <Badge variant={tone} className={cn('pl-2', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  )
}


