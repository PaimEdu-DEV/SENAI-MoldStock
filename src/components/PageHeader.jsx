import { motion } from 'framer-motion'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { cn } from '../lib/utils.js'

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}) {
  const isMobile = useIsMobile()
  const Component = isMobile ? 'section' : motion.section
  const motionProps = isMobile
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } }

  return (
    <Component
      {...motionProps}
      className={cn(
        'premium-card premium-hero relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/88 p-5 shadow-soft backdrop-blur-xl sm:rounded-[2rem] sm:p-8 lg:p-10',
        className,
      )}
    >
      <div className="absolute inset-0 hidden glass-grid opacity-40 sm:block" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="text-xs font-black uppercase tracking-[0.28em] text-senai-red">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-5xl sm:tracking-[-0.04em] lg:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
              {description}
            </p>
          )}
        </div>
        {action && <div className="relative shrink-0">{action}</div>}
      </div>
      {children && <div className="relative mt-8">{children}</div>}
    </Component>
  )
}
