import { motion } from 'framer-motion'
import { cn } from '../lib/utils.js'

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/88 p-6 shadow-soft backdrop-blur-xl sm:p-8 lg:p-10',
        className,
      )}
    >
      <div className="absolute inset-0 glass-grid opacity-40" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-senai-blue/10 blur-3xl" />
      <div className="absolute -bottom-28 left-1/2 h-64 w-64 rounded-full bg-senai-red/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="page-header-copy max-w-3xl">
          {eyebrow && (
            <span className="text-xs font-black uppercase tracking-[0.28em] text-senai-red">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
              {description}
            </p>
          )}
        </div>
        {action && <div className="page-header-action relative shrink-0">{action}</div>}
      </div>
      {children && <div className="relative mt-8">{children}</div>}
    </motion.section>
  )
}


