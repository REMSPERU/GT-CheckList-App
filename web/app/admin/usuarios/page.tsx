'use client';

import { Building2, UserCog } from 'lucide-react';

import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelectField } from '@/components/ui/searchable-select-field';
import { useAdminUsers } from '@/hooks/admin/use-admin-users';
import { ADMIN_ROLE_OPTIONS } from '@/services/admin/users.service';
import type { AdminUserRow } from '@/types/admin';
import type { AdminRole } from '@/types/auth';

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
  const propertyOptions = users.properties.map(property => ({
    value: property.id,
    label: property.name,
  }));

  return (
    <main className="grid gap-3 px-8 pb-5 pt-3 max-[640px]:px-[14px]">
      <Alert>{users.errorMessage}</Alert>

      <section className="grid min-h-0 grid-cols-[minmax(360px,520px)_minmax(420px,1fr)] gap-3 max-[1080px]:grid-cols-1">
        <AdminTableShell summary="Usuarios registrados" accent>
          <div className="border-b border-slate-100 p-3">
            <SearchInput
              placeholder="Buscar usuario, correo o rol"
              value={users.search}
              onChange={users.setSearch}
            />
          </div>
          <div className="max-h-[calc(100vh-170px)] min-h-[360px] overflow-auto divide-y divide-slate-100 max-[1080px]:max-h-none">
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
                    className={`grid w-full grid-cols-[minmax(0,1fr)_132px] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-emerald-50/80 max-[620px]:grid-cols-1 ${
                      isSelected ? 'bg-emerald-50' : 'bg-transparent'
                    }`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-black ${
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
                    <span className="w-fit justify-self-end rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900 max-[620px]:justify-self-start">
                      {user.role}
                    </span>
                  </button>
                );
              })}
          </div>
        </AdminTableShell>

        <aside className="sticky top-3 grid max-h-[calc(100vh-130px)] content-start overflow-auto max-[1080px]:static max-[1080px]:max-h-none max-[1080px]:overflow-visible">
          <AdminTableShell summary="Usuario, rol y accesos" accent>
            <div className="grid gap-3 p-3">
              {users.selectedUser ? (
                <>
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-950 p-2.5 text-white">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-200 text-sm font-black text-emerald-950">
                      {getUserInitials(users.selectedUser) || (
                        <UserCog size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {getUserName(users.selectedUser)}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-300">
                        {users.selectedUser.email}
                      </p>
                    </div>
                  </div>

                  <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">
                    Rol
                    <select
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
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

                <label className="grid gap-1 text-[0.68rem] font-black uppercase tracking-wider text-slate-500">
                  <input
                    className="h-10 rounded-xl border border-emerald-900/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    value={users.assignmentReason}
                    disabled={!users.selectedUser || users.isSaving}
                    placeholder="Ej: Acceso operativo mensual"
                    onChange={event =>
                      users.setAssignmentReason(event.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  disabled={
                    !users.selectedUser ||
                    !users.selectedPropertyId ||
                    users.isSaving
                  }
                  onClick={users.assignSelectedProperty}
                  className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                  Asignar inmueble
                </button>
              </div>

              <div className="grid gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Inmuebles asignados
                </p>
                <div className="grid max-h-[clamp(140px,28vh,260px)] min-h-[100px] gap-2 overflow-auto pr-1 max-[1080px]:max-h-none">
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
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
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
                          onClick={() => users.removeAccess(access.property_id)}
                          className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50">
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
