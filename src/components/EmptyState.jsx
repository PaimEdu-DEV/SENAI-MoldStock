import { PackageSearch } from 'lucide-react'
import { Card } from './ui/card.jsx'

export default function EmptyState({ title = 'Nenhum registro encontrado', description }) {
  return (
    <Card className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <PackageSearch className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
    </Card>
  )
}
