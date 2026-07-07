import { cn } from '../../lib/utils.js'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-senai-blue/60 focus:ring-4 focus:ring-senai-blue/10 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-300/60 dark:focus:ring-blue-400/15',
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
        'min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-senai-blue/60 focus:ring-4 focus:ring-senai-blue/10 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-300/60 dark:focus:ring-blue-400/15',
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
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition duration-200 focus:border-senai-blue/60 focus:ring-4 focus:ring-senai-blue/10 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100 dark:focus:border-blue-300/60 dark:focus:ring-blue-400/15',
        className,
      )}
      {...props}
    />
  )
}


