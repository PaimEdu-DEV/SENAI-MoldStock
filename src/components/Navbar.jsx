import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import senaiLogo from '../assets/senai.png'
import { useAuth } from '../contexts/useAuth.js'
import { cn } from '../lib/utils.js'
import { Button } from './ui/button.jsx'

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950',
          isActive && 'bg-slate-100 text-slate-950',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export default function Navbar() {
  const { isAdmin, isSuperAdmin, logout, profile } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('moldstock-theme') || 'light'
  })

  useEffect(() => {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('moldstock-theme', theme)
  }, [theme])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/82 backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="group flex items-center gap-4">
          <div className="grid h-11 w-28 place-items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-soft transition group-hover:-translate-y-0.5">
            <img src={senaiLogo} alt="SENAI" className="w-24" />
          </div>
          <div className="hidden sm:block">
            <strong className="block text-sm font-extrabold tracking-tight text-slate-950">
              MoldStock
            </strong>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-senai-red">
              Plasticos
            </span>
          </div>
        </NavLink>

        <nav className="flex items-center justify-end gap-1 sm:gap-2">
          <NavItem to="/">Catalogo</NavItem>
          <AnimatePresence>
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <NavItem to="/admin">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </NavItem>
              </motion.div>
            )}
          </AnimatePresence>
          {isSuperAdmin && (
            <NavItem to="/admin/professores">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Professores</span>
            </NavItem>
          )}
          {isAdmin ? (
            <Button type="button" variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{profile?.nome || 'Sair'}</span>
            </Button>
          ) : (
            <Button asChild variant="red" size="sm">
              <NavLink to="/login">
                <LogIn className="h-4 w-4" />
                Entrar
              </NavLink>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          {isSuperAdmin && (
            <ShieldCheck className="ml-1 hidden h-5 w-5 text-senai-blue sm:block" />
          )}
        </nav>
      </div>
    </motion.header>
  )
}
