import { useQuery } from "@tanstack/react-query";
import { electricalPanelApi } from "../services/electrical_panel.api";
import type { TableroElectricoResponse } from "../types/api";

export const useElectricalPanelsByPropertyQuery = (
  propertyId: string,
  panelType?: string,
  search?: string,
  config?: boolean | null,
  locations?: string[]
) => {
  return useQuery<TableroElectricoResponse[], Error>({
    queryKey: [
      "electricalPanels",
      "byProperty",
      propertyId,
      panelType,
      search,
      config,
      locations,
    ],
    queryFn: () =>
      electricalPanelApi.getByProperty(
        propertyId,
        panelType,
        search,
        config,
        locations
      ),
    enabled: !!propertyId, // Only run the query if propertyId is provided
  });
};
