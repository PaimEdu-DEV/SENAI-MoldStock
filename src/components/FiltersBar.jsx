import { motion } from 'framer-motion'
import { Filter, MapPin, Search } from 'lucide-react'
import { Input, Select } from './ui/input.jsx'

export default function FiltersBar({ filters, setFilters, showLocation = true }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-soft backdrop-blur-xl"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-13 text-base shadow-inner shadow-slate-200/30"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Buscar por codigo, nome, categoria ou localizacao"
          />
        </label>

        <label className="relative block">
          <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Select
            className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11"
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="Todos">Todos os status</option>
            <option value="OK">OK</option>
            <option value="Em manutenção">Em manutenção</option>
            <option value="Quebrado">Quebrado</option>
          </Select>
        </label>

        {showLocation && (
          <label className="relative block">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11"
              value={filters.localizacao}
              onChange={(event) =>
                setFilters({ ...filters, localizacao: event.target.value })
              }
              placeholder="Localizacao"
            />
          </label>
        )}
      </div>
    </motion.section>
  )
}
