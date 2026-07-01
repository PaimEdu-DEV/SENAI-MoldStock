import { Database, FileCode2 } from 'lucide-react'
import { Card } from './ui/card.jsx'

export default function FirebaseSetupNotice() {
  return (
    <section className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-senai-blue/10 text-senai-blue">
          <Database className="h-7 w-7" />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.28em] text-senai-red">
          Configuração pendente
        </span>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
          Falta conectar o Firebase
        </h1>
        <p className="mt-4 leading-7 text-slate-500">
          Crie um arquivo <strong>.env</strong> na raiz do projeto usando o
          <strong> .env.example</strong> como modelo, preencha as chaves do Firebase e
          reinicie o Vite.
        </p>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <FileCode2 className="h-5 w-5 text-senai-blue" />
          <code>copy .env.example .env</code>
        </div>
      </Card>
    </section>
  )
}
