import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  MaintenanceCreateRequest,
  MaintenanceStatusEnum,
  RoleEnum,
  User,
} from "@/types/api";

// Fetch technicians (Users with role TECNICO)
export const useTechnicians = () => {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async (): Promise<User[]> => {
      // Assuming we have a 'users' table and we can filter by role,
      // OR we use an RPC/Edge Function.
      // Based on SQL provided, there is a 'users' table.
      // We will try standard select.
      const { data, error } = await supabase
        .from("users") // Check if table is 'users' or 'profiles' in Supabase usually, but SQL said 'users' foreign key.
        .select("*")
        .eq("role", RoleEnum.TECNICO);

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
        throw new Error("No panels selected");
      }

      // 1. Create maintenance records
      const maintenanceInserts = panel_ids.map((panelId) => ({
        id_equipo: panelId,
        dia_programado: commonData.dia_programado, // Date type in DB
        // hora_programada is not in the SQL provided for `mantenimientos` table?
        // SQL: dia_programado date null. No explicit time column or timestamp?
        // We might need to combine date+time into dia_programado if it was timestamp, but it says DATE.
        // Or store it in metadata/jsonb?
        // Let's check SQL again.
        // `dia_programado date null`
        // `tipo_mantenimiento text null`
        // `estatus text null default 'NO INICIADO'`
        // `id_user uuid` (creator?)

        // Wait, where is the time stored?
        // Maybe we just store the date for now as requested by schema.
        tipo_mantenimiento: commonData.tipo_mantenimiento,
        estatus: MaintenanceStatusEnum.NO_INICIADO,
      }));

      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("mantenimientos")
        .insert(maintenanceInserts)
        .select();

      if (maintenanceError) throw maintenanceError;
      if (!maintenanceData)
        throw new Error("Failed to create maintenance records");

      // 2. Assign technicians (user_maintenace table)
      // SQL: user_maintenace (id_user, id_maintenance)
      // For EACH created maintenance, assigning EACH technician.

      const userMaintenanceInserts: {
        id_user: string;
        id_maintenance: string;
      }[] = [];

      maintenanceData.forEach((m) => {
        assigned_technicians.forEach((techId) => {
          userMaintenanceInserts.push({
            id_maintenance: m.id,
            id_user: techId,
          });
        });
      });

      if (userMaintenanceInserts.length > 0) {
        const { error: assignError } = await supabase
          .from("user_maintenace")
          .insert(userMaintenanceInserts);

        if (assignError) throw assignError;
      }

      return maintenanceData;
    },
    onSuccess: () => {
      // Invalidate queries if needed, e.g. list of maintenances
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
    },
  });
};
