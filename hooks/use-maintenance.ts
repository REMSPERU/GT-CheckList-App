import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '../services/db';
import { syncService } from '@/services/sync';
import {
  MaintenanceCreateRequest,
  MaintenanceStatusEnum,
  RoleEnum,
  User,
} from '@/types/api';

interface CreateMaintenanceResult {
  maintenanceData: any[];
  sessionData: any;
  propertyId: string | null;
  assignedTechnicians: string[];
}

const log = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const TECHNICIANS_TIMEOUT_MS = 5000;

function keepTechnicians(users: User[]): User[] {
  const filtered = users.filter(user => user.role === RoleEnum.TECNICO);
  return filtered.length > 0 ? filtered : users;
}

// Fetch technicians (Users with role TECNICO)
export const useTechnicians = () => {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async (): Promise<User[]> => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Request timeout')),
            TECHNICIANS_TIMEOUT_MS,
          );
        });

        const { data, error } = (await Promise.race([
          supabase.from('users').select('*'),
          timeoutPromise,
        ])) as { data: User[] | null; error: Error | null };

        if (error) throw error;

        return keepTechnicians((data as User[]) ?? []);
      } catch (error) {
        log('useTechnicians remote failed, using local cache:', error);
        const localUsers = (await DatabaseService.getLocalUsers()) as User[];
        return keepTechnicians(localUsers ?? []);
      }
    },
    retry: 0,
  });
};

// Create Maintenance — now uses sesion_mantenimiento properly
export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      vars: MaintenanceCreateRequest,
    ): Promise<CreateMaintenanceResult> => {
      const { panel_ids, assigned_technicians, ...commonData } = vars;

      if (!panel_ids || panel_ids.length === 0) {
        throw new Error('No panels selected');
      }

      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user found');
      }

      // 2. Fetch property & equipment info from first panel (for code + session name)
      const { data: firstPanel, error: panelError } = await supabase
        .from('equipos')
        .select(
          `
          id,
          properties (
            id,
            name
          ),
          equipamentos (
            abreviatura
          )
        `,
        )
        .eq('id', panel_ids[0])
        .single();

      if (panelError || !firstPanel) {
        throw new Error('Failed to fetch panel information');
      }

      // 3. Generate maintenance code
      const propertyName = (firstPanel.properties as any)?.name || 'PROPERTY';
      const propertyWords = propertyName.toUpperCase().split(/\s+/).slice(0, 3);
      const propertyAbbrev = propertyWords.join('_');
      const equipType =
        (firstPanel.equipamentos as any)?.abreviatura?.toUpperCase() || 'EQ';
      const dateObj = new Date(commonData.dia_programado);
      const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
      const codePrefix = `${propertyAbbrev}-${equipType}-${dateStr}`;

      const { data: existingCodes } = await supabase
        .from('mantenimientos')
        .select('codigo')
        .like('codigo', `${codePrefix}%`)
        .order('codigo', { ascending: false })
        .limit(1);

      let seqNum = 1;
      if (existingCodes && existingCodes.length > 0) {
        const lastCode = existingCodes[0].codigo;
        if (lastCode) {
          const match = lastCode.match(/-(\d{3})$/);
          if (match) {
            seqNum = parseInt(match[1], 10) + 1;
          }
        }
      }
      const codigo = `${codePrefix}-${String(seqNum).padStart(3, '0')}`;
      log('Generated maintenance code:', codigo);

      // 4. Build session name: "{Propiedad} - {Tipo} - {Fecha}"
      const fechaDisplay = dateObj.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const sessionName = `${propertyName} - ${commonData.tipo_mantenimiento} - ${fechaDisplay}`;
      const propertyId = (firstPanel.properties as any)?.id || null;

      // 5. Create the sesion_mantenimiento record
      log('Creating sesion_mantenimiento:', sessionName);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sesion_mantenimiento')
        .insert({
          nombre: sessionName,
          descripcion: commonData.observations || null,
          fecha_programada: commonData.dia_programado,
          created_by: user.id,
          id_property: propertyId,
          estatus: 'NO_INICIADO',
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        console.error('Error creating session:', sessionError);
        throw new Error('Failed to create maintenance session');
      }
      const sessionId = sessionData.id;
      log('Session created:', sessionId);

      // 6. Create maintenance records linked to the session
      const maintenanceInserts = panel_ids.map(panelId => ({
        id_equipo: panelId,
        dia_programado: commonData.dia_programado,
        tipo_mantenimiento: commonData.tipo_mantenimiento,
        estatus: MaintenanceStatusEnum.NO_INICIADO,
        id_user: user.id,
        observations: commonData.observations,
        codigo,
        id_sesion: sessionId,
      }));

      log('Saving Maintenances:', maintenanceInserts.length, 'records');
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('mantenimientos')
        .insert(maintenanceInserts)
        .select();

      if (maintenanceError) throw maintenanceError;
      if (!maintenanceData)
        throw new Error('Failed to create maintenance records');

      // 7. Assign technicians to user_sesion_mantenimiento (session-level)
      if (assigned_technicians && assigned_technicians.length > 0) {
        const userSessionInserts = assigned_technicians.map(techId => ({
          id_user: techId,
          id_sesion: sessionId,
        }));

        log('Assigning technicians to session:', userSessionInserts);
        const { error: assignError } = await supabase
          .from('user_sesion_mantenimiento')
          .insert(userSessionInserts);

        if (assignError) throw assignError;
      }

      return {
        maintenanceData,
        sessionData,
        propertyId,
        assignedTechnicians: assigned_technicians || [],
      };
    },
    onSuccess: async result => {
      try {
        await DatabaseService.upsertCreatedMaintenanceLocally(
          {
            id: result.sessionData.id,
            nombre: result.sessionData.nombre,
            descripcion: result.sessionData.descripcion,
            fecha_programada: result.sessionData.fecha_programada,
            estatus: result.sessionData.estatus,
            id_property: result.sessionData.id_property,
            created_by: result.sessionData.created_by,
            created_at: result.sessionData.created_at,
          },
          result.maintenanceData.map(item => ({
            id: item.id,
            dia_programado: item.dia_programado,
            tipo_mantenimiento: item.tipo_mantenimiento,
            observations: item.observations,
            id_equipo: item.id_equipo,
            estatus: item.estatus || MaintenanceStatusEnum.NO_INICIADO,
            codigo: item.codigo,
            id_sesion: item.id_sesion,
          })),
          result.assignedTechnicians,
        );
      } catch (error) {
        console.error(
          'Error updating local maintenance mirror after create:',
          error,
        );
      }

      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenances'] });

      if (result.propertyId) {
        queryClient.invalidateQueries({
          queryKey: ['maintenance-sessions', result.propertyId],
        });
        queryClient.invalidateQueries({
          queryKey: ['maintenance-by-property', result.propertyId],
        });
      }

      void syncService.triggerSync('post-maintenance-create');
    },
    retry: 0,
  });
};

// Fetch Scheduled Maintenances (Offline First)
// Sync is handled by SyncService polling — no need to trigger pullData per hook.
export const useScheduledMaintenances = () => {
  return useQuery({
    queryKey: ['scheduled-maintenances'],
    queryFn: async () => {
      log(
        'DEBUG: useScheduledMaintenances hook calling getLocalScheduledMaintenances',
      );
      const data = await DatabaseService.getLocalScheduledMaintenances();
      log(
        'DEBUG: useScheduledMaintenances hook received:',
        data?.length,
        'items',
      );
      return data;
    },
    staleTime: 1000, // Always fresh from local DB perspective
  });
};

// Fetch Maintenances by Property ID (Offline First)
export const useMaintenanceByProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ['maintenance-by-property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      log(
        'DEBUG: useMaintenanceByProperty calling getLocalMaintenancesByProperty for',
        propertyId,
      );
      const data =
        await DatabaseService.getLocalMaintenancesByProperty(propertyId);
      log('DEBUG: useMaintenanceByProperty received:', data?.length, 'items');
      return data;
    },
    enabled: !!propertyId,
  });
};

// Fetch real maintenance sessions for a property (Offline First)
export const useMaintenanceSessions = (propertyId: string) => {
  return useQuery({
    queryKey: ['maintenance-sessions', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      log('[useMaintenanceSessions] query start', {
        queryKey: ['maintenance-sessions', propertyId],
        propertyId,
      });
      const localSessions =
        await DatabaseService.getLocalSessionsByProperty(propertyId);
      log('[useMaintenanceSessions] local query result', {
        count: localSessions.length,
      });
      return localSessions;
    },
    enabled: !!propertyId,
    staleTime: 1000,
  });
};
