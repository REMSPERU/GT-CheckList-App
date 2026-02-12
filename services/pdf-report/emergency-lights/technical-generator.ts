import {
  MaintenanceSessionReport,
  EquipmentMaintenanceData,
} from '../common/types';
import { formatDate } from '../common/utils';

/**
 * Generate the header page with client info and procedure
 */
export function generateHeaderPageHTML(data: MaintenanceSessionReport): string {
  const serviceDate = formatDate(data.serviceDate, 'short');

  return `
    <div class="page">
      <header>
        <h1>INFORME TÉCNICO - LUCES DE EMERGENCIA</h1>
        <div class="date-header">FECHA: ${serviceDate}</div>
      </header>

      <table class="info-table">
        <tr><td><span class="info-label">CLIENTE:</span> ${data.clientName}</td></tr>
        <tr><td><span class="info-label">DIRECCIÓN:</span> ${data.address}</td></tr>
        <tr><td><span class="info-label">UBICACIÓN:</span> ${data.locationName}</td></tr>
        <tr><td><span class="info-label">MOTIVO:</span> ${data.serviceDescription}</td></tr>
        ${data.sessionCode ? `<tr><td><span class="info-label">CÓDIGO:</span> ${data.sessionCode}</td></tr>` : ''}
      </table>

      <h2>1. PROCEDIMIENTO DE LA INSPECCIÓN</h2>
      <p class="section-text">
        En el EDIFICIO ${data.clientName.toUpperCase()} se realizó la inspección técnica de las luces de emergencia, la cual se toma en cuenta los siguientes puntos:
      </p>
      <ul>
        <li>Inspección visual para verificar el estado actual de las luces de emergencia, ya que pueden estar dañada parte de la estructura del equipo.</li>
        <li>Test de operatividad: Desenergización del circuito de luces de emergencia o desconexión manual si se encuentran conectadas a tomacorrientes.</li>
        <li>Registro del momento de inicio de la desconexión para el control de la duración de la autonomía de la luminaria no menor a noventa minutos (90’) para ser certificable.</li>
        <li>Uso del luxómetro para verificar la intensidad de luz en las zonas de evacuación.</li>
        <li>Se realizará la anotación de todas las luces de emergencia del edificio para tener el registro de las cantidades, marca, modelo y numeración.</li>
        <li>Se emitirá el protocolo de todas las luces intervenidas.</li>
        <li>Se emitirá solo el certificado a los equipos que cumplan con la autonomía requerida.</li>
      </ul>

      <h2>2. NORMATIVA</h2>
      <div class="normativa">
        <ul>
          <li>Siguiendo con El Reglamento Nacional de Edificaciones Regla A130 Articulo 40: “Todos los medios de evacuación deberán ser provistos de iluminación de emergencia que garanticen un periodo de 1½ hora (90 minutos) en el caso de un corte de fluido eléctrico”</li>
          <li>El Artículo 7.1.2.1. del Código Nacional de Electricidad (CNE) Tomo V - Sistema de Utilización establece los requisitos específicos para la alimentación de sistemas de emergencia en edificaciones.</li>
          <li>CNE – UTILIZACIÓN 240-304 (4) se refiere a una sección específica del Código Nacional de Electricidad (CNE) del Perú, específicamente al capítulo de Utilización, que trata sobre requisitos de instalaciones eléctricas en edificaciones, y dentro de ella, la Sección 240-304 se enfoca en la instalación y ubicación de equipos individuales, como las luces de emergencia</li>
          <li>NTP (APARTADO 22.11.1). «Las conexiones eléctricas deben ser permanentes o tener una provisión para prevenir toda desconexión accidental»</li>
        </ul>
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
 * Generate Summary and Critical Observations
 */
export function generateSummaryAndObservationsHTML(
  data: MaintenanceSessionReport,
): string {
  const totalEquipments = data.equipments.length;

  // Filter for critical observations:
  // "No Cumple" status is usually determined by protocol checks or specific observations.
  // For now, we'll check if there are observations matching "No Cumple" or simply if there ARE observations.
  // The user requirement says "donde salgan las luces de emeregncia con observaciones y sea un cuadro asi".
  // And "Estado: No Cumple".

  // Logic: If equipment has observations OR specific protocol failures, we consider it "Con Observaciones".
  const criticalEquipments = data.equipments.filter(eq => {
    const hasObs = !!eq.observations;
    const hasProtocolFail = eq.protocol
      ? Object.values(eq.protocol).some(v => v === false)
      : false;
    // Also check if any item observation exists
    const hasItemObs =
      eq.itemObservations && Object.keys(eq.itemObservations).length > 0;

    return hasObs || hasProtocolFail || hasItemObs;
  });

  const operativeCount = totalEquipments - criticalEquipments.length;
  const criticalCount = criticalEquipments.length;

  return `
    <div class="page">
      <h2>3. LUCES DE EMERGENCIA</h2>
      <p class="section-text">
        Según la programación anual de mantenimiento el EDIFICIO ${data.clientName.toUpperCase()} cuenta con ${totalEquipments} equipos de luces de emergencia que están instaladas en diferentes partes del edificio, ya se rutas de evacuación, montantes eléctricas u otras áreas del edificio.
      </p>

      <h2>5. OBSERVACIONES CRÍTICAS</h2>
      <p class="section-text">
        Tras las pruebas realizadas, se detectaron ${criticalCount} equipos de luces de emergencia que no cumplen con los estándares de autonomía requeridos por la normativa de seguridad vigente.
        Estos dispositivos no garantizan el tiempo mínimo de funcionamiento ante un corte de energía, lo que representa un riesgo para la evacuación.
      </p>
      <p class="section-text">Se adjunta el detalle técnico de las luces afectadas:</p>

      <h3>RELACIÓN LUCES DE EMERGENCIA</h3>
      <table class="equipment-table">
        <thead>
          <tr>
            <th>NIVEL</th>
            <th>UBICACIÓN</th>
            <th>N°</th>
            <th>MARCA</th>
            <th>MODELO</th>
            <th>ESTADO</th>
            <th>CANT.</th>
          </tr>
        </thead>
        <tbody>
          ${
            criticalEquipments.length > 0
              ? criticalEquipments
                  .map(
                    eq => `
            <tr>
              <td>${extractLevel(eq.location)}</td>
              <td>${eq.location}</td>
              <td>${eq.label}</td>
              <td>${eq.brand || '-'}</td>
              <td>${eq.model || '-'}</td>
              <td style="color: red; font-weight: bold;">No Cumple</td>
              <td>1</td>
            </tr>
          `,
                  )
                  .join('')
              : '<tr><td colspan="7">No se encontraron observaciones críticas.</td></tr>'
          }
        </tbody>
      </table>

      <h3>GRAFICO DE OPERATIVIDAD</h3>
      <div style="display: flex; justify-content: center; margin-top: 20px;">
        ${generatePieChart(operativeCount, criticalCount)}
      </div>
      <div style="text-align: center; margin-top: 10px; font-size: 10px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #4CAF50; margin-right: 5px;"></span>Operativas (${operativeCount})
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #F44336; margin-left: 15px; margin-right: 5px;"></span>Con Observaciones (${criticalCount})
      </div>
    </div>
  `;
}

/**
 * Generate photo grid HTML (Helper)
 */
function generatePhotosHTML(
  prePhotos: { url: string; caption?: string }[],
  postPhotos: { url: string; caption?: string }[],
  options: { isCompact?: boolean; isThirds?: boolean } = {},
): string {
  const { isCompact, isThirds } = options;
  const sections: string[] = [];

  // Pre (Antes) photos
  prePhotos.forEach((photo, idx) => {
    sections.push(`
      <div class="photo-container ${isCompact ? 'small-image' : ''}">
        <span class="photo-header bg-orange">ANTES ${prePhotos.length > 1 ? `#${idx + 1}` : ''}</span>
        <img src="${photo.url}" alt="Estado inicial" />
        <p class="photo-caption">${photo.caption || 'Estado inicial'}</p>
      </div>
    `);
  });

  // Post (Después) photos
  postPhotos.forEach((photo, idx) => {
    sections.push(`
      <div class="photo-container ${isCompact ? 'small-image' : ''}">
        <span class="photo-header bg-orange">DESPUÉS ${postPhotos.length > 1 ? `#${idx + 1}` : ''}</span>
        <img src="${photo.url}" alt="Estado final" />
        <p class="photo-caption">${photo.caption || 'Estado final'}</p>
      </div>
    `);
  });

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
  const totalItems = equipment.prePhotos.length + equipment.postPhotos.length;

  const isCompact = totalItems > 4;
  const isThirds = totalItems > 6;
  const pageClasses = isCompact ? 'page compact' : 'page';

  return `
    <div class="${pageClasses}">
      <header>
        <h1>REPORTE FOTOGRÁFICO</h1>
        <h3>LUZ DE EMERGENCIA: ${equipment.label}</h3>
        <div style="text-align:center; font-size: 10px; color: #666;">${equipment.location}</div>
      </header>

      <table class="data-grid" style="margin-top: 10px;">
        <tr>
          <th>MARCA</th>
          <td>${equipment.brand || '-'}</td>
          <th>MODELO</th>
          <td>${equipment.model || '-'}</td>
        </tr>
        <tr>
          <th>UBICACIÓN</th>
          <td>${equipment.location}</td>
          <th>TIPO</th>
          <td>${equipment.type || 'ADOSADO'}</td>
        </tr>
        <tr>
          <th>ESTADO</th>
          <td colspan="3">${equipment.observations ? 'CON OBSERVACIONES' : 'OPERATIVO'}</td>
        </tr>
        ${
          equipment.observations
            ? `
        <tr>
          <th>OBSERVACIONES</th>
          <td colspan="3">${equipment.observations}</td>
        </tr>`
            : ''
        }
      </table>

      ${generatePhotosHTML(equipment.prePhotos, equipment.postPhotos, {
        isCompact,
        isThirds,
      })}
    </div>
  `;
}

/**
 * Helper to extract "Level" from location string if possible
 * "PISO 1 - HALL" -> "PISO 1"
 */
function extractLevel(location: string): string {
  const parts = location.split('-');
  return parts[0].trim();
}

/**
 * Generate SVG Pie Chart
 */
function generatePieChart(operative: number, critical: number): string {
  const total = operative + critical;
  if (total === 0) return '';

  const operativePct = (operative / total) * 100;
  // const criticalPct = (critical / total) * 100;

  // SVG parameters
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const circumference = 2 * Math.PI * r;

  const operativeDash = (operativePct / 100) * circumference;
  // const criticalDash = circumference - operativeDash;

  // If 100% operative
  if (critical === 0) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#4CAF50" stroke-width="40" />
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20" font-weight="bold">${Math.round(operativePct)}%</text>
      </svg>
    `;
  }

  // If 100% critical
  if (operative === 0) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F44336" stroke-width="40" />
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20" font-weight="bold">0%</text>
      </svg>
    `;
  }

  // Mixed
  // We use stroke-dasharray to create the segments.
  // Start rotation at -90deg (top).
  // Green segment (Operative)
  // Red segment (Critical) - easiest to just draw a red circle and overlay the green one?
  // Or usage of stroke-dasharray and stroke-dashoffset.

  // DashArray: [length of dash, length of gap]
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F44336" stroke-width="30" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#4CAF50" stroke-width="30" 
              stroke-dasharray="${operativeDash} ${circumference}" />
    </svg>
  `;
}
