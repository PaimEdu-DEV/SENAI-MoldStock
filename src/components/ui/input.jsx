import { cn } from '../../lib/utils.js'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-senai-blue/60 focus:ring-4 focus:ring-senai-blue/10',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-senai-blue/60 focus:ring-4 focus:ring-senai-blue/10',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-senai-blue/60 focus:ring-4 focus:ring-senai-blue/10',
        className,
      )}
      {...props}
    />
  )
}


