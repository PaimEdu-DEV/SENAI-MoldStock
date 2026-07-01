import { Eye, EyeOff, Shield, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import { Input, Select } from '../components/ui/input.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { reauthenticateCurrentUser } from '../services/securityService.js'
import {
  createProfessor,
  deleteProfessor,
  updateProfessor,
  watchAdmins,
} from '../services/userService.js'

const emptyForm = {
  nome: '',
  email: '',
  password: '',
}

export default function AdminUsers() {
  const { user, profile } = useAuth()
  const [admins, setAdmins] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [visibleTemporaryPasswords, setVisibleTemporaryPasswords] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => watchAdmins(setAdmins, (err) => setError(err.message)), [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createProfessor({ ...form, role: 'admin' }, profile)
      setForm(emptyForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(admin, role) {
    if (admin.uid === user.uid && role !== 'superadmin') {
      setError('Voce nao pode remover seu proprio perfil de Super Admin.')
      return
    }
    const password = window.prompt(
      `Confirme sua senha para alterar a permissao de ${admin.nome}.`,
    )
    if (!password) return
    try {
      await reauthenticateCurrentUser(password)
    } catch (err) {
      setError(err.message)
      return
    }
    await updateProfessor(admin.uid, { role }, profile, admin)
  }

  async function handleActiveChange(admin) {
    if (admin.uid === user.uid) {
      setError('Voce nao pode desativar seu proprio acesso.')
      return
    }
    await updateProfessor(admin.uid, { active: !admin.active }, profile, admin)
  }

  async function handleDelete(admin) {
    if (admin.uid === user.uid) {
      setError('Voce nao pode excluir seu proprio acesso.')
      return
    }
    const confirmed = window.confirm(`Remover ${admin.nome}?`)
    if (confirmed) await deleteProfessor(admin.uid, profile, admin)
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={profile?.nome || profile?.name || 'Nome do Super Admin'}
        title="Gestao de professores"
        description="Controle permissoes administrativas, senhas temporarias e acessos docentes com rastreabilidade."
      />

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            Novo professor
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            O novo professor entra como Admin e troca a senha temporaria no primeiro acesso.
          </p>
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Nome completo
              <Input
                required
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              E-mail
              <Input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Senha temporaria
              <span className="relative">
                <Input
                  type={showCreatePassword ? 'text' : 'password'}
                  minLength="6"
                  required
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  aria-label={
                    showCreatePassword ? 'Ocultar senha temporaria' : 'Mostrar senha temporaria'
                  }
                >
                  {showCreatePassword ? (
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
            <Button type="submit" disabled={saving}>
              <UserPlus className="h-4 w-4" />
              {saving ? 'Criando...' : 'Cadastrar professor'}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Equipe administrativa
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {admins.length} professores cadastrados no MoldStock.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {admins.map((admin) => (
              <article
                key={admin.uid}
                className="grid gap-4 p-5 transition hover:bg-slate-50 md:grid-cols-[1fr_170px_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-semibold text-slate-950">{admin.nome}</strong>
                    {admin.role === 'superadmin' && (
                      <Badge variant="blue">
                        <Shield className="h-3 w-3" />
                        Super Admin
                      </Badge>
                    )}
                    {admin.mustChangePassword && (
                      <Badge variant="maintenance">troca pendente</Badge>
                    )}
                    {admin.active === false && <Badge variant="broken">inativo</Badge>}
                  </div>
                  <span className="mt-1 block text-sm text-slate-500">{admin.email}</span>
                  {admin.mustChangePassword && admin.temporaryPassword && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      <span>Senha temporaria:</span>
                      <code className="font-mono">
                        {visibleTemporaryPasswords[admin.uid]
                          ? admin.temporaryPassword
                          : '••••••••'}
                      </code>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg text-amber-700 transition hover:bg-amber-100"
                        onClick={() =>
                          setVisibleTemporaryPasswords((current) => ({
                            ...current,
                            [admin.uid]: !current[admin.uid],
                          }))
                        }
                        aria-label={
                          visibleTemporaryPasswords[admin.uid]
                            ? 'Ocultar senha temporaria'
                            : 'Mostrar senha temporaria'
                        }
                      >
                        {visibleTemporaryPasswords[admin.uid] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <Select
                  value={admin.role}
                  onChange={(event) => handleRoleChange(admin, event.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleActiveChange(admin)}
                  >
                    {admin.active === false ? 'Ativar' : 'Desativar'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleDelete(admin)}
                  >
                    Remover
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
