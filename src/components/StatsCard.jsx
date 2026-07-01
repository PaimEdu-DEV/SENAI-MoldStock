import { motion } from 'framer-motion'
import { cn } from '../lib/utils.js'
import { Card } from './ui/card.jsx'

const tones = {
  blue: 'from-blue-50 to-white text-senai-blue ring-blue-100 dark:from-[#10294c] dark:to-[#0b1b33] dark:text-blue-300 dark:ring-blue-300/15',
  ok: 'from-emerald-50 to-white text-status-ok ring-emerald-100 dark:from-[#0d302f] dark:to-[#0b1b33] dark:text-emerald-300 dark:ring-emerald-300/15',
  maintenance: 'from-amber-50 to-white text-status-maintenance ring-amber-100 dark:from-[#342a16] dark:to-[#0b1b33] dark:text-amber-300 dark:ring-amber-300/15',
  broken: 'from-rose-50 to-white text-status-broken ring-rose-100 dark:from-[#351d2a] dark:to-[#0b1b33] dark:text-rose-300 dark:ring-rose-300/15',
}

export default function StatsCard({ icon: Icon, label, value, description, tone = 'blue' }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn(
          'relative overflow-hidden bg-gradient-to-br p-5',
          tones[tone] || tones.blue,
        )}
      >
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-current opacity-[0.06]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
              {label}
            </p>
            <strong className="mt-2 block text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {value}
            </strong>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 ring-1 ring-current/15 dark:bg-[#061225]/80">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="relative mt-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
          {description}
        </p>
      </Card>
    </motion.div>
  )
}
