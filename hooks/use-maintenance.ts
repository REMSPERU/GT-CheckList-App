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
        .select("*");
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
        throw new Error("No panels selected");
      }

      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No authenticated user found");
      }

      // 2. Create maintenance records
      const maintenanceInserts = panel_ids.map((panelId) => ({
        id_equipo: panelId,
        dia_programado: commonData.dia_programado, // Date type in DB
        tipo_mantenimiento: commonData.tipo_mantenimiento,
        estatus: MaintenanceStatusEnum.NO_INICIADO,
        id_user: user.id, // Creator
        observations: commonData.observations,
      }));

      console.log("Saving Maintenance:", maintenanceInserts);

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

      if (assigned_technicians && assigned_technicians.length > 0) {
        maintenanceData.forEach((m) => {
          assigned_technicians.forEach((techId) => {
            userMaintenanceInserts.push({
              id_maintenance: m.id,
              id_user: techId,
            });
          });
        });
      }

      console.log("Saving User Maintenance:", userMaintenanceInserts);

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
    retry: 0,
  });
};


// Fetch Scheduled Maintenances
export const useScheduledMaintenances = () => {
  return useQuery({
    queryKey: ["scheduled-maintenances"],
    queryFn: async () => {
      // Fetch maintenance with equipment, property, and technician count
      // Note: We need deep joins: mantenimientos -> equipos -> properties
      const { data, error } = await supabase
        .from("mantenimientos")
        .select(`
          id,
          dia_programado,
          estatus,
          tipo_mantenimiento,
          observations,
          id_equipo,
          equipos (
            id,
            codigo,
            ubicacion,
            properties (
              id,
              name,
              address
            )
          ),
          user_maintenace (
            id_user
          )
        `)
        .order("dia_programado", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

// Fetch Maintenances by Property ID
export const useMaintenanceByProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ["maintenance-by-property", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const { data, error } = await supabase
        .from("mantenimientos")
        .select(`
          id,
          dia_programado,
          estatus,
          tipo_mantenimiento,
          equipos!inner (
            id,
            codigo,
            ubicacion,
            equipment_detail,
            id_property,
            equipamentos (
              nombre
            )
          )
        `)
        .eq("equipos.id_property", propertyId)
        .order("dia_programado", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
};
