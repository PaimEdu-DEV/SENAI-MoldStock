import { motion } from 'framer-motion'
import { Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import senaiLogo from '../assets/senai.png'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { createAuditLog } from '../services/auditService.js'
import { withTimeout } from '../services/timeout.js'
import { loginAdmin } from '../services/userService.js'

function getLoginErrorMessage(error) {
  const rawMessage = String(error?.message || '')
  const code = error?.code || rawMessage

  if (
    code.includes('auth/invalid-credential') ||
    code.includes('auth/wrong-password') ||
    code.includes('auth/user-not-found') ||
    code.includes('auth/invalid-login-credentials') ||
    rawMessage.includes('Credenciais invalidas')
  ) {
    return 'Erro ao entrar. Usuario ou senha incorretos.'
  }

  if (rawMessage.includes('ja existe')) {
    return 'Este e-mail ja existe. Use a senha correta ou redefina a senha.'
  }

  if (rawMessage.includes('desativado')) {
    return rawMessage
  }

  return 'Erro ao entrar. Tente novamente em alguns instantes.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { adoptSessionProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const profile = await withTimeout(
        loginAdmin(email, password),
        'Demorou demais para entrar. Confira Authentication e banco de dados.',
        10000,
      )
      await createAuditLog(profile, {
        action: 'LOGIN',
        entity: 'system',
        description: 'Professor entrou no sistema.',
      }).catch(() => {})
      adoptSessionProfile(profile)
      navigate(profile?.mustChangePassword ? '/alterar-senha' : location.state?.from || '/admin')
    } catch (err) {
      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden p-8">
          <div className="mb-8">
            <div className="mb-6 grid h-14 w-32 place-items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-soft">
              <img src={senaiLogo} alt="SENAI" className="w-24" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.28em] text-senai-red">
              Area administrativa
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              Entrar como professor
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Acesse o painel para gerenciar moldes, ocorrencias e QR Codes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              E-mail
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Senha
              <span className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
            <Button type="submit" variant="red" disabled={loading}>
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Professor novo?{' '}
            <Link to="/cadastro" className="font-bold text-senai-red">
              Cadastrar com e-mail docente
            </Link>
            <span className="mx-2">ou</span>
            <Link to="/esqueci-senha" className="font-bold text-senai-blue">
              esqueci minha senha
            </Link>
          </p>
        </Card>
      </motion.div>
    </section>
  )
}
