import { motion } from 'framer-motion'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { sendPasswordReset } from '../services/securityService.js'

function getResetErrorMessage(error) {
  const rawMessage = String(error?.message || '')
  const code = error?.code || rawMessage

  if (code.includes('auth/user-not-found')) {
    return 'Nao encontramos um professor cadastrado com este e-mail.'
  }

  if (code.includes('auth/invalid-email')) {
    return 'Digite um e-mail valido.'
  }

  if (code.includes('auth/too-many-requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  }

  return 'Nao foi possivel enviar o e-mail agora. Confira o endereco e tente novamente.'
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await sendPasswordReset(email)
      setMessage(
        'Se este e-mail estiver cadastrado, voce recebera um link de redefinicao em instantes. Confira tambem spam/lixo eletronico.',
      )
    } catch (err) {
      setError(getResetErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Acesso seguro"
        title="Recuperar senha"
        description="Informe o e-mail administrativo para receber um link seguro de redefinicao."
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              E-mail
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="professor@docente.senai.br"
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
              <MailCheck className="h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar redefinicao'}
            </Button>
          </form>
          <Link className="mt-5 block text-sm font-bold text-senai-blue" to="/login">
            Voltar para login
          </Link>
        </Card>
      </motion.div>
    </section>
  )
}
