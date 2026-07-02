import { Eye, EyeOff, Shield, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card } from '../components/ui/card.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.jsx'
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
  const [roleRequest, setRoleRequest] = useState(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [confirmingRole, setConfirmingRole] = useState(false)
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
      setError('Você não pode remover seu próprio perfil de administrador.')
      return
    }
    setError('')
    setAdminPassword('')
    setRoleRequest({ admin, role })
  }

  async function confirmRoleChange(event) {
    event.preventDefault()
    if (!roleRequest) return
    setConfirmingRole(true)
    try {
      await reauthenticateCurrentUser(adminPassword)
      await updateProfessor(
        roleRequest.admin.uid,
        { role: roleRequest.role },
        profile,
        roleRequest.admin,
      )
      setRoleRequest(null)
      setAdminPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmingRole(false)
    }
  }

  async function handleActiveChange(admin) {
    if (admin.uid === user.uid) {
      setError('Você não pode desativar seu próprio acesso.')
      return
    }
    await updateProfessor(admin.uid, { active: !admin.active }, profile, admin)
  }

  async function handleDelete(admin) {
    if (admin.uid === user.uid) {
      setError('Você não pode excluir seu próprio acesso.')
      return
    }
    const confirmed = window.confirm(`Remover ${admin.nome}?`)
    if (confirmed) await deleteProfessor(admin.uid, profile, admin)
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={profile?.nome || profile?.name || 'Super Admin'}
        title="Gestão de professores"
        description="Controle permissões administrativas, senhas temporárias e acessos docentes com rastreabilidade."
      />

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            Novo professor
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            O novo professor entra como administrador e troca a senha temporária no primeiro acesso.
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
              Senha temporária
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
                    showCreatePassword ? 'Ocultar senha temporária' : 'Mostrar senha temporária'
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
                      <span>Senha temporária:</span>
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
                            ? 'Ocultar senha temporária'
                            : 'Mostrar senha temporária'
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

      <Dialog open={Boolean(roleRequest)} onOpenChange={(open) => !open && setRoleRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle>Confirmar alteração de permissão</DialogTitle>
            <DialogDescription>
              Informe sua senha para alterar a permissão de{' '}
              {roleRequest?.admin?.nome || 'professor'}.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={confirmRoleChange}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sua senha
              <Input
                type="password"
                required
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoFocus
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setRoleRequest(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={confirmingRole}>
                <ShieldCheck className="h-4 w-4" />
                {confirmingRole ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}



