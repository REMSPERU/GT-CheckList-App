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
      // Assuming we have a 'users' table and we can filter by role,
      // OR we use an RPC/Edge Function.
      // Based on SQL provided, there is a 'users' table.
      // We will try standard select.
      const { data, error } = await supabase
        .from('users') // Check if table is 'users' or 'profiles' in Supabase usually, but SQL said 'users' foreign key.
        .select('*');
      // .eq("role", RoleEnum.TECNICO); // TEMPORARY: Fetch all users for testing

      if (error) throw error;
      return data as User[];
    },
  });
};

// Create Maintenance
export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: MaintenanceCreateRequest) => {
      // If panel_ids is present, we loop.
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

      // 2. Generate maintenance code
      // Format: {PROPERTY_ABBREV}-{EQUIP_TYPE}-{DATE}-{SEQ}
      // Fetch property and equipment info from first panel
      const { data: firstPanel, error: panelError } = await supabase
        .from('equipos')
        .select(
          `
          id,
          properties (
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

      // Generate property abbreviation
      const propertyName = (firstPanel.properties as any)?.name || 'PROPERTY';
      const propertyWords = propertyName.toUpperCase().split(/\s+/).slice(0, 3);
      const propertyAbbrev = propertyWords.join('_');

      // Get equipment type abbreviation
      const equipType =
        (firstPanel.equipamentos as any)?.abreviatura?.toUpperCase() || 'EQ';

      // Format date as YYYYMMDD
      const dateObj = new Date(commonData.dia_programado);
      const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;

      // Query existing codes for sequential numbering
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

      // 3. Create maintenance records
      const maintenanceInserts = panel_ids.map(panelId => ({
        id_equipo: panelId,
        dia_programado: commonData.dia_programado,
        tipo_mantenimiento: commonData.tipo_mantenimiento,
        estatus: MaintenanceStatusEnum.NO_INICIADO,
        id_user: user.id,
        observations: commonData.observations,
        codigo,
      }));

      console.log('Saving Maintenance:', maintenanceInserts);

      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('mantenimientos')
        .insert(maintenanceInserts)
        .select();

      if (maintenanceError) throw maintenanceError;
      if (!maintenanceData)
        throw new Error('Failed to create maintenance records');

      // 2. Assign technicians (user_maintenace table)
      // SQL: user_maintenace (id_user, id_maintenance)
      // For EACH created maintenance, assigning EACH technician.

      const userMaintenanceInserts: {
        id_user: string;
        id_maintenance: string;
      }[] = [];

      if (assigned_technicians && assigned_technicians.length > 0) {
        maintenanceData.forEach(m => {
          assigned_technicians.forEach(techId => {
            userMaintenanceInserts.push({
              id_maintenance: m.id,
              id_user: techId,
            });
          });
        });
      }

      console.log('Saving User Maintenance:', userMaintenanceInserts);

      if (userMaintenanceInserts.length > 0) {
        const { error: assignError } = await supabase
          .from('user_maintenace')
          .insert(userMaintenanceInserts);

        if (assignError) throw assignError;
      }

      return maintenanceData;
    },
    onSuccess: () => {
      // Invalidate queries if needed, e.g. list of maintenances
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
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
