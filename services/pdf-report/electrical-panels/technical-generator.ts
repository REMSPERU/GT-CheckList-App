import {
  MaintenanceSessionReport,
  EquipmentMaintenanceData,
} from '../common/types';
import { formatDate } from '../common/utils';

function generateCompanyHeader(): string {
  return `
    <div class="report-company-header">
      <div>
        <div class="company-name">PROPIEDAD ELITE S.R.L.</div>
        <div class="company-division">DIVISION ELECTRICA</div>
      </div>
      <div class="company-contact">
        <div><strong>RUC:</strong> 20538436209</div>
        <div><strong>Telefono:</strong> (511) 979351357</div>
        <div><strong>Correo:</strong> Gianmarco.isique@rems.pe</div>
      </div>
    </div>
  `;
}

export function getElectricalPanelTechnicalStyles(): string {
  return `
    @page {
      size: A4;
      margin: 10mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      color: #111;
      font-size: 11px;
      line-height: 1.35;
      background: #fff;
    }

    .page {
      page-break-after: always;
      padding: 2mm 0;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .report-company-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 2px solid #fc5126;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }

    .company-name {
      font-size: 14px;
      font-weight: 700;
      color: #000;
      letter-spacing: 0.2px;
    }

    .company-division {
      margin-top: 2px;
      font-size: 11px;
      font-weight: 700;
      color: #fc5126;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .company-contact {
      text-align: right;
      font-size: 9.5px;
      color: #444;
      line-height: 1.35;
    }

    header {
      text-align: center;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 20px;
      text-transform: uppercase;
      color: #111;
      letter-spacing: 0.8px;
    }

    h2 {
      font-size: 12px;
      margin: 10px 0 5px;
      text-transform: uppercase;
      color: #111;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }

    h3 {
      margin-top: 4px;
      font-size: 12px;
      color: #111;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .date-header {
      margin-top: 3px;
      text-align: right;
      font-size: 10px;
      color: #555;
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 10.5px;
    }

    th,
    td {
      border: 1px solid #111;
      padding: 4px 6px;
      vertical-align: top;
    }

    th {
      background-color: #fc5126;
      color: #000;
      text-transform: uppercase;
      font-weight: 700;
      text-align: center;
    }

    .info-table {
      margin-top: 6px;
      margin-bottom: 8px;
    }

    .info-table td {
      text-transform: uppercase;
      font-weight: 700;
    }

    .info-label {
      display: inline-block;
      min-width: 88px;
      color: #000;
    }

    .summary-table {
      width: 65%;
      margin: 0 auto 10px;
    }

    .equipment-table td,
    .summary-table td {
      text-align: center;
    }

    .equipment-table td:first-child,
    .equipment-table td:nth-child(2),
    .equipment-table td:nth-child(3) {
      text-transform: uppercase;
    }

    .data-grid th {
      width: 18%;
      text-align: center;
    }

    .data-grid td {
      width: 32%;
    }

    .section-text,
    p {
      margin-bottom: 6px;
      text-align: justify;
    }

    ul {
      list-style: none;
      margin: 5px 0 6px;
      padding-left: 0;
    }

    li {
      margin-bottom: 3px;
      padding-left: 12px;
      position: relative;
    }

    li::before {
      content: '-';
      position: absolute;
      left: 0;
      color: #111;
      font-weight: 700;
    }

    .normativa {
      border: 1px solid #111;
      background: #fff7ed;
      padding: 8px;
      margin-bottom: 6px;
      font-size: 10.5px;
      text-align: justify;
    }

    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .photo-container {
      flex: 1 1 calc(50% - 4px);
      min-width: 150px;
      border: 1px solid #111;
      padding: 4px;
      background: #fff;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .photo-header {
      display: block;
      background: #fc5126;
      color: #000;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
      padding: 3px 4px;
    }

    img {
      width: 100%;
      max-height: 150px;
      object-fit: contain;
      border: 1px solid #e5e7eb;
      display: block;
      margin: 0 auto;
    }

    .photo-caption {
      font-size: 9px;
      color: #555;
      margin-top: 2px;
      text-align: center;
    }

    .recommendations-box {
      border: 1px solid #111;
      background: #fff;
      padding: 8px;
      min-height: 56px;
      margin-bottom: 8px;
    }

    .recommendations-box p {
      margin: 0;
    }

    .signatures-section {
      margin-top: 20px;
    }

    .sig-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .sig-block {
      width: 48%;
      text-align: center;
    }

    .sig-line {
      border-top: 1px solid #111;
      margin-top: 42px;
      padding-top: 2px;
    }

    .text-center {
      text-align: center;
    }

    .compact .photo-header {
      font-size: 8px;
      padding: 2px 3px;
    }

    .compact img {
      max-height: 120px;
    }

    .thirds .photo-container {
      flex: 1 1 calc(33.33% - 4px);
      min-width: 112px;
    }

    .ultra-compact img {
      max-height: 92px;
    }

    .ultra-compact .photo-caption {
      font-size: 8px;
    }
  `;
}

const DEFAULT_PROCEDURE_STEPS = [
  'Inspección visual inicial y despeje del área de trabajo, verificando condiciones de seguridad, accesibilidad y estado general del tablero.',
  'Registro fotográfico y termográfico previo al inicio de las actividades, mediante cámara termográfica, para identificar posibles puntos calientes, sobrecalentamientos o anomalías eléctricas existentes.',
  'Desenergización segura de los tableros eléctricos, siguiendo los procedimientos de bloqueo y señalización correspondientes, a fin de garantizar la seguridad del personal técnico.',
  'Retiro de mandiles del tablero eléctrico, permitiendo el acceso a los componentes internos.',
  'Limpieza interna de la estructura del tablero eléctrico, eliminando polvo y suciedad que puedan afectar la operación o generar riesgos eléctricos.',
  'Limpieza y aplicación de solvente dieléctrico en interruptores eléctricos, asegurando la remoción de residuos sin afectar las propiedades aislantes de los componentes.',
  'Limpieza y aplicación de solvente dieléctrico en barras eléctricas de cobre, preservando su conductividad y reduciendo el riesgo de fallas por acumulación de contaminantes.',
  'Ajuste mecánico de terminales y conexiones, incluyendo cables, interruptores y barras eléctricas, para prevenir falsos contactos y sobrecalentamientos.',
  'Pruebas mecánicas de interruptores termomagnéticos y diferenciales, verificando el correcto accionamiento, firmeza y estado físico de los dispositivos de protección.',
  'Pruebas eléctricas de interruptores termomagnéticos y diferenciales, con el fin de validar su correcto funcionamiento y capacidad de respuesta ante condiciones anómalas.',
  'Registro visual del estado del tablero energizado, una vez culminadas las actividades de mantenimiento y restablecido el suministro eléctrico.',
  'Registro fotográfico y termográfico final, mediante cámara termográfica, para comparar el estado inicial y final del tablero.',
  'Conformidad del cliente, mediante acta o documento de aceptación del servicio realizado.',
];

const DEFAULT_NORMATIVE_TEXT =
  'CNE-U 010-010 Inspecciones Iniciales y Periódicas de las Instalaciones Eléctricas (3): "Todas las instalaciones eléctricas deben ser objeto de mantenimiento oportuno y apropiado, por personal calificado y acreditado por la respectiva Autoridad competente, con la finalidad que se garantice el buen estado, el funcionamiento adecuado y seguro de todas las partes de la instalación eléctrica, tales como las protecciones, los aislamientos, los sistemas de puesta a tierra, etc."';

/**
 * Generate the header page with client info and procedure
 */
export function generateHeaderPageHTML(data: MaintenanceSessionReport): string {
  const serviceDate = formatDate(data.serviceDate, 'short');
  const procedure = data.procedureSteps || DEFAULT_PROCEDURE_STEPS;

  return `
    <div class="page">
      ${generateCompanyHeader()}
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
        <strong>${DEFAULT_NORMATIVE_TEXT}</strong>
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
      ${generateCompanyHeader()}
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
  options: {
    isCompact?: boolean;
    isThirds?: boolean;
    isUltraCompact?: boolean;
  } = {},
): string {
  const { isCompact, isThirds, isUltraCompact } = options;
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

  // Post (Después) photos
  postPhotos.forEach((photo, idx) => {
    const containerClass = isCompact
      ? 'photo-container small-image'
      : 'photo-container';

    sections.push(`
      <div class="${containerClass}">
        <span class="photo-header bg-orange">DESPUÉS ${postPhotos.length > 1 ? `#${idx + 1}` : ''}</span>
        <img src="${photo.url}" alt="Estado final" />
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
    isUltraCompact ? 'ultra-grid' : '',
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
  // > 3 items: compact mode
  // > 5 items: thirds layout
  // > 8 items: ultra-compact mode
  const isCompact = totalItems > 3;
  const isThirds = totalItems > 5;
  const isUltraCompact = totalItems > 8;

  const pageClasses = [
    'page',
    'equipment-page',
    isCompact ? 'compact' : '',
    isUltraCompact ? 'ultra-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="${pageClasses}">
      ${generateCompanyHeader()}
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
          <td>${obsCount > 0 ? `${obsCount} observaciones` : 'Ninguna'}</td>
        </tr>
      </table>

      ${generatePhotosHTML(
        equipment.prePhotos,
        equipment.thermoPhotos,
        equipment.postPhotos,
        equipment.itemObservations,
        { isCompact, isThirds, isUltraCompact },
      )}
    </div>
  `;
}

/**
 * Generate the recommendations and conclusions page
 */
export function generateRecommendationsPageHTML(
  data: MaintenanceSessionReport,
): string {
  // Only generate if there are recommendations or conclusions
  if (!data.recommendations && !data.conclusions) {
    return '';
  }

  return `
    <div class="page">
      ${generateCompanyHeader()}
      <header>
        <h1>CONCLUSIONES Y RECOMENDACIONES</h1>
      </header>

      ${
        data.conclusions
          ? `
        <h2>CONCLUSIONES</h2>
        <div class="recommendations-box">
          <p>${data.conclusions.replace(/\n/g, '<br/>')}</p>
        </div>
      `
          : ''
      }

      ${
        data.recommendations
          ? `
        <h2>RECOMENDACIONES</h2>
        <div class="recommendations-box">
          <p>${data.recommendations.replace(/\n/g, '<br/>')}</p>
        </div>
      `
          : ''
      }

      <div class="signatures-section">
        <div class="sig-grid">
          <div class="sig-block">
            <p><strong>TÉCNICO RESPONSABLE</strong></p>
            <div class="sig-line"></div>
          </div>
          <div class="sig-block">
            <p><strong>CLIENTE</strong></p>
            <div class="sig-line"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
