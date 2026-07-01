import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        default:
          'border border-orange-200 bg-orange-100 text-orange-900 shadow-[0_14px_30px_rgba(249,115,22,.14)] hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-200 focus-visible:ring-orange-400/20 dark:border-orange-300/25 dark:bg-orange-400/15 dark:text-orange-100 dark:hover:bg-orange-400/20',
        destructive:
          'bg-status-broken text-white shadow-[0_14px_30px_rgba(190,24,39,.18)] hover:-translate-y-0.5 hover:bg-[#9f1239] focus-visible:ring-status-broken/20',
        secondary:
          'border border-slate-200 bg-white text-slate-900 shadow-soft hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        quiet: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
        red: 'bg-senai-orange text-white shadow-[0_14px_30px_rgba(249,115,22,.22)] hover:-translate-y-0.5 hover:bg-[#ea580c]',
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
