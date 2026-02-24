import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '../services/db';
import { syncService } from '@/services/sync';
import {
  MaintenanceCreateRequest,
  MaintenanceStatusEnum,
  User,
} from '@/types/api';

// Fetch technicians (Users with role TECNICO)
export const useTechnicians = () => {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data as User[];
    },
  });
};

// Create Maintenance — now uses sesion_mantenimiento properly
export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: MaintenanceCreateRequest) => {
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
      console.log('Generated maintenance code:', codigo);

      // 4. Build session name: "{Propiedad} - {Tipo} - {Fecha}"
      const fechaDisplay = dateObj.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const sessionName = `${propertyName} - ${commonData.tipo_mantenimiento} - ${fechaDisplay}`;
      const propertyId = (firstPanel.properties as any)?.id || null;

      // 5. Create the sesion_mantenimiento record
      console.log('Creating sesion_mantenimiento:', sessionName);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sesion_mantenimiento')
        .insert({
          nombre: sessionName,
          descripcion: commonData.observations || null,
          fecha_programada: commonData.dia_programado,
          created_by: user.id,
          id_property: propertyId,
          estatus: 'NO INICIADO',
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        console.error('Error creating session:', sessionError);
        throw new Error('Failed to create maintenance session');
      }
      const sessionId = sessionData.id;
      console.log('Session created:', sessionId);

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

      console.log('Saving Maintenances:', maintenanceInserts.length, 'records');
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

        console.log('Assigning technicians to session:', userSessionInserts);
        const { error: assignError } = await supabase
          .from('user_sesion_mantenimiento')
          .insert(userSessionInserts);

        if (assignError) throw assignError;
      }

      return maintenanceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenances'] });
    },
    retry: 0,
  });
};

// Fetch Scheduled Maintenances (Offline First)
export const useScheduledMaintenances = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Trigger background sync when hook mounts
    syncService.pullData().then(() => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenances'] });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: ['scheduled-maintenances'],
    queryFn: async () => {
      console.log(
        'DEBUG: useScheduledMaintenances hook calling getLocalScheduledMaintenances',
      );
      const data = await DatabaseService.getLocalScheduledMaintenances();
      console.log(
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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (propertyId) {
      // Trigger background sync when hook mounts
      syncService.pullData().then(() => {
        queryClient.invalidateQueries({
          queryKey: ['maintenance-by-property', propertyId],
        });
      });
    }
  }, [propertyId, queryClient]);

  return useQuery({
    queryKey: ['maintenance-by-property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      console.log(
        'DEBUG: useMaintenanceByProperty calling getLocalMaintenancesByProperty for',
        propertyId,
      );
      const data =
        await DatabaseService.getLocalMaintenancesByProperty(propertyId);
      console.log(
        'DEBUG: useMaintenanceByProperty received:',
        data?.length,
        'items',
      );
      return data;
    },
    enabled: !!propertyId,
  });
};

// Fetch real maintenance sessions for a property (Offline First)
export const useMaintenanceSessions = (propertyId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (propertyId) {
      syncService.pullData().then(() => {
        queryClient.invalidateQueries({
          queryKey: ['maintenance-sessions', propertyId],
        });
      });
    }
  }, [propertyId, queryClient]);

  return useQuery({
    queryKey: ['maintenance-sessions', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return await DatabaseService.getLocalSessionsByProperty(propertyId);
    },
    enabled: !!propertyId,
    staleTime: 1000,
  });
};
