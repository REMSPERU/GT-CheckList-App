// Operability Certificate HTML Generator

import { MaintenanceSessionReport, EquipmentMaintenanceData } from './types';

/**
 * Format date to Spanish format (e.g., 15 de enero del 2026)
 */
function formatDateSpanish(dateStr: string): string {
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Try appending time if it's just a date string to avoid timezone issues
    date = new Date(dateStr + 'T12:00:00');
  }

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} del ${year}`;
}

/**
 * Get operability certificate styles based on adf.html
 */
export function getOperabilityStyles(): string {
  return `
    /* Configuración General */
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }

    /* Estructura de Página */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      position: relative;
      box-sizing: border-box;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }

    /* Encabezado (Header) */
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-logo {
      font-weight: bold;
      font-size: 14px;
      color: #2c3e50;
    }
    .header-info {
      text-align: right;
      font-size: 10px;
      line-height: 1.4;
    }

    /* Títulos */
    .cover-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .cover-title {
      font-size: 24px; 
      text-align: center; 
      margin-bottom: 40px;
      font-weight: bold;
    }
    .cover-address {
      text-align: center; 
      font-size: 14px; 
      margin-bottom: 60px;
    }
    .main-title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin-top: 50px;
      margin-bottom: 20px;
      text-decoration: underline;
    }
    .sub-title {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 15px;
      text-transform: uppercase;
    }

    /* Contenido de Texto */
    .content-block {
      margin-bottom: 15px;
      line-height: 1.5;
      text-align: justify;
    }
    .center-text {
      text-align: center;
    }

    /* Tablas */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 20px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #000;
      padding: 4px;
      text-align: center;
      vertical-align: middle;
    }
    thead {
      display: table-header-group;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    tbody {
      display: table-row-group;
    }

    /* Sección de Resumen */
    .summary-section {
      width: 50%; 
      margin-top: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .summary-table td, .summary-table th {
      border: 2px solid #000;
    }
    .total-row td {
      background-color: #ddd;
      font-weight: bold;
    }

    /* Sección de Firmas */
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 40%;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
    .signature-details {
      font-size: 10px;
      line-height: 1.3;
    }

    /* Footer */
    .footer-note {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      margin-top: 10px;
    }
    .cover-footer {
      text-align: right; 
      margin-top: auto; 
      margin-bottom: 50px;
    }
  `;
}

/**
 * Filter equipment without observations (operative equipment)
 */
function filterOperativeEquipment(
  equipments: EquipmentMaintenanceData[],
): EquipmentMaintenanceData[] {
  return equipments.filter(eq => {
    // No general observations
    const hasGeneralObs = eq.observations && eq.observations.trim().length > 0;

    // No item-specific observations
    const hasItemObs =
      eq.itemObservations &&
      Object.values(eq.itemObservations).some(
        obs => obs.note && obs.note.trim().length > 0,
      );

    return !hasGeneralObs && !hasItemObs;
  });
}

/**
 * Generate the equipment table rows
 */
function generateEquipmentRows(equipments: EquipmentMaintenanceData[]): string {
  return equipments
    .map(
      eq => `
    <tr>
      <td>${eq.type || 'DISTRIBUCION'}</td>
      <td>${eq.label || eq.code}</td>
      <td>${eq.location}</td>
      <td>${eq.type?.toUpperCase().includes('AUTOSOPORTADO') ? 'AUTOSOPORTADO' : 'ADOSADO'}</td>
      <td>1</td>
    </tr>
  `,
    )
    .join('');
}

/**
 * Generate the complete operability certificate HTML
 */
export function generateOperabilityCertificateHTML(
  data: MaintenanceSessionReport,
): string {
  const operativeEquipments = filterOperativeEquipment(data.equipments);

  // Count by type
  const autosoportados = operativeEquipments.filter(eq =>
    eq.type?.toUpperCase().includes('AUTOSOPORTADO'),
  ).length;
  // If not autosoportado, assume 'EMP/ADO' (Empotrado/Adosado)
  const adosados = operativeEquipments.length - autosoportados;

  const styles = getOperabilityStyles();
  const dateFormatted = formatDateSpanish(data.serviceDate);

  // Common Header HTML
  const headerHtml = `
      <div class="header">
        <div class="header-logo">
          PROPIEDAD ELITE S.R.L <br />
          DIVISIÓN ELÉCTRICA
        </div>
        <div class="header-info">
          RUC: 20538436209<br />
          Teléfono: (511) 979351357<br />
          Correo: Gianmarco.isique@rems.pe
        </div>
      </div>
  `;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificado de Operatividad</title>
  <style>
    ${styles}
  </style>
</head>
<body>

  <!-- PAGE 1: COVER -->
  <div class="page">
    ${headerHtml}

    <div class="cover-content">
      <div class="cover-title">
        EDIFICIO ${data.clientName.toUpperCase()}
      </div>

      <div class="cover-address">
        ${data.address}
      </div>

      <h2 class="main-title">
        CERTIFICADO DE OPERATIVIDAD<br />TABLEROS ELÉCTRICOS
      </h2>
    </div>

    <div class="cover-footer">
      <p><strong>Preparado por:</strong><br />PROPIEDAD ELITE S.R.L.</p>
      <p>${dateFormatted}</p>
    </div>
  </div>

  <!-- PAGE 2+: CERTIFICATE & TABLE -->
  <div class="page">
    ${headerHtml}

    <h3 class="sub-title">
      CERTIFICADO DE MANTENIMIENTO DE TABLEROS ELÉCTRICOS
    </h3>

    <div class="content-block">
      Mediante el presente documento la empresa PROPIEDAD ELITE S.R.L., en
      cumplimiento con lo establecido en el código nacional de electricidad
      (CNE) y la norma NFPA70B, certifica que se ha realizado el mantenimiento
      preventivo a los tableros eléctricos del edificio ${data.clientName.toUpperCase()},
      ubicado en ${data.address}.
    </div>

    <p class="center-text"><strong>RELACION TABLEROS ELECTRICOS</strong></p>

    <table>
      <thead>
        <tr>
          <th>TIPO</th>
          <th>DENOMINACION</th>
          <th>UBICACIÓN / NIVEL</th>
          <th>MODELO</th>
          <th>CANTIDAD</th>
        </tr>
      </thead>
      <tbody>
        ${generateEquipmentRows(operativeEquipments)}
      </tbody>
    </table>

    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td><strong>AUTOSOPORTADOS</strong></td>
          <td>${autosoportados}</td>
        </tr>
        <tr>
          <td><strong>EMP/ADO</strong></td>
          <td>${adosados}</td>
        </tr>
        <tr class="total-row">
          <td><strong>TOTAL TABLEROS</strong></td>
          <td><strong>${operativeEquipments.length}</strong></td>
        </tr>
      </table>
    </div>

    <div class="content-block">
      <p>
        El certificado de operatividad se mantiene vigente durante 6 meses
        mientras no se realicen cambios Y/O reparaciones en los tableros
        eléctricos.
      </p>
      <p>Se expide el presente certificado para los fines convenientes.</p>
      <p>Atentamente.</p>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-details">
          <strong>CONTROL DE CALIDAD</strong><br /><br /><br />
          ___________________________<br />
          <strong>GABRIEL ENRIQUE FLORES MEZA</strong><br />
          INGENIERO ELECTRICISTA<br />
          Reg CIP N 75828
        </div>
      </div>

      <div class="signature-box">
        <div class="signature-details">
          <strong>SUPERVISADO POR:</strong><br /><br /><br />
          ___________________________<br />
          <strong>GIANMARCO ISIQUE NECIOSUP</strong><br />
          Jefe de Servicios Eléctricos
        </div>
      </div>
    </div>

    <div style="margin-bottom: 20px; font-size: 10px;">
      <p>
        <strong>TRABAJO REALIZADO POR:</strong><br />
        Tec. Sandro Geldres / Tec. Antony Huamalies
      </p>
    </div>

    <div class="footer-note">
      EL PRESENTE CERTIFICADO TIENE VIGENCIA DE 6 MESES
    </div>

  </div>

</body>
</html>
  `;
}
