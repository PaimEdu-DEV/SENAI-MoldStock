import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { acknowledgeAdminRevocation } from '../services/userService.js'

export default function AdminAccessRevoked() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleAcknowledge() {
    await acknowledgeAdminRevocation(profile)
    navigate('/', { replace: true })
  }

  return (
    <section className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-senai-blue dark:bg-blue-400/10 dark:text-blue-200">
          <ShieldX className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
          Acesso administrativo revogado
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          Seu acesso como administrador do MoldStock foi revogado. Caso acredite que isso foi um
          engano ou precise de mais informacoes, entre em contato com um Super Administrador ou com
          o responsavel pelo sistema.
        </p>
        <Button type="button" className="mt-6" onClick={handleAcknowledge}>
          Entendi
        </Button>
      </Card>
    </section>
  )
}
