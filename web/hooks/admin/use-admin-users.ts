import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import type {
  AdminPropertyRow,
  AdminUserCreateInput,
  AdminUserPasswordResult,
  AdminUserPasswordUpdateInput,
  AdminUserPropertyAccessRow,
  AdminUserRow,
} from '@/types/admin';
import type { AdminRole } from '@/types/auth';
import { normalizeSearchText } from '@/utils/search';

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) throw new Error('Sesion no disponible');

  return session.access_token;
}

async function fetchAdminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'No se pudo completar la operacion');
  }

  return payload;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [accesses, setAccesses] = useState<AdminUserPropertyAccessRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAccesses, setIsLoadingAccesses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );

  const selectedUser = useMemo(
    () => users.find(user => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const filteredUsers = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return users;

    return users.filter(user =>
      [
        user.email,
        user.username,
        user.first_name,
        user.last_name,
        user.role,
      ].some(value => normalizeSearchText(value).includes(query)),
    );
  }, [search, users]);

  const availableProperties = useMemo(() => {
    const assignedIds = new Set(accesses.map(item => item.property_id));
    return properties.filter(property => !assignedIds.has(property.id));
  }, [accesses, properties]);

  async function loadUsers() {
    try {
      setErrorMessage(null);
      setIsLoading(true);
      const data = await fetchAdminApi<{
        users: AdminUserRow[];
        properties: AdminPropertyRow[];
      }>('/api/admin/users');

      setUsers(data.users);
      setProperties(data.properties);
      setSelectedUserId(current => current ?? data.users[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar usuarios',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAccesses(userId: string | null) {
    if (!userId) {
      setAccesses([]);
      return;
    }

    try {
      setErrorMessage(null);
      setIsLoadingAccesses(true);
      const data = await fetchAdminApi<{
        accesses: AdminUserPropertyAccessRow[];
      }>(`/api/admin/users/${userId}/properties`);

      setAccesses(data.accesses);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar accesos',
      );
    } finally {
      setIsLoadingAccesses(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    setSelectedPropertyId('');
    void loadAccesses(selectedUserId);
  }, [selectedUserId]);

  async function updateRole(userId: string, role: AdminRole) {
    try {
      setErrorMessage(null);
      setIsSaving(true);
      const data = await fetchAdminApi<{ user: AdminUserRow }>(
        `/api/admin/users/${userId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        },
      );

      setUsers(current =>
        current.map(user => (user.id === userId ? data.user : user)),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar el rol',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function createUser(input: AdminUserCreateInput) {
    try {
      setErrorMessage(null);
      setGeneratedPassword(null);
      setIsSaving(true);
      const data = await fetchAdminApi<{
        user: AdminUserRow;
        generatedPassword: string | null;
      }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      setUsers(current => [...current, data.user]);
      setSelectedUserId(data.user.id);
      setGeneratedPassword(data.generatedPassword);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo crear el usuario',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePassword(
    userId: string,
    input: AdminUserPasswordUpdateInput,
  ) {
    try {
      setErrorMessage(null);
      setGeneratedPassword(null);
      setIsSaving(true);
      const data = await fetchAdminApi<AdminUserPasswordResult>(
        `/api/admin/users/${userId}/password`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      );

      setGeneratedPassword(data.generatedPassword);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar la contraseña',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function assignSelectedProperty() {
    if (!selectedUserId || !selectedPropertyId) return;

    try {
      setErrorMessage(null);
      setIsSaving(true);
      const data = await fetchAdminApi<{
        accesses: AdminUserPropertyAccessRow[];
      }>(`/api/admin/users/${selectedUserId}/properties`, {
        method: 'POST',
        body: JSON.stringify({
          propertyId: selectedPropertyId,
        }),
      });

      setAccesses(data.accesses);
      setSelectedPropertyId('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo asignar inmueble',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAccess(propertyId: string) {
    if (!selectedUserId) return;

    try {
      setErrorMessage(null);
      setIsSaving(true);
      await fetchAdminApi(
        `/api/admin/users/${selectedUserId}/properties/${propertyId}`,
        {
          method: 'DELETE',
        },
      );

      setAccesses(current =>
        current.filter(item => item.property_id !== propertyId),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo quitar el acceso',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return {
    users: filteredUsers,
    properties: availableProperties,
    accesses,
    selectedUser,
    selectedUserId,
    selectedPropertyId,
    search,
    isLoading,
    isLoadingAccesses,
    isSaving,
    errorMessage,
    generatedPassword,
    setSelectedUserId,
    setSelectedPropertyId,
    setSearch,
    updateRole,
    createUser,
    updatePassword,
    assignSelectedProperty,
    removeAccess,
  };
}
