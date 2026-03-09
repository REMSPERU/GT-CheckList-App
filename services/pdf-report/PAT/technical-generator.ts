// PAT (Pozo a Tierra) Technical Report Generator
// Based on SPAT report template (a.html)

import { MaintenanceSessionReport } from '../common/types';
import { formatDate } from '../common/utils';

const DEFAULT_PAT_PROCEDURE_STEPS = [
  'Inspección visual e identificación de los pozos.',
  'Delimitar el área de trabajo con conos y separadores.',
  'Destapar las tapas de los pozos a tierra. Usar barreta si en caso sea necesario.',
  'Desconectar los conectores terminales tipo AB de cada pozo.',
  'Medición de la resistencia con telurómetro.',
  'Usar la lija para limpiar la sulfatación de la varilla y conductor de cobre desnudo.',
  'Revisión de los conectores tipo Split - bolt y tipo gar.',
  'Cambio de los conectores tipo AB y limpieza de otros tipos de conectores.',
  'Cambio de conectores tipo Split-bolt y tipo gar si se encuentran en mal estado.',
  'Inspección de la naturaleza del terreno: condiciones, humedad relativa de la tierra.',
  'Retirar la tierra de chacra en caso se encuentre tapando gran cantidad del conductor.',
  'Segunda medición de la resistencia con telurómetro.',
  'Registro de la resistencia con telurómetro y estado de las instalaciones.',
  'Aplicación de grasa conductiva a la varilla y conductores de cobre.',
  'Limpieza de las tapas de los pozos a tierra para visualizar de mejor manera su denominación.',
  'Conformidad del cliente con el servicio.',
];

// ─── Styles ──────────────────────────────────────────────────────────

function getPATStyles(): string {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #000;
      font-size: 12px;
      line-height: 1.6;
    }
    .page {
      page-break-after: always;
      padding: 25mm;
      box-sizing: border-box;
      position: relative;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header {
      text-align: right;
      font-size: 10px;
      color: #444;
      margin-bottom: 20px;
      line-height: 1.4;
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
    }
    .header .bold {
      font-weight: bold;
      color: #000;
      font-size: 11px;
    }
    h1 {
      text-align: center;
      font-size: 18px;
      margin-top: 30px;
      font-weight: bold;
    }
    h2 {
      font-size: 14px;
      font-weight: bold;
      margin-top: 20px;
      text-transform: uppercase;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .info-table td {
      border: 2px solid #000;
      padding: 5px 10px;
      text-transform: uppercase;
    }
    .info-table td:first-child {
      width: 25%;
      background-color: #f9f9f9;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 15px;
      font-size: 11px;
      text-align: center;
    }
    .data-table th,
    .data-table td {
      border: 1px solid #000;
      padding: 4px 8px;
    }
    .data-table th {
      background-color: #fc5126;
      color: #000;
      font-weight: bold;
    }
    .photo-container {
      text-align: center;
      margin: 15px 0;
    }
    .photo-container img {
      max-width: 100%;
      max-height: 350px;
      object-fit: contain;
    }
    .photo-small img {
      max-height: 220px;
    }
    .photo-placeholder {
      background-color: #eaeaea;
      border: 1px solid #ccc;
      color: #555;
      height: 350px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 15px 0;
      font-size: 14px;
      font-style: italic;
    }
    .photo-placeholder.small {
      height: 220px;
      margin: 5px 0;
    }
    p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 10px;
      text-align: justify;
    }
    ul {
      list-style-type: none;
      padding-left: 0;
      margin-top: 10px;
    }
    ul li {
      margin-bottom: 8px;
      font-size: 12px;
      position: relative;
      padding-left: 15px;
      line-height: 1.4;
    }
    ul.dash-list li::before {
      content: '-';
      position: absolute;
      left: 0;
    }
    ul.arrow-list li::before {
      content: '➤';
      position: absolute;
      left: 0;
    }
    .measurement {
      font-weight: bold;
      font-size: 13px;
      margin-top: 15px;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 80px;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
    }
    .signature-box {
      width: 45%;
      border-top: 1px solid #000;
      padding-top: 10px;
    }
    .cover-header {
      text-align: center;
      border: none;
      margin-top: 20px;
    }
    .header .division {
      color: #fc7c6e;
    }
  `;
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface PATChecklistItem {
  value: boolean;
  observation?: string;
  photo?: string | null;
}

interface PATEquipmentData {
  maintenanceType?: 'conventional' | 'conductive-cement' | null;
  preMeasurement?: string;
  preMeasurementPhoto?: string | null;
  greaseApplicationPhoto?: string | null;
  thorGelPhoto?: string | null;
  postMeasurement?: string;
  postMeasurementPhoto?: string | null;
  generalObservation?: string;
  lidStatus?: 'good' | 'bad' | null;
  lidStatusObservation?: string;
  lidStatusPhoto?: string | null;
  hasSignage?: PATChecklistItem;
  connectorsOk?: PATChecklistItem;
  hasAccess?: PATChecklistItem;
}

function getPatData(eq: any): PATEquipmentData {
  const pat = (eq?.patData || {}) as PATEquipmentData;

  return {
    maintenanceType: pat.maintenanceType || null,
    preMeasurement: pat.preMeasurement || eq.voltage || '',
    preMeasurementPhoto: pat.preMeasurementPhoto || null,
    greaseApplicationPhoto: pat.greaseApplicationPhoto || null,
    thorGelPhoto: pat.thorGelPhoto || null,
    postMeasurement: pat.postMeasurement || eq.amperage || '',
    postMeasurementPhoto: pat.postMeasurementPhoto || null,
    generalObservation: pat.generalObservation || eq.observations || '',
    lidStatus: pat.lidStatus || null,
    lidStatusObservation: pat.lidStatusObservation || '',
    lidStatusPhoto: pat.lidStatusPhoto || null,
    hasSignage: pat.hasSignage,
    connectorsOk: pat.connectorsOk,
    hasAccess: pat.hasAccess,
  };
}

function renderPhoto(
  url: string | undefined | null,
  caption: string,
  small = false,
): string {
  if (url) {
    return `
      <div class="photo-container ${small ? 'photo-small' : ''}">
        <img src="${url}" alt="${caption}" />
        <p style="text-align: center; font-size: 10px; color: #666;">${caption}</p>
      </div>
    `;
  }
  return '';
}

function generateCompanyHeader(): string {
  return `
    <div class="header">
      <span class="bold">PROPIEDAD ELITE S.R.L.</span><br/>
      <span class="bold division">DIVISIÓN ELÉCTRICA</span><br/>
      RUC: 20538436209 | Teléfono: (511) 979351357 | Correo: Gianmarco.Isique@rems.pe
    </div>
  `;
}

// ─── Page Generators ─────────────────────────────────────────────────

function generateCoverPage(data: MaintenanceSessionReport): string {
  return `
    <div class="page">
      <div class="header cover-header">
        <span class="bold">PROPIEDAD ELITE S.R.L.</span><br/>
        <span class="bold division">DIVISIÓN ELÉCTRICA</span><br/>
        RUC: 20538436209<br/>
        Teléfono: (511) 979351357<br/>
        Correo: Gianmarco.Isique@rems.pe
      </div>

      <table class="info-table">
        <tr>
          <td colspan="2" style="text-align: center; font-size: 16px; background-color: #fc5126;">
            INFORME TÉCNICO
          </td>
        </tr>
        <tr>
          <td>FECHA:</td>
          <td>${formatDate(data.serviceDate)}</td>
        </tr>
        <tr>
          <td>CLIENTE:</td>
          <td>${data.clientName}</td>
        </tr>
        <tr>
          <td>REFERENCIA:</td>
          <td>${data.locationName}</td>
        </tr>
        <tr>
          <td>DIRECCIÓN:</td>
          <td>${data.address}</td>
        </tr>
        <tr>
          <td>MOTIVO:</td>
          <td>${data.serviceDescription || 'MANTENIMIENTO PREVENTIVO DE SISTEMA DE PUESTA A TIERRA'}</td>
        </tr>
        <tr>
          <td>RESPONSABLE:</td>
          <td>Gianmarco Isique Neciosup</td>
        </tr>
      </table>
    </div>
  `;
}

function generateProcedurePage(data: MaintenanceSessionReport): string {
  const steps =
    data.procedureSteps && data.procedureSteps.length > 0
      ? data.procedureSteps
      : DEFAULT_PAT_PROCEDURE_STEPS;

  const instrument = data.measurementInstrument;

  return `
    <div class="page">
      ${generateCompanyHeader()}

      <h2>1.- PROCEDIMIENTO:</h2>
      <p>
        En el ${data.locationName} se realizó mantenimiento preventivo
        de su sistema de puesta a tierra realizando el siguiente procedimiento:
      </p>

      <ul class="dash-list">
        ${steps.map(step => `<li>${step}</li>`).join('')}
      </ul>

      <h2>2.- NORMATIVA:</h2>
      <p>
        Siguiendo con El Código Nacional de Electricidad Utilización Regla
        060-712: "El valor de la resistencia de la puesta a tierra debe ser tal
        que, cualquier masa no pueda dar lugar a tensión de contacto superiores
        a las permitidas y no debe ser mayor a 25 &Omega;".
      </p>

      <h2>3.- INSTRUMENTO DE MEDICIÓN:</h2>
      <p>
        Para la medición de la resistencia de los pozos a tierra y mallas a
        tierra se utilizó el siguiente equipo de medición:
      </p>
      <ul class="arrow-list">
        <li>${instrument ? `${instrument.name}${instrument.brand ? ` - ${instrument.brand}` : ''}` : 'Telurómetro - HIOKI'}</li>
      </ul>
      <p style="margin-left: 20px;">
        Modelo: ${instrument?.model || 'N/A'}<br/>
        Serie: ${instrument?.serial || 'N/A'}
      </p>
    </div>
  `;
}

function generateWellListingPage(data: MaintenanceSessionReport): string {
  const equipments = data.equipments;
  const totalWells = equipments.length;

  return `
    <div class="page">
      ${generateCompanyHeader()}

      <h2>4.- RELACIÓN DE POZOS A TIERRA:</h2>
      <p>
        En el ${data.locationName} cuenta con ${totalWells} pozo${totalWells !== 1 ? 's' : ''} a tierra
        distribuidos de la siguiente manera:
      </p>

      <table class="data-table">
        <tr>
          <th colspan="6">RELACIÓN POZOS A TIERRA</th>
        </tr>
        <tr>
          <th>TIPO</th>
          <th>DENOMINACIÓN</th>
          <th>N°</th>
          <th>NIVEL</th>
          <th>UBICACIÓN</th>
          <th>CANT.</th>
        </tr>
        ${equipments
          .map(
            (eq, i) => `
          <tr>
            <td>${eq.type || 'POZO A TIERRA'}</td>
            <td>${eq.label || ''}</td>
            <td>${i + 1}</td>
            <td>${eq.location || ''}</td>
            <td>${eq.observations || ''}</td>
            <td>1</td>
          </tr>
        `,
          )
          .join('')}
        <tr>
          <td colspan="5" style="text-align: right; font-weight: bold;">
            TOTAL POZOS A TIERRA
          </td>
          <td style="font-weight: bold;">${totalWells}</td>
        </tr>
      </table>
    </div>
  `;
}

function generatePreMeasurementPages(data: MaintenanceSessionReport): string {
  const equipments = data.equipments;
  let pages = '';
  // Group ~3 measurements per page
  const perPage = 3;

  for (let i = 0; i < equipments.length; i += perPage) {
    const batch = equipments.slice(i, i + perPage);
    const isFirst = i === 0;

    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        ${isFirst ? `<h2>5.- MEDICIONES DE LA RESISTENCIA DE LOS POZOS A TIERRA ANTES DEL MANTENIMIENTO</h2>` : ''}

        ${batch
          .map((eq, j) => {
            const idx = i + j + 1;
            const pat = getPatData(eq as any);
            const measurePhoto =
              pat.preMeasurementPhoto ||
              eq.thermoPhotos.find(photo => photo.caption === 'preMeasurement')
                ?.url ||
              eq.thermoPhotos[0]?.url ||
              null;
            const typeLabel = eq.type || 'POZO A TIERRA';
            const isGrid = typeLabel.toUpperCase().includes('MALLA');
            const prefix = isGrid ? `MALLA 1, ` : '';
            const measurementValue = pat.preMeasurement || eq.voltage || 'N/A';

            return `
            ${renderPhoto(measurePhoto, `MEDICIÓN POZO ${eq.label || ''} ${idx}`, true)}
            <p class="measurement">
              ${prefix}POZO A TIERRA N°${idx}: ${measurementValue} &Omega;<br/>
              (${eq.label || ''})
            </p>
          `;
          })
          .join('')}
      </div>
    `;
  }

  return pages;
}

function generateTreatmentPages(data: MaintenanceSessionReport): string {
  const thorGelPhotos: string[] = [];
  const greasePhotos: string[] = [];

  data.equipments.forEach(eq => {
    const pat = getPatData(eq as any);

    const explicitThor = pat.thorGelPhoto;
    const explicitGrease = pat.greaseApplicationPhoto;

    if (explicitThor) thorGelPhotos.push(explicitThor);
    if (explicitGrease) greasePhotos.push(explicitGrease);

    if (!explicitThor || !explicitGrease) {
      eq.postPhotos.forEach(p => {
        const caption = (p.caption || '').toLowerCase();
        if (!explicitThor && caption.includes('thor'))
          thorGelPhotos.push(p.url);
        if (!explicitGrease && caption.includes('grease'))
          greasePhotos.push(p.url);
      });
    }
  });

  // Only generate if there are treatment photos
  if (thorGelPhotos.length === 0 && greasePhotos.length === 0) {
    return '';
  }

  let pages = '';

  if (thorGelPhotos.length > 0) {
    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        <h2>6.- REGISTRO FOTOGRÁFICO DE APLICACIÓN DE THORGEL Y GRASA CONDUCTIVA</h2>
        <p>Aplicación dosis química thorgel</p>
        ${thorGelPhotos
          .slice(0, 4)
          .map(url => renderPhoto(url, 'APLICACIÓN THORGEL', true))
          .join('')}
      </div>
    `;
  }

  if (greasePhotos.length > 0) {
    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        <p>Aplicación de grasa conductiva al conductor y varilla</p>
        ${greasePhotos
          .slice(0, 4)
          .map(url => renderPhoto(url, 'GRASA CONDUCTIVA', true))
          .join('')}
      </div>
    `;
  }

  return pages;
}

function generatePostMeasurementPages(data: MaintenanceSessionReport): string {
  const equipments = data.equipments;
  let pages = '';
  const perPage = 3;

  for (let i = 0; i < equipments.length; i += perPage) {
    const batch = equipments.slice(i, i + perPage);
    const isFirst = i === 0;

    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        ${isFirst ? `<h2>7.- MEDICIONES DE LA RESISTENCIA DE LOS POZOS A TIERRA DESPUÉS DEL MANTENIMIENTO</h2>` : ''}

        ${batch
          .map((eq, j) => {
            const idx = i + j + 1;
            const pat = getPatData(eq as any);
            const measurePhoto =
              pat.postMeasurementPhoto ||
              eq.thermoPhotos.find(photo => photo.caption === 'postMeasurement')
                ?.url ||
              (eq.thermoPhotos.length > 1
                ? eq.thermoPhotos[eq.thermoPhotos.length - 1].url
                : null);
            const typeLabel = eq.type || 'POZO A TIERRA';
            const isGrid = typeLabel.toUpperCase().includes('MALLA');
            const prefix = isGrid ? `MALLA 1, ` : '';
            const measurementValue =
              pat.postMeasurement || eq.amperage || 'N/A';

            return `
            ${renderPhoto(measurePhoto, `MEDICIÓN POST-MANTENIMIENTO ${eq.label || ''} ${idx}`, true)}
            <p class="measurement">
              ${prefix}POZO A TIERRA N°${idx}: ${measurementValue} &Omega;<br/>
              (${eq.label || ''})
            </p>
          `;
          })
          .join('')}
      </div>
    `;
  }

  return pages;
}

function generateInspectionChecklistPages(
  data: MaintenanceSessionReport,
): string {
  const equipments = data.equipments;
  if (equipments.length === 0) return '';

  return `
    <div class="page">
      ${generateCompanyHeader()}

      <h2>8.- INSPECCIÓN DETALLADA DE LOS POZOS</h2>
      ${equipments
        .map((eq, index) => {
          const pat = getPatData(eq as any);
          const lidStatusLabel =
            pat.lidStatus === 'bad'
              ? 'MALO'
              : pat.lidStatus === 'good'
                ? 'BUENO'
                : 'NO REGISTRADO';
          const maintenanceTypeLabel =
            pat.maintenanceType === 'conventional'
              ? 'CONVENCIONAL'
              : pat.maintenanceType === 'conductive-cement'
                ? 'CEMENTO CONDUCTIVO'
                : 'NO REGISTRADO';

          const checklistRows = [
            {
              label: 'SEÑALÉTICA NUMÉRICA',
              item: pat.hasSignage,
            },
            {
              label: 'CONECTORES EN BUEN ESTADO',
              item: pat.connectorsOk,
            },
            {
              label: 'ACCESO DISPONIBLE',
              item: pat.hasAccess,
            },
          ];

          return `
            <h2 style="margin-top: ${index === 0 ? '5px' : '20px'};">POZO ${index + 1}: ${eq.label || 'SIN DENOMINACIÓN'}</h2>
            <table class="data-table">
              <tr>
                <th>ÍTEM</th>
                <th>ESTADO / DETALLE</th>
              </tr>
              <tr>
                <td>TIPO DE MANTENIMIENTO</td>
                <td>${maintenanceTypeLabel}</td>
              </tr>
              <tr>
                <td>ESTADO DE TAPA</td>
                <td>${lidStatusLabel}</td>
              </tr>
              <tr>
                <td>OBSERVACIÓN DE TAPA</td>
                <td>${pat.lidStatusObservation || 'Sin observaciones'}</td>
              </tr>
              ${checklistRows
                .map(
                  row => `
                <tr>
                  <td>${row.label}</td>
                  <td>
                    ${row.item?.value ? 'CONFORME' : 'OBSERVADO'}
                    ${row.item?.observation ? `<br/>${row.item.observation}` : ''}
                  </td>
                </tr>
              `,
                )
                .join('')}
              <tr>
                <td>OBSERVACIÓN GENERAL</td>
                <td>${pat.generalObservation || 'Sin observaciones generales'}</td>
              </tr>
            </table>

            ${renderPhoto(pat.lidStatusPhoto, `ESTADO DE TAPA - ${eq.label || ''}`, true)}
            ${renderPhoto(
              pat.hasSignage?.photo,
              `SEÑALÉTICA NUMÉRICA - ${eq.label || ''}`,
              true,
            )}
            ${renderPhoto(
              pat.connectorsOk?.photo,
              `CONECTORES - ${eq.label || ''}`,
              true,
            )}
            ${renderPhoto(
              pat.hasAccess?.photo,
              `ACCESO - ${eq.label || ''}`,
              true,
            )}
          `;
        })
        .join('')}
    </div>
  `;
}

function generateResistanceTablePage(): string {
  return `
    <div class="page">
      ${generateCompanyHeader()}

      <h2>9.- VALORES MÁXIMOS DE RESISTENCIA DE PUESTA A TIERRA</h2>
      <p style="text-align: center; font-style: italic;">
        Tabla 3.1. Valores máximos de resistencia de puesta a tierra
      </p>

      <table class="data-table">
        <tr>
          <th>Para ser usado en:</th>
          <th>Valor máximo de resistencia de puesta a tierra (ohms)</th>
        </tr>
        <tr><td>Estructuras de líneas de transmisión</td><td>10-25</td></tr>
        <tr><td>Subestaciones de alta tensión</td><td>1</td></tr>
        <tr><td>Subestaciones de media tensión en poste</td><td>10</td></tr>
        <tr><td>Subestaciones de media tensión tipo interior</td><td>10</td></tr>
        <tr><td>Protección contra rayos</td><td>5</td></tr>
        <tr><td>Neutro de acometida en baja tensión</td><td>25</td></tr>
        <tr><td>Descargas electrostáticas</td><td>25</td></tr>
        <tr><td>Equipos electrónicos sensibles</td><td>5</td></tr>
        <tr><td>Telecomunicaciones</td><td>5</td></tr>
      </table>
    </div>
  `;
}

function generateRecommendationsAndConclusionsPage(
  data: MaintenanceSessionReport,
): string {
  const defaultRecommendations = `
    <ul class="arrow-list">
      <li>Se recomienda aplicar un balde de agua una vez al mes, con la
        finalidad de que la resistencia del terreno se mantenga.</li>
      <li>Se recomienda intervenir los pozos a tierra personal técnico
        calificado.</li>
      <li>Se recomienda en caso de una emergencia eléctrica contactarse con el
        técnico encargado.</li>
    </ul>
  `;

  const defaultConclusions = `
    <ul class="arrow-list">
      <li>Se concluyó que los valores de los sistemas de puesta a tierra se
        encuentran en el rango permitido según El Manual de Interpretación del
        Código Nacional de Electricidad Suministro 2001 Tabla 3.1.</li>
      <li>Se concluyó que los valores de los sistemas de puesta a tierra se
        encuentran en el rango permitido según El Código Nacional de
        Electricidad Utilización Regla 060-712.</li>
    </ul>
  `;

  return `
    <div class="page">
      ${generateCompanyHeader()}

      <h2>10.- RECOMENDACIONES</h2>
      ${
        data.recommendations
          ? `<p>${data.recommendations}</p>`
          : defaultRecommendations
      }

      <h2>11.- CONCLUSIONES:</h2>
      ${data.conclusions ? `<p>${data.conclusions}</p>` : defaultConclusions}

      <div class="signature-section">
        <div class="signature-box">
          GABRIEL ENRIQUE FLORES MEZA<br/>
          INGENIERO ELECTRICISTA<br/>
          CIP 75628
        </div>
        <div class="signature-box">
          Gianmarco Isique Neciosup<br/>
          Jefe de Servicios Eléctricos
        </div>
      </div>
    </div>
  `;
}

// ─── Main Generator ──────────────────────────────────────────────────

/**
 * Generate the full HTML for a PAT (Pozo a Tierra) technical report.
 * Self-contained HTML document with inline styles based on the SPAT template.
 */
export function generatePATReportHTML(data: MaintenanceSessionReport): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Técnico SPAT - ${data.locationName}</title>
  <style>
    ${getPATStyles()}
  </style>
</head>
<body>
  ${generateCoverPage(data)}
  ${generateProcedurePage(data)}
  ${generateWellListingPage(data)}
  ${generatePreMeasurementPages(data)}
  ${generateTreatmentPages(data)}
  ${generatePostMeasurementPages(data)}
  ${generateInspectionChecklistPages(data)}
  ${generateResistanceTablePage()}
  ${generateRecommendationsAndConclusionsPage(data)}
</body>
</html>
  `;
}
