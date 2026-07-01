import { cn } from '../../lib/utils.js'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('space-y-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-lg font-semibold tracking-tight text-slate-950', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
