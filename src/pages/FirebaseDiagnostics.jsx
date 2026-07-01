import { Activity, CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { Card } from '../components/ui/card.jsx'
import { firebaseConfig, isFirebaseConfigured } from '../services/firebase.js'

function StatusIcon({ status }) {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
  if (status === 'error') return <XCircle className="h-5 w-5 text-rose-600" />
  return <Activity className="h-5 w-5 animate-pulse text-senai-blue" />
}

export default function FirebaseDiagnostics() {
  const [checks, setChecks] = useState([
    {
      name: 'Configuração Web',
      status: isFirebaseConfigured ? 'ok' : 'error',
      detail: isFirebaseConfigured ? 'Chaves carregadas do .env.' : 'Arquivo .env incompleto.',
    },
    {
      name: 'Realtime Database',
      status: 'loading',
      detail: 'Verificando banco...',
    },
  ])

  useEffect(() => {
    async function runChecks() {
      if (!isFirebaseConfigured || !firebaseConfig.databaseURL) return

      try {
        const response = await fetch(`${firebaseConfig.databaseURL}/.json`)
        if (response.status === 404) {
          throw new Error('Realtime Database não foi criado neste projeto.')
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Realtime Database existe, mas as regras bloquearam a leitura.')
        }
        setChecks((current) =>
          current.map((check) =>
            check.name === 'Realtime Database'
              ? { ...check, status: 'ok', detail: 'Realtime Database respondeu.' }
              : check,
          ),
        )
      } catch (error) {
        setChecks((current) =>
          current.map((check) =>
            check.name === 'Realtime Database'
              ? { ...check, status: 'error', detail: error.message }
              : check,
          ),
        )
      }
    }

    runChecks()
  }, [])

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Diagnóstico"
        title="Firebase do MoldStock"
        description="Verificações rápidas para saber se a configuração local está conectada ao projeto Firebase."
      />

      <Card className="grid gap-3 p-6">
        {checks.map((check) => (
          <article
            key={check.name}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <StatusIcon status={check.status} />
            <div>
              <strong className="text-slate-950">{check.name}</strong>
              <span className="block text-sm text-slate-500">{check.detail}</span>
            </div>
          </article>
        ))}
      </Card>
    </div>
  )
}
