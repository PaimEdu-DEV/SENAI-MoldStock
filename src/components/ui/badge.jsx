import { cn, statusTone } from '../../lib/utils.js'

const variants = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200',
  broken: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-200',
  blue: 'border-blue-200 bg-blue-50 text-senai-blue dark:border-blue-300/20 dark:bg-blue-400/10 dark:text-blue-200',
  red: 'border-red-200 bg-red-50 text-senai-red dark:border-orange-300/20 dark:bg-orange-400/10 dark:text-orange-200',
}

export function Badge({ className, variant = 'neutral', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm transition duration-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,.04)]',
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


