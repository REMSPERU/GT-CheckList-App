'use client';

import { ShieldCheck, UserCog } from 'lucide-react';

import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminUsers } from '@/hooks/admin/use-admin-users';
import { ADMIN_ROLE_OPTIONS } from '@/services/admin/users.service';
import type { AdminUserRow } from '@/types/admin';
import type { AdminRole } from '@/types/auth';

function getUserName(user: AdminUserRow) {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return fullName || user.username || user.email;
}

export default function AdminUsersPage() {
  const users = useAdminUsers();

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <section className="grid gap-3 rounded-[24px] border border-emerald-900/10 bg-white/70 p-5 shadow-[0_20px_60px_rgba(12,23,32,0.08)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-900">
              <ShieldCheck size={14} /> Solo superadmin
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
              Usuarios, roles y accesos a inmuebles
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Gestiona los roles operativos y que inmuebles puede ver cada
              usuario desde el panel web.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
            {users.users.length} usuarios visibles
          </div>
        </div>
        <SearchInput
          placeholder="Buscar usuario, correo o rol"
          value={users.search}
          onChange={users.setSearch}
        />
      </section>

      <Alert>{users.errorMessage}</Alert>

      <section className="grid grid-cols-[minmax(0,1fr)_420px] gap-3.5 max-[1080px]:grid-cols-1">
        <AdminTableShell summary="Usuarios registrados" accent>
          <div className="divide-y divide-slate-100">
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
                    className={`grid w-full grid-cols-[minmax(0,1fr)_180px] items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/80 max-[760px]:grid-cols-1 ${
                      isSelected ? 'bg-emerald-50' : 'bg-transparent'
                    }`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white">
                        <UserCog size={18} />
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
                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                      {user.role}
                    </span>
                  </button>
                );
              })}
          </div>
        </AdminTableShell>

        <aside className="grid content-start gap-3.5">
          <AdminTableShell summary="Rol del usuario">
            <div className="grid gap-3 p-4">
              {users.selectedUser ? (
                <>
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {getUserName(users.selectedUser)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {users.selectedUser.email}
                    </p>
                  </div>

                  <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">
                    Rol
                    <select
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
                      value={users.selectedUser.role}
                      disabled={users.isSaving}
                      onChange={event =>
                        users.updateRole(
                          users.selectedUser!.id,
                          event.target.value as AdminRole,
                        )
                      }>
                      {ADMIN_ROLE_OPTIONS.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-500">
                  Selecciona un usuario para editar su rol.
                </p>
              )}
            </div>
          </AdminTableShell>

          <AdminTableShell summary="Accesos a inmuebles" accent>
            <div className="grid gap-3 p-4">
              <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">
                Inmueble
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
                  value={users.selectedPropertyId}
                  disabled={!users.selectedUser || users.isSaving}
                  onChange={event => users.setSelectedPropertyId(event.target.value)}>
                  <option value="">Seleccionar inmueble...</option>
                  {users.properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">
                Motivo opcional
                <input
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  value={users.assignmentReason}
                  disabled={!users.selectedUser || users.isSaving}
                  placeholder="Ej: Acceso operativo mensual"
                  onChange={event => users.setAssignmentReason(event.target.value)}
                />
              </label>

              <button
                type="button"
                disabled={
                  !users.selectedUser || !users.selectedPropertyId || users.isSaving
                }
                onClick={users.assignSelectedProperty}
                className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                Asignar inmueble
              </button>

              <div className="mt-2 grid gap-2">
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
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
                        onClick={() => users.removeAccess(access.property_id)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50">
                        Quitar
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </AdminTableShell>
        </aside>
      </section>
    </main>
  );
}
