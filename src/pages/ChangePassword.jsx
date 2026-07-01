import { motion } from 'framer-motion'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { completeFirstAccessPassword } from '../services/securityService.js'

function PasswordField({ label, value, onChange, visible, onToggle }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <span className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          minLength="6"
          required
          value={value}
          onChange={onChange}
          className="pr-12"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onToggle}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  )
}

export default function ChangePassword() {
  const { profile, adoptSessionProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [visible, setVisible] = useState(false)
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
      await completeFirstAccessPassword({
        newPassword: form.newPassword,
        profile,
      })
      adoptSessionProfile({
        ...profile,
        mustChangePassword: false,
        temporaryPassword: null,
      })
      setMessage('Senha definida com sucesso.')
      setTimeout(() => navigate('/admin'), 600)
    } catch (err) {
      const rawMessage = String(err.message || '')
      setError(
        rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('Permission denied')
          ? 'Acesso negado ao finalizar primeiro acesso. Publique as regras atualizadas do banco e tente novamente.'
          : rawMessage,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Primeiro acesso"
        title="Defina sua senha"
        description="Voce entrou com uma senha temporaria criada pelo Super Admin. Defina uma senha propria para liberar o painel."
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <PasswordField
              label="Nova senha"
              value={form.newPassword}
              visible={visible}
              onToggle={() => setVisible(!visible)}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            />
            <PasswordField
              label="Confirmar nova senha"
              value={form.confirmPassword}
              visible={visible}
              onToggle={() => setVisible(!visible)}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            />
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
              {loading ? 'Definindo...' : 'Definir senha'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </section>
  )
}
