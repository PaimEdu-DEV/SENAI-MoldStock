import { motion } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import senaiLogo from '../assets/senai.png'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { registerSelfAdmin } from '../services/userService.js'
import { withTimeout } from '../services/timeout.js'

export default function Register() {
  const [form, setForm] = useState({ nome: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setStep('Criando acesso docente...')
    try {
      await withTimeout(
        registerSelfAdmin(form),
        'Demorou demais para concluir. Confira regras do banco de dados.',
        10000,
      )
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="mb-8">
            <div className="mb-6 grid h-14 w-32 place-items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-soft">
              <img src={senaiLogo} alt="SENAI" className="w-24" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.28em] text-senai-red">
              Cadastro docente
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              Criar acesso
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Cadastro livre permitido apenas para e-mails @docente.senai.br.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Nome
              <Input
                required
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              E-mail institucional
              <Input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nome@docente.senai.br"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Senha
              <Input
                type="password"
                minLength="6"
                required
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
            {loading && step && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-senai-blue">
                {step}
              </div>
            )}
            <Button type="submit" variant="red" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </section>
  )
}
