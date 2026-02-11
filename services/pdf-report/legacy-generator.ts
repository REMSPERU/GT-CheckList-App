import {
  MaintenanceSessionReport,
  EquipmentMaintenanceData,
  SessionReportData,
  ReportMaintenanceData,
} from './types';
import {
  generateHeaderPageHTML,
  generateEquipmentPhotoPageHTML,
} from './technical-generator';

// ============= LEGACY EXPORTS FOR BACKWARD COMPATIBILITY =============

/**
 * @deprecated Use generateHeaderPageHTML instead
 */
export function generateCoverPageHTML(data: SessionReportData): string {
  // Convert legacy format to new format
  const newData: MaintenanceSessionReport = {
    clientName: data.propertyName,
    address: data.propertyAddress || '',
    locationName: data.propertyName,
    serviceDescription: 'MANTENIMIENTO PREVENTIVO DE TABLEROS ELÉCTRICOS',
    serviceDate: data.sessionDate,
    generatedAt: data.generatedAt,
    equipments: [],
  };
  return generateHeaderPageHTML(newData);
}

/**
 * @deprecated Use generateEquipmentPhotoPageHTML instead
 */
export function generateMaintenanceHTML(
  data: ReportMaintenanceData,
  _index: number,
): string {
  console.log(
    'generateMaintenanceHTML input data:',
    JSON.stringify(
      {
        id: data.maintenanceId,
        itemObservations: data.itemObservations,
        observations: data.observations,
      },
      null,
      2,
    ),
  );

  // Convert legacy format to new format
  const equipment: EquipmentMaintenanceData = {
    code: data.maintenanceId,
    label: data.equipmentCode,
    type: data.maintenanceType,
    location: data.equipmentLocation,
    voltage: data.measurements
      ? Object.values(data.measurements)[0]?.voltage
      : undefined,
    amperage: data.measurements
      ? Object.values(data.measurements)[0]?.amperage
      : undefined,
    cableSize: data.measurements
      ? Object.values(data.measurements)[0]?.cableDiameter
      : undefined,
    prePhotos: data.prePhotos
      .filter(p => p.category !== 'thermo')
      .map(p => ({ url: p.url })),
    thermoPhotos: data.prePhotos
      .filter(p => p.category === 'thermo')
      .map(p => ({ url: p.url })),
    postPhotos: data.postPhotos.map(p => ({ url: p.url })),
    observations: data.observations,
    itemObservations: data.itemObservations,
  };
  return generateEquipmentPhotoPageHTML(equipment);
}

/**
 * @deprecated No longer used in new template
 */
export function generateSummaryHTML(_data: SessionReportData): string {
  return '';
}

/**
 * @deprecated No longer used in new template
 */
export function generateSignaturesHTML(): string {
  return '';
}
