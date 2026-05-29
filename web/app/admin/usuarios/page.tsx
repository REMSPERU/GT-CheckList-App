'use client';

import { useState, type FormEvent } from 'react';
import {
  Building2,
  Copy,
  KeyRound,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';

import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { AdminModal } from '@/components/ui/admin-modal';
import { Alert } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelectField } from '@/components/ui/searchable-select-field';
import { useAdminUsers } from '@/hooks/admin/use-admin-users';
import { ADMIN_ROLE_OPTIONS } from '@/services/admin/users.service';
import type { AdminUserPropertyAccessRow, AdminUserRow } from '@/types/admin';
import type { AdminRole } from '@/types/auth';

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'danger';
  onConfirm: () => Promise<void>;
}

type GeneratedPasswordScope = 'create' | 'password' | null;

function getUserName(user: AdminUserRow) {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return fullName || user.username || user.email;
}

function getUserInitials(user: AdminUserRow) {
  return getUserName(user)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null,
  );
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [generatedPasswordScope, setGeneratedPasswordScope] =
    useState<GeneratedPasswordScope>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<AdminRole>('TECNICO');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const propertyOptions = users.properties.map(property => ({
    value: property.id,
    label: property.name,
  }));

  function resetCreateForm() {
    setEmail('');
    setUsername('');
    setFirstName('');
    setLastName('');
    setRole('TECNICO');
    setIsActive(true);
    setPassword('');
    setGeneratePassword(true);
  }

  function requestRoleChange(role: AdminRole) {
    if (!users.selectedUser || role === users.selectedUser.role) return;

    const roleLabel =
      ADMIN_ROLE_OPTIONS.find(option => option.value === role)?.label ?? role;

    setConfirmation({
      title: 'Confirmar cambio de rol',
      description: `Estas seguro que quieres cambiar el rol de ${getUserName(users.selectedUser)} a ${roleLabel}?`,
      confirmLabel: 'Cambiar rol',
      onConfirm: () => users.updateRole(users.selectedUser!.id, role),
    });
  }

  function requestAssignProperty() {
    if (!users.selectedUser || !users.selectedPropertyId) return;

    const property = users.properties.find(
      item => item.id === users.selectedPropertyId,
    );

    setConfirmation({
      title: 'Confirmar asignacion',
      description: `Estas seguro que quieres asignar ${property?.name ?? 'este inmueble'} a ${getUserName(users.selectedUser)}?`,
      confirmLabel: 'Asignar',
      onConfirm: users.assignSelectedProperty,
    });
  }

  function requestRemoveAccess(access: AdminUserPropertyAccessRow) {
    if (!users.selectedUser) return;

    setConfirmation({
      title: 'Confirmar retiro de acceso',
      description: `Estas seguro que quieres quitar ${access.propertyName} de ${getUserName(users.selectedUser)}?`,
      confirmLabel: 'Quitar',
      variant: 'danger',
      onConfirm: () => users.removeAccess(access.property_id),
    });
  }

  async function confirmPendingAction() {
    const pendingConfirmation = confirmation;
    if (!pendingConfirmation) return;

    await pendingConfirmation.onConfirm();
    setConfirmation(null);
  }

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneratedPasswordScope(null);

    const wasCreated = await users.createUser({
      email,
      username,
      firstName,
      lastName,
      role,
      isActive,
      password,
      generatePassword,
    });

    if (!wasCreated) return;

    resetCreateForm();

    if (generatePassword) {
      setGeneratedPasswordScope('create');
      return;
    }

    setIsCreateUserOpen(false);
  }

  async function submitManualPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!users.selectedUser) return;

    setGeneratedPasswordScope(null);
    const wasUpdated = await users.updatePassword(users.selectedUser.id, {
      password: newPassword,
    });

    if (!wasUpdated) return;

    setNewPassword('');
    setIsPasswordModalOpen(false);
  }

  async function generateSelectedUserPassword() {
    if (!users.selectedUser) return;

    setGeneratedPasswordScope(null);
    const wasUpdated = await users.updatePassword(users.selectedUser.id, {
      generatePassword: true,
    });

    if (wasUpdated) setGeneratedPasswordScope('password');
  }

  function copyGeneratedPassword() {
    if (!users.generatedPassword) return;

    void navigator.clipboard.writeText(users.generatedPassword);
  }

  return (
    <main className="grid gap-4 px-8 pb-6 pt-4 max-[640px]:px-[14px]">
      <ConfirmationDialog
        open={confirmation !== null}
        title={confirmation?.title ?? ''}
        description={confirmation?.description ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirmar'}
        variant={confirmation?.variant}
        isLoading={users.isSaving}
        onConfirm={() => void confirmPendingAction()}
        onCancel={() => setConfirmation(null)}
      />

      <AdminModal
        open={isCreateUserOpen}
        title="Nuevo usuario"
        eyebrow="Alta controlada"
        description="Crea el acceso, define su rol inicial y decide si el sistema debe generar una contraseña segura."
        onClose={() => setIsCreateUserOpen(false)}>
        <form
          onSubmit={event => void submitCreateUser(event)}
          className="grid gap-5">
          {generatedPasswordScope === 'create' && users.generatedPassword && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-300 bg-lime-50 px-4 py-3 text-sm font-bold text-emerald-950">
              <div className="min-w-0">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-emerald-800">
                  Contraseña generada para el usuario creado
                </p>
                <p className="break-all text-lg font-black">
                  {users.generatedPassword}
                </p>
              </div>
              <button
                type="button"
                onClick={copyGeneratedPassword}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-xs font-black text-white transition hover:bg-emerald-800">
                <Copy size={15} />
                Copiar
              </button>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Correo
              <input
                type="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                placeholder="usuario@empresa.com"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Usuario
              <input
                type="text"
                value={username}
                onChange={event => setUsername(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                placeholder="Opcional"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Nombre
              <input
                type="text"
                value={firstName}
                onChange={event => setFirstName(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                placeholder="Nombre"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Apellido
              <input
                type="text"
                value={lastName}
                onChange={event => setLastName(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                placeholder="Apellido"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Rol
              <select
                value={role}
                onChange={event => setRole(event.target.value as AdminRole)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100">
                {ADMIN_ROLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Estado
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={event => setIsActive(event.target.value === 'active')}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>

          <section className="grid gap-3 rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-sm">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-950 max-[520px]:items-start">
              <span>
                Generar contraseña segura
                <span className="block text-xs font-semibold text-emerald-800/70">
                  Recomendado para evitar credenciales debiles.
                </span>
              </span>
              <input
                type="checkbox"
                checked={generatePassword}
                onChange={event => setGeneratePassword(event.target.checked)}
                className="mt-1 h-5 w-5 accent-emerald-900"
              />
            </label>

            {!generatePassword && (
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
                Contraseña manual
                <input
                  type="text"
                  value={password}
                  required
                  minLength={8}
                  onChange={event => setPassword(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Min. 8 caracteres"
                />
              </label>
            )}
          </section>

          <div className="flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              disabled={users.isSaving}
              onClick={() => setIsCreateUserOpen(false)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={users.isSaving}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-950 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(6,78,59,0.28)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
              <UserPlus size={17} />
              {users.isSaving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={isPasswordModalOpen}
        title="Cambiar contraseña"
        eyebrow="Accion sensible"
        description={
          users.selectedUser
            ? `Actualiza el acceso de ${getUserName(users.selectedUser)}. La contraseña generada solo se muestra una vez.`
            : undefined
        }
        maxWidthClassName="max-w-[560px]"
        onClose={() => setIsPasswordModalOpen(false)}>
        <div className="grid gap-4">
          {generatedPasswordScope === 'password' && users.generatedPassword && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
              <div className="min-w-0">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-amber-700">
                  Nueva contraseña generada
                </p>
                <p className="break-all text-lg font-black">
                  {users.generatedPassword}
                </p>
              </div>
              <button
                type="button"
                onClick={copyGeneratedPassword}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-950 px-4 text-xs font-black text-white transition hover:bg-amber-800">
                <Copy size={15} />
                Copiar
              </button>
            </section>
          )}

          <button
            type="button"
            disabled={users.isSaving || !users.selectedUser}
            onClick={() => void generateSelectedUserPassword()}
            className="grid gap-1 rounded-3xl border border-emerald-900/10 bg-emerald-950 px-5 py-4 text-left text-white shadow-[0_18px_42px_rgba(6,78,59,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
            <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-lime-200">
              <ShieldCheck size={17} />
              Generar segura
            </span>
            <span className="text-sm font-semibold text-emerald-50/80">
              Reemplaza la clave actual por una aleatoria de 16 caracteres.
            </span>
          </button>

          <form
            onSubmit={event => void submitManualPassword(event)}
            className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              Contraseña manual
              <input
                type="text"
                value={newPassword}
                minLength={8}
                required
                disabled={users.isSaving}
                onChange={event => setNewPassword(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                placeholder="Nueva contraseña manual"
              />
            </label>
            <button
              type="submit"
              disabled={users.isSaving || !users.selectedUser}
              className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
              {users.isSaving ? 'Cambiando...' : 'Cambiar contraseña manual'}
            </button>
          </form>
        </div>
      </AdminModal>

      <Alert>{users.errorMessage}</Alert>

      <section className="grid min-h-0 grid-cols-[minmax(360px,520px)_minmax(420px,1fr)] gap-4 max-[1080px]:grid-cols-1">
        <AdminTableShell summary="Usuarios registrados" accent>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b border-slate-100 p-3 max-[620px]:grid-cols-1">
            <SearchInput
              placeholder="Buscar usuario, correo o rol"
              value={users.search}
              onChange={users.setSearch}
            />
            <button
              type="button"
              onClick={() => {
                setGeneratedPasswordScope(null);
                setIsCreateUserOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-950 px-4 text-sm font-black text-white shadow-[0_12px_26px_rgba(6,78,59,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-800">
              <UserPlus size={17} />
              Nuevo usuario
            </button>
          </div>
          <div className="max-h-[calc(100vh-178px)] min-h-[420px] overflow-auto divide-y divide-slate-100 max-[1080px]:max-h-none">
            {users.isLoading && (
              <div className="grid min-h-[240px] place-items-center text-sm font-semibold text-slate-500">
                Cargando usuarios...
              </div>
            )}

            {!users.isLoading && users.users.length === 0 && (
              <div className="grid min-h-[180px] place-items-center text-sm font-semibold text-slate-500">
                No se encontraron usuarios.
              </div>
            )}

            {!users.isLoading &&
              users.users.map(user => {
                const isSelected = user.id === users.selectedUserId;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => users.setSelectedUserId(user.id)}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/80 max-[620px]:grid-cols-1 ${
                      isSelected ? 'bg-emerald-50' : 'bg-transparent'
                    }`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-black ${
                          isSelected
                            ? 'bg-emerald-950 text-lime-200'
                            : 'bg-slate-900 text-white'
                        }`}>
                        {getUserInitials(user) || <UserCog size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {getUserName(user)}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5 max-[620px]:justify-start">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                        {user.role}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          user.is_active
                            ? 'bg-lime-100 text-lime-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </AdminTableShell>

        <aside className="sticky top-3 grid h-[calc(100vh-36px)] min-h-0 content-start overflow-hidden max-[1080px]:static max-[1080px]:h-auto max-[1080px]:overflow-visible">
          <AdminTableShell
            summary="Detalle y accesos"
            accent
            className="flex h-full min-h-0 flex-col max-[1080px]:h-auto">
            <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto_auto_minmax(0,1fr)] gap-3 p-3 max-[1080px]:flex-none max-[1080px]:grid-rows-none">
              {users.selectedUser ? (
                <>
                  <div className="relative overflow-hidden rounded-[24px] bg-slate-950 p-4 text-white">
                    <div className="absolute right-[-26px] top-[-44px] h-24 w-24 rounded-full border border-lime-200/20" />
                    <div className="relative flex min-w-0 items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-200 text-sm font-black text-emerald-950">
                        {getUserInitials(users.selectedUser) || (
                          <UserCog size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black tracking-[-0.04em]">
                          {getUserName(users.selectedUser)}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-300">
                          {users.selectedUser.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <label className="grid gap-1 text-[0.68rem] font-black uppercase tracking-wider text-slate-500">
                      Rol
                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-600"
                        value={users.selectedUser.role}
                        disabled={users.isSaving}
                        onChange={event =>
                          requestRoleChange(event.target.value as AdminRole)
                        }>
                        {ADMIN_ROLE_OPTIONS.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-950 text-amber-100">
                        <KeyRound size={17} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-950">
                          Contraseña
                        </p>
                        <p className="text-xs font-semibold text-amber-800">
                          Accion aislada para evitar cambios accidentales.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={users.isSaving}
                      onClick={() => {
                        setGeneratedPasswordScope(null);
                        setIsPasswordModalOpen(true);
                      }}
                      className="h-10 rounded-xl bg-amber-950 px-4 text-sm font-black text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
                      Cambiar
                    </button>
                  </section>
                </>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                  Selecciona un usuario para editar su rol y accesos.
                </p>
              )}

              <div className="grid gap-2 rounded-2xl bg-emerald-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-900">
                    Agregar inmueble
                  </p>
                  <span className="text-xs font-bold text-slate-500">
                    {users.accesses.length} asignados
                  </span>
                </div>
                <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">
                  <SearchableSelectField
                    value={users.selectedPropertyId}
                    options={propertyOptions}
                    placeholder="Buscar inmueble..."
                    ariaLabel="Buscar inmueble para asignar"
                    disabled={!users.selectedUser || users.isSaving}
                    onChange={users.setSelectedPropertyId}
                  />
                </label>

                <button
                  type="button"
                  disabled={
                    !users.selectedUser ||
                    !users.selectedPropertyId ||
                    users.isSaving
                  }
                  onClick={requestAssignProperty}
                  className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                  Asignar inmueble
                </button>
              </div>

              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Inmuebles asignados
                </p>
                <div className="grid min-h-0 content-start gap-2 overflow-auto pr-1 max-[1080px]:max-h-none">
                  {users.isLoadingAccesses && (
                    <p className="text-sm font-semibold text-slate-500">
                      Cargando accesos...
                    </p>
                  )}

                  {!users.isLoadingAccesses && users.accesses.length === 0 && (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                      Este usuario no tiene inmuebles asignados.
                    </p>
                  )}

                  {!users.isLoadingAccesses &&
                    users.accesses.map(access => (
                      <div
                        key={access.id}
                        className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
                        <Building2
                          size={17}
                          className="shrink-0 text-emerald-800"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {access.propertyName}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {access.propertyCode ?? 'Sin codigo'}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={users.isSaving}
                          onClick={() => requestRemoveAccess(access)}
                          className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50">
                          Quitar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </AdminTableShell>
        </aside>
      </section>
    </main>
  );
}
