import { Boxes } from 'lucide-react'
import { cn } from '../lib/utils.js'

export default function PieceImage({ src, alt, className, placeholderClassName }) {
  if (src) {
    return <img src={src} alt={alt} className={className} />
  }

  return (
    <div
      className={cn(
        'grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(36,84,166,.16),transparent_34%),linear-gradient(135deg,#f8fafc,#eef4fb)] text-senai-blue dark:bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,.18),transparent_34%),linear-gradient(135deg,#0b1b33,#10294c)]',
        placeholderClassName,
      )}
      aria-label={alt}
      role="img"
    >
      <div className="grid place-items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl border border-senai-blue/15 bg-white/75 shadow-soft dark:bg-white/10">
          <Boxes className="h-8 w-8" />
        </div>
        <span className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
          Sem imagem
        </span>
      </div>
    </div>
  )
}


