import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        default:
          'border border-senai-blue/20 bg-senai-blue text-white shadow-[0_14px_30px_rgba(36,84,166,.22)] hover:-translate-y-0.5 hover:border-blue-300/60 hover:bg-[#2d62b8] hover:shadow-[0_18px_42px_rgba(36,84,166,.28)] focus-visible:ring-senai-blue/20 dark:border-blue-300/20 dark:bg-[#2b63be] dark:text-blue-50 dark:shadow-[0_16px_38px_rgba(36,84,166,.24),inset_0_1px_0_rgba(255,255,255,.12)] dark:hover:bg-[#3470d4] dark:hover:shadow-[0_18px_46px_rgba(36,84,166,.34),0_0_24px_rgba(96,165,250,.08)]',
        destructive:
          'bg-status-broken text-white shadow-[0_14px_30px_rgba(190,24,39,.18)] hover:-translate-y-0.5 hover:bg-[#9f1239] focus-visible:ring-status-broken/20 dark:border dark:border-rose-300/15 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/25',
        secondary:
          'border border-slate-200 bg-white text-slate-900 shadow-soft hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-200 dark:shadow-[0_12px_30px_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.04)] dark:hover:border-blue-300/15 dark:hover:bg-white/[0.075] dark:hover:text-white',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.055] dark:hover:text-white',
        quiet:
          'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:bg-white/[0.085]',
        red: 'bg-senai-orange text-white shadow-[0_14px_30px_rgba(249,115,22,.22)] hover:-translate-y-0.5 hover:bg-[#ea580c] dark:border dark:border-orange-300/18 dark:bg-orange-500/90 dark:hover:bg-orange-400',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4',
        lg: 'h-12 px-5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}


