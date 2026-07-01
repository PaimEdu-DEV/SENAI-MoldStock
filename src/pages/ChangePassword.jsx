import { motion } from 'framer-motion'
import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { changeCurrentUserPassword } from '../services/securityService.js'

export default function ChangePassword() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (form.newPassword !== form.confirmPassword) {
      setError('A confirmacao da senha nao confere.')
      return
    }
    setLoading(true)
    try {
      await changeCurrentUserPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        profile,
      })
      setMessage('Senha alterada com sucesso.')
      setTimeout(() => navigate('/admin'), 600)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow={profile?.mustChangePassword ? 'Primeiro acesso' : 'Seguranca'}
        title="Alterar senha"
        description={
          profile?.mustChangePassword
            ? 'Troque a senha temporaria para liberar o painel administrativo.'
            : 'Atualize sua senha de acesso administrativo.'
        }
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Senha atual
              <Input
                type="password"
                required
                value={form.currentPassword}
                onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Nova senha
              <Input
                type="password"
                minLength="6"
                required
                value={form.newPassword}
                onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Confirmar nova senha
              <Input
                type="password"
                minLength="6"
                required
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              />
            </label>
            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading}>
              <LockKeyhole className="h-4 w-4" />
              {loading ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </section>
  )
}
