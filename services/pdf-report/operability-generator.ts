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
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} del ${year}`;
}

/**
 * Get operability certificate styles
 */
export function getOperabilityStyles(): string {
  return `
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .company-info h2 {
      margin: 0;
      color: #000;
      font-size: 16px;
    }
    .contact-info {
      text-align: right;
      font-size: 11px;
    }
    .doc-title {
      text-align: center;
      text-transform: uppercase;
      font-weight: bold;
      font-size: 16px;
      margin: 20px 0;
      text-decoration: underline;
    }
    .cert-text {
      text-align: justify;
      margin-bottom: 20px;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #000;
      padding: 5px;
      text-align: center;
    }
    th {
      background-color: #e0e0e0;
      font-weight: bold;
    }
    .text-left {
      text-align: left;
    }
    .summary-table {
      width: 50%;
      margin-left: auto;
    }
    .footer-note {
      margin-top: 20px;
      font-style: italic;
      font-weight: bold;
      text-align: center;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      text-align: center;
    }
    .sig-block {
      width: 45%;
      border-top: 1px solid #000;
      padding-top: 10px;
    }
    @media print {
      body { padding: 0; }
      .container { box-shadow: none; }
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
      <td>${eq.type?.includes('AUTOSOPORTADO') ? 'AUTOSOPORTADO' : 'ADOSADO'}</td>
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
  const adosados = operativeEquipments.length - autosoportados;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado de Operatividad - ${data.clientName}</title>
  <style>
    ${getOperabilityStyles()}
  </style>
</head>
<body>

<div class="container">
  <div class="header">
    <div class="company-info">
      <h2>PROPIEDAD ELITE S.R.L</h2>
      <div>DIVISIÓN ELÉCTRICA</div>
    </div>
    <div class="contact-info">
      <div><strong>RUC:</strong> 20538436209</div>
      <div><strong>Teléfono:</strong> (511) 979351357</div>
      <div><strong>Correo:</strong> Gianmarco.Isique@rems.pe</div>
      <div>San Isidro, ${formatDateSpanish(data.serviceDate)}</div>
    </div>
  </div>

  <div class="doc-title">CERTIFICADO DE OPERATIVIDAD TABLEROS ELÉCTRICOS</div>

  <div class="cert-text">
    <p>Mediante el presente documento la empresa <strong>PROPIEDAD ELITE S.R.L.</strong>, en cumplimiento con lo establecido en el Código Nacional de Electricidad (CNE) y la norma NFPA70B, certifica que se ha realizado el mantenimiento preventivo a los tableros eléctricos del edificio <strong>${data.clientName.toUpperCase()}</strong>, ubicado en ${data.address}.</p>
  </div>

  <h3>RELACIÓN DE TABLEROS ELÉCTRICOS</h3>
  <table>
    <thead>
      <tr>
        <th>TIPO</th>
        <th>DENOMINACIÓN</th>
        <th>UBICACIÓN / NIVEL</th>
        <th>MODELO</th>
        <th>CANT.</th>
      </tr>
    </thead>
    <tbody>
      ${generateEquipmentRows(operativeEquipments)}
    </tbody>
  </table>

  <table class="summary-table">
    <tr>
      <th>AUTOSOPORTADOS</th>
      <td>${autosoportados}</td>
    </tr>
    <tr>
      <th>EMP / ADO</th>
      <td>${adosados}</td>
    </tr>
    <tr>
      <th>TOTAL TABLEROS</th>
      <td>${operativeEquipments.length}</td>
    </tr>
  </table>

  <p>El certificado de operatividad se mantiene vigente durante 6 meses mientras no se realicen cambios Y/O reparaciones en los tableros eléctricos.</p>
  <p class="footer-note">EL PRESENTE CERTIFICADO TIENE VIGENCIA DE 6 MESES</p>

  <div class="signatures">
    <div class="sig-block">
      <strong>CONTROL DE CALIDAD</strong><br><br><br>
      __________________________<br>
      <strong>GABRIEL ENRIQUE FLORES MEZA</strong><br>
      INGENIERO ELECTRICISTA<br>
      CIP N° 75828
    </div>
    <div class="sig-block">
      <strong>SUPERVISADO POR:</strong><br><br><br>
      __________________________<br>
      <strong>GIANMARCO ISIQUE NECIOSUP</strong><br>
      JEFE DE SERVICIOS ELÉCTRICOS
    </div>
  </div>
</div>

</body>
</html>
  `;
}
