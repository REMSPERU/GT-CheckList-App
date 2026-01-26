// PDF Report HTML Generators - Corporate Template

import {
  MaintenanceSessionReport,
  EquipmentMaintenanceData,
  SessionReportData,
  ReportMaintenanceData,
} from './types';

/**
 * Format date to Spanish format (e.g., 16.11.2024)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Generate the header page with client info and procedure
 */
export function generateHeaderPageHTML(data: MaintenanceSessionReport): string {
  const serviceDate = formatDate(data.serviceDate);

  const defaultProcedure = [
    'Inspección visual y despeje del área de trabajo.',
    'Desenergización de tableros eléctricos.',
    'Retiro de mandil y tapas de los tableros eléctricos.',
    'Limpieza de estructura del tablero eléctrico.',
    'Limpieza y pulverizado con solvente dieléctrico de interruptores eléctricos.',
    'Limpieza y pulverizado con solvente dieléctrico de barras eléctricas de cobre.',
    'Ajuste mecánico de terminales en cables, interruptores y barras eléctricas.',
    'Pruebas mecánicas y eléctricas de los interruptores termomagnéticos y diferenciales.',
    'Registro visual de las condiciones del tablero energizado y conformidad del cliente.',
  ];

  const procedure = data.procedureSteps || defaultProcedure;

  return `
    <div class="page">
      <header>
        <h1>INFORME TÉCNICO</h1>
        <div class="date-header">FECHA: ${serviceDate}</div>
      </header>

      <table class="info-table">
        <tr><td><span class="info-label">CLIENTE:</span> ${data.clientName}</td></tr>
        <tr><td><span class="info-label">DIRECCIÓN:</span> ${data.address}</td></tr>
        <tr><td><span class="info-label">UBICACIÓN:</span> ${data.locationName}</td></tr>
        <tr><td><span class="info-label">MOTIVO:</span> ${data.serviceDescription}</td></tr>
        ${data.sessionCode ? `<tr><td><span class="info-label">CÓDIGO:</span> ${data.sessionCode}</td></tr>` : ''}
      </table>

      <h2>1. PROCEDIMIENTO REALIZADO</h2>
      <p class="section-text">En ${data.locationName} se realizó mantenimiento preventivo de tableros eléctricos realizando el siguiente procedimiento:</p>
      <ul>
        ${procedure.map(step => `<li>${step}</li>`).join('')}
      </ul>

      <h2>2. NORMATIVA</h2>
      <div class="normativa">
        <strong>CNE-U 010-010 Inspecciones Iniciales y Periódicas:</strong> "Todas las instalaciones eléctricas deben ser objeto de mantenimiento oportuno y apropiado, por personal calificado y acreditado por la respectiva Autoridad competente, con la finalidad que se garantice el buen estado, el funcionamiento adecuado y seguro de todas las partes de la instalación eléctrica, tales como las protecciones, los aislamientos, los sistemas de puesta a tierra, etc."
      </div>


      <h2>3. INSTRUMENTOS DE MEDICIÓN</h2>
      <ul>
        <li><strong>Equipo:</strong> ${data.measurementInstrument ? data.measurementInstrument.name : '-'}</li>
        <li><strong>Modelo:</strong> ${data.measurementInstrument ? data.measurementInstrument.model : '-'}</li>
        <li><strong>Serie:</strong> ${data.measurementInstrument ? data.measurementInstrument.serial : '-'}</li>
      </ul>
    </div>
  `;
}

/**
 * Generate the equipment summary table page
 */
export function generateEquipmentSummaryPageHTML(
  data: MaintenanceSessionReport,
): string {
  // Group equipment by type
  const typeCounts: Record<string, number> = {};
  data.equipments.forEach(eq => {
    const type = eq.type.toUpperCase();
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  return `
    <div class="page">
      <header>
        <h1>RELACIÓN DE TABLEROS ELÉCTRICOS</h1>
      </header>

      <table class="summary-table">
        <thead>
          <tr>
            <th>TIPO DE TABLERO</th>
            <th class="text-center">CANTIDAD</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(typeCounts)
            .map(
              ([type, count]) => `
            <tr>
              <td>${type.startsWith('TABLEROS') ? type : `TABLERO ${type}`}</td>
              <td class="text-center">${count}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>

      <table class="equipment-table">
        <thead>
          <tr>
            <th>TIPO</th>
            <th>RÓTULO</th>
            <th>UBICACIÓN</th>
            <th>VOLTAJE</th>
            <th>CODIFICACIÓN</th>
          </tr>
        </thead>
        <tbody>
          ${data.equipments
            .map(
              eq => `
            <tr>
              <td>${eq.type.toUpperCase()}</td>
              <td>${eq.label}</td>
              <td>${eq.location}</td>
              <td>${eq.voltage || '-'}</td>
              <td>${eq.code}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate photos section HTML
 */
function generatePhotosHTML(
  prePhotos: { url: string; caption?: string }[],
  thermoPhotos: { url: string; caption?: string }[],
  postPhotos: { url: string; caption?: string }[],
  itemObservations?: Record<string, { note: string; photoUrl?: string }>,
  options: { isCompact?: boolean; isThirds?: boolean } = {},
): string {
  const { isCompact, isThirds } = options;
  console.log(
    'generatePhotosHTML received itemObservations:',
    JSON.stringify(itemObservations, null, 2),
  );
  const sections: string[] = [];

  // Pre (Antes) photos
  prePhotos.forEach((photo, idx) => {
    sections.push(`
      <div class="photo-container ${isCompact ? 'small-image' : ''}">
        <span class="photo-header bg-orange">ANTES ${prePhotos.length > 1 ? `#${idx + 1}` : ''}</span>
        <img src="${photo.url}" alt="Estado inicial" />
        <p class="photo-caption">${photo.caption || 'Estado inicial del tablero'}</p>
      </div>
    `);
  });

  // Thermo/Measurement photos
  thermoPhotos.forEach((photo, idx) => {
    sections.push(`
      <div class="photo-container ${isCompact ? 'small-image' : ''}">
        <span class="photo-header bg-orange">MEDICIÓN / TERMOGRAFÍA ${thermoPhotos.length > 1 ? `#${idx + 1}` : ''}</span>
        <img src="${photo.url}" alt="Medición" />
        <p class="photo-caption">${photo.caption || 'Lectura de instrumentos'}</p>
      </div>
    `);
  });

  // Post (Después) photos - full width
  postPhotos.forEach((photo, idx) => {
    // In compact mode, don't force full-width for post photos to save space
    const containerClass = isCompact
      ? 'photo-container small-image'
      : 'photo-container full-width';

    sections.push(`
      <div class="${containerClass}">
        <span class="photo-header bg-orange">DESPUÉS ${postPhotos.length > 1 ? `#${idx + 1}` : ''}</span>
        <img src="${photo.url}" alt="Estado final" />
        <p class="photo-caption">${photo.caption || 'Tablero limpio y cerrado'}</p>
      </div>
    `);
  });

  // Observations (Photo + Note)
  if (itemObservations) {
    Object.entries(itemObservations).forEach(([key, obs], idx) => {
      // Create a readable label from the key if possible, or just use generic "OBSERVACIÓN"
      // Attempt to clean up key: "comp_RELAY_1" -> "RELAY 1", "itg_ITG-1_CN-1" -> "ITG-1 CN-1"
      let label = key
        .replace(/^(comp_|itg_|cond_)/, '')
        .replace(/_/g, ' ')
        .toUpperCase();

      sections.push(`
        <div class="photo-container ${isCompact ? 'small-image' : ''}">
          <span class="photo-header bg-orange">OBSERVACIÓN: ${label}</span>
          ${obs.photoUrl ? `<img src="${obs.photoUrl}" alt="Observación" />` : ''}
          <p class="photo-caption">${obs.note}</p>
        </div>
      `);
    });
  }

  const gridClasses = [
    'photo-grid',
    isCompact ? 'grid-compact' : '',
    isThirds ? 'thirds' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `<div class="${gridClasses}">${sections.join('')}</div>`;
}

/**
 * Generate a single equipment photo report page
 */
export function generateEquipmentPhotoPageHTML(
  equipment: EquipmentMaintenanceData,
): string {
  const obsCount = equipment.itemObservations
    ? Object.keys(equipment.itemObservations).length
    : 0;
  const totalItems =
    equipment.prePhotos.length +
    equipment.thermoPhotos.length +
    equipment.postPhotos.length +
    obsCount;

  // Layout logic:
  // > 4 items: Use compact mode (smaller photos, tighter grid)
  // > 6 items: Use thirds layout (3 items per row) for even more space efficiency
  const isCompact = totalItems > 4;
  const isThirds = totalItems > 6;

  const pageClasses = isCompact ? 'page compact' : 'page';

  return `
    <div class="${pageClasses}">
      <header>
        <h1>REPORTE FOTOGRÁFICO</h1>
        <h3>TABLERO: ${equipment.label} (${equipment.type.toUpperCase()})</h3>
      </header>

      <table class="data-grid">
        <tr>
          <th>UBICACIÓN</th>
          <td>${equipment.location}</td>
          <th>VOLTAJE</th>
          <td>${equipment.voltage ? `${equipment.voltage} V` : '-'}</td>
        </tr>
        <tr>
          <th>CIRCUITOS</th>
          <td>${equipment.circuits || '-'}</td>
          <th>AMPERAJE</th>
          <td>${equipment.amperage ? `${equipment.amperage} A` : '-'}</td>
        </tr>
        <tr>
          <th>CABLE</th>
          <td>${equipment.cableSize ? `${equipment.cableSize} mm` : '-'}</td>
          <th>OBSERVACIONES</th>
          <td>${equipment.observations || 'Ninguna'}</td>
        </tr>
      </table>

      ${generatePhotosHTML(
        equipment.prePhotos,
        equipment.thermoPhotos,
        equipment.postPhotos,
        equipment.itemObservations,
        { isCompact, isThirds },
      )}
    </div>
  `;
}

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
