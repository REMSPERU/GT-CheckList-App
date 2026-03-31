// PAT (Pozo a Tierra) Technical Report Generator
// Based on SPAT report template (a.html)

import { MaintenanceSessionReport } from '../common/types';
import { formatDate } from '../common/utils';

export interface PATReportSignatures {
  gabriel?: string | null;
  gian?: string | null;
}

export interface PATReportStaticAssets {
  resistanceTableImage?: string | null;
}

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
      font-size: 11px;
      line-height: 1.4;
    }
    .page {
      page-break-after: always;
      padding: 16mm;
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
      margin-bottom: 12px;
      line-height: 1.4;
      border-bottom: 2px solid #ddd;
      padding-bottom: 6px;
    }
    .header .bold {
      font-weight: bold;
      color: #000;
      font-size: 11px;
    }
    h1 {
      text-align: center;
      font-size: 18px;
      margin-top: 16px;
      font-weight: bold;
    }
    h2 {
      font-size: 12.5px;
      font-weight: bold;
      margin-top: 12px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 11px;
      font-weight: bold;
    }
    .info-table td {
      border: 1.5px solid #000;
      padding: 4px 6px;
      text-transform: uppercase;
    }
    .info-table td:first-child {
      width: 25%;
      background-color: #f9f9f9;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 8px;
      font-size: 10.5px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .data-table th,
    .data-table td {
      border: 1px solid #000;
      padding: 3px 5px;
    }
    .data-table th {
      background-color: #fc5126;
      color: #000;
      font-weight: bold;
    }
    .photo-container {
      text-align: center;
      margin: 6px 0;
    }
    .photo-container img {
      max-width: 100%;
      max-height: 210px;
      object-fit: contain;
    }
    .photo-small img {
      width: 100%;
      max-height: 190px;
      height: auto;
      object-fit: contain;
      background-color: #f3f4f6;
    }
    .photo-caption {
      text-align: center;
      font-size: 9px;
      color: #666;
      margin: 3px 0 0;
      line-height: 1.2;
    }
    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }
    .photo-grid .photo-container {
      width: calc(50% - 4px);
      margin: 0;
    }
    .measurement-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      align-items: flex-start;
    }
    .measurement-block {
      width: calc(50% - 4px);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .inspection-block {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 10px;
    }
    .section-subtitle {
      font-size: 11px;
      font-weight: bold;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .photo-placeholder {
      background-color: #eaeaea;
      border: 1px solid #ccc;
      color: #555;
      height: 210px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 6px 0;
      font-size: 14px;
      font-style: italic;
    }
    .photo-placeholder.small {
      height: 150px;
      margin: 5px 0;
    }
    p {
      font-size: 11px;
      line-height: 1.4;
      margin-bottom: 6px;
      text-align: justify;
    }
    ul {
      list-style-type: none;
      padding-left: 0;
      margin-top: 10px;
    }
    ul li {
      margin-bottom: 5px;
      font-size: 11px;
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
      font-size: 11px;
      margin-top: 4px;
      margin-bottom: 2px;
      text-align: left;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
    }
    .signature-box {
      width: 45%;
      padding-top: 6px;
    }
    .signature-image-wrap {
      height: 84px;
      margin-bottom: 10px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .signature-image {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
    }
    .cover-header {
      text-align: center;
      border: none;
      margin-top: 20px;
    }
    .header .division {
      color: #fc7c6e;
    }
    .resistance-table-image {
      width: 100%;
      max-width: 620px;
      max-height: 240px;
      margin: 8px auto 0;
      display: block;
      object-fit: contain;
    }
    .final-page h2 {
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .final-page .signature-section {
      margin-top: 24px;
      font-size: 10px;
    }
    .final-page .signature-image-wrap {
      height: 70px;
      margin-bottom: 6px;
    }
    .final-page .signature-image {
      max-height: 64px;
    }
    .final-page ul {
      margin-top: 6px;
    }
    .final-page ul li {
      margin-bottom: 3px;
      font-size: 10.5px;
      line-height: 1.3;
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
  executionStatus?: 'completed' | 'reprogrammed' | null;
  reprogramComment?: string;
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

function formatPatState(value: 'good' | 'bad' | null | undefined): string {
  if (value === 'good') return 'Conforme';
  if (value === 'bad') return 'Observado';
  return 'No registrado';
}

function getPatData(eq: any): PATEquipmentData {
  const pat = (eq?.patData || {}) as PATEquipmentData;

  return {
    executionStatus:
      pat.executionStatus === 'reprogrammed' ? 'reprogrammed' : 'completed',
    reprogramComment: pat.reprogramComment || '',
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

function isReprogrammedPAT(eq: any): boolean {
  const pat = getPatData(eq);
  return pat.executionStatus === 'reprogrammed';
}

function getCompletedPATEquipments(data: MaintenanceSessionReport): any[] {
  return data.equipments.filter(eq => !isReprogrammedPAT(eq));
}

function getPATLocationDetail(eq: any): string {
  return eq?.detalle_ubicacion || eq?.locationDetail || '';
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
        <p class="photo-caption">${caption}</p>
      </div>
    `;
  }
  return '';
}

function renderPhotoGrid(
  photos: Array<{ url?: string | null; caption: string }>,
  small = true,
): string {
  const rendered = photos
    .filter(photo => !!photo.url)
    .map(photo => renderPhoto(photo.url || null, photo.caption, small))
    .join('');

  if (!rendered) return '';

  return `<div class="photo-grid">${rendered}</div>`;
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

function renderPreMeasurementBlock(eq: any, idx: number): string {
  const pat = getPatData(eq as any);
  const measurePhoto =
    pat.preMeasurementPhoto ||
    eq.thermoPhotos.find((photo: any) => photo.caption === 'preMeasurement')
      ?.url ||
    eq.thermoPhotos[0]?.url ||
    null;
  const typeLabel = eq.type || 'POZO A TIERRA';
  const isGrid = typeLabel.toUpperCase().includes('MALLA');
  const prefix = isGrid ? `MALLA 1, ` : '';
  const measurementValue = pat.preMeasurement || eq.voltage || 'N/A';

  return `
    <div class="measurement-block">
      ${renderPhoto(measurePhoto, `MEDICIÓN POZO ${eq.label || ''} ${idx}`, true)}
      <p class="measurement">
        ${prefix}POZO A TIERRA N°${idx}: ${measurementValue} &Omega;<br/>
        (${eq.label || ''})
      </p>
    </div>
  `;
}

function generateWellListingAndPreMeasurementPages(
  data: MaintenanceSessionReport,
): string {
  const equipments = data.equipments;
  const measurableEquipments = getCompletedPATEquipments(data);
  const totalWells = equipments.length;
  const totalMeasurableWells = measurableEquipments.length;
  const inlineMeasurementCount =
    totalMeasurableWells <= 4
      ? totalMeasurableWells
      : totalMeasurableWells <= 6
        ? 3
        : 0;

  let pages = `
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
            <td>${getPATLocationDetail(eq)}</td>
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

      ${
        inlineMeasurementCount > 0
          ? `
      <h2>5.- MEDICIONES DE LA RESISTENCIA DE LOS POZOS A TIERRA ANTES DEL MANTENIMIENTO</h2>
      <div class="measurement-grid">
        ${measurableEquipments
          .slice(0, inlineMeasurementCount)
          .map((eq, i) => renderPreMeasurementBlock(eq, i + 1))
          .join('')}
      </div>
      `
          : ''
      }
    </div>
  `;

  pages += generatePreMeasurementPages(
    measurableEquipments,
    inlineMeasurementCount,
  );
  return pages;
}

function generatePreMeasurementPages(
  equipments: any[],
  startIndex = 0,
): string {
  const measurableEquipments = equipments.slice(startIndex);
  if (measurableEquipments.length === 0) return '';
  const globalStart = startIndex;
  let pages = '';
  const perPage = 6;

  for (let i = 0; i < measurableEquipments.length; i += perPage) {
    const batch = measurableEquipments.slice(i, i + perPage);
    const isFirst = i === 0;

    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        ${
          isFirst
            ? '<h2>5.- MEDICIONES DE LA RESISTENCIA DE LOS POZOS A TIERRA ANTES DEL MANTENIMIENTO</h2>'
            : ''
        }

        <div class="measurement-grid">
        ${batch
          .map((eq, j) => {
            const idx = globalStart + i + j + 1;
            return renderPreMeasurementBlock(eq, idx);
          })
          .join('')}
        </div>
      </div>
    `;
  }

  return pages;
}

function generateTreatmentPages(data: MaintenanceSessionReport): string {
  const thorGelPhotos: Array<{ url: string; wellLabel: string }> = [];
  const greasePhotos: Array<{ url: string; wellLabel: string }> = [];
  const seenThor = new Set<string>();
  const seenGrease = new Set<string>();

  getCompletedPATEquipments(data).forEach((eq, index) => {
    const pat = getPatData(eq as any);
    const wellLabel = eq.label || `Pozo ${index + 1}`;

    const explicitThor = pat.thorGelPhoto;
    const explicitGrease = pat.greaseApplicationPhoto;

    if (explicitThor && !seenThor.has(explicitThor)) {
      thorGelPhotos.push({ url: explicitThor, wellLabel });
      seenThor.add(explicitThor);
    }
    if (explicitGrease && !seenGrease.has(explicitGrease)) {
      greasePhotos.push({ url: explicitGrease, wellLabel });
      seenGrease.add(explicitGrease);
    }

    if (!explicitThor || !explicitGrease) {
      eq.postPhotos.forEach((p: { url: string; caption?: string }) => {
        const caption = (p.caption || '').toLowerCase();
        if (!explicitThor && caption.includes('thor') && !seenThor.has(p.url)) {
          thorGelPhotos.push({ url: p.url, wellLabel });
          seenThor.add(p.url);
        }
        if (
          !explicitGrease &&
          caption.includes('grease') &&
          !seenGrease.has(p.url)
        ) {
          greasePhotos.push({ url: p.url, wellLabel });
          seenGrease.add(p.url);
        }
      });
    }
  });

  // Only generate if there are treatment photos
  if (thorGelPhotos.length === 0 && greasePhotos.length === 0) {
    return '';
  }

  let pages = '';

  const thorBatch = thorGelPhotos.slice(0, 6);
  const greaseBatch = greasePhotos.slice(0, 6);
  const totalPhotos = thorBatch.length + greaseBatch.length;

  if (totalPhotos <= 8) {
    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        <h2>6.- REGISTRO FOTOGRÁFICO DE APLICACIÓN DE THORGEL Y GRASA CONDUCTIVA</h2>
        ${
          thorBatch.length > 0
            ? `
          <p class="section-subtitle">Aplicación dosis química thorgel</p>
          ${renderPhotoGrid(
            thorBatch.map(photo => ({
              url: photo.url,
              caption: `Aplicación Thorgel - ${photo.wellLabel}`,
            })),
            true,
          )}
        `
            : ''
        }
        ${
          greaseBatch.length > 0
            ? `
          <p class="section-subtitle">Aplicación de grasa conductiva al conductor y varilla</p>
          ${renderPhotoGrid(
            greaseBatch.map(photo => ({
              url: photo.url,
              caption: `Grasa conductiva - ${photo.wellLabel}`,
            })),
            true,
          )}
        `
            : ''
        }
      </div>
    `;
  } else {
    if (thorBatch.length > 0) {
      pages += `
        <div class="page">
          ${generateCompanyHeader()}
          <h2>6.- REGISTRO FOTOGRÁFICO DE APLICACIÓN DE THORGEL Y GRASA CONDUCTIVA</h2>
          <p class="section-subtitle">Aplicación dosis química thorgel</p>
          ${renderPhotoGrid(
            thorBatch.map(photo => ({
              url: photo.url,
              caption: `Aplicación Thorgel - ${photo.wellLabel}`,
            })),
            true,
          )}
        </div>
      `;
    }

    if (greaseBatch.length > 0) {
      pages += `
        <div class="page">
          ${generateCompanyHeader()}
          <p class="section-subtitle">Aplicación de grasa conductiva al conductor y varilla</p>
          ${renderPhotoGrid(
            greaseBatch.map(photo => ({
              url: photo.url,
              caption: `Grasa conductiva - ${photo.wellLabel}`,
            })),
            true,
          )}
        </div>
      `;
    }
  }

  return pages;
}

function generatePostMeasurementPages(data: MaintenanceSessionReport): string {
  const equipments = getCompletedPATEquipments(data);
  if (equipments.length === 0) return '';
  let pages = '';
  const perPage = 6;

  for (let i = 0; i < equipments.length; i += perPage) {
    const batch = equipments.slice(i, i + perPage);
    const isFirst = i === 0;

    pages += `
      <div class="page">
        ${generateCompanyHeader()}
        ${
          isFirst
            ? '<h2>7.- MEDICIONES DE LA RESISTENCIA DE LOS POZOS A TIERRA DESPUÉS DEL MANTENIMIENTO</h2>'
            : ''
        }

        <div class="measurement-grid">
        ${batch
          .map((eq, j) => {
            const idx = i + j + 1;
            const pat = getPatData(eq as any);
            const measurePhoto =
              pat.postMeasurementPhoto ||
              eq.thermoPhotos.find(
                (photo: { url: string; caption?: string }) =>
                  photo.caption === 'postMeasurement',
              )?.url ||
              (eq.thermoPhotos.length > 1
                ? eq.thermoPhotos[eq.thermoPhotos.length - 1].url
                : null);
            const typeLabel = eq.type || 'POZO A TIERRA';
            const isGrid = typeLabel.toUpperCase().includes('MALLA');
            const prefix = isGrid ? `MALLA 1, ` : '';
            const measurementValue =
              pat.postMeasurement || eq.amperage || 'N/A';

            return `
            <div class="measurement-block">
              ${renderPhoto(measurePhoto, `MEDICIÓN POST-MANTENIMIENTO ${eq.label || ''} ${idx}`, true)}
              <p class="measurement">
                ${prefix}POZO A TIERRA N°${idx}: ${measurementValue} &Omega;<br/>
                (${eq.label || ''})
              </p>
            </div>
          `;
          })
          .join('')}
        </div>
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

  const batches: (typeof equipments)[] = [];
  let currentBatch: typeof equipments = [];
  let currentWeight = 0;

  equipments.forEach(eq => {
    const pat = getPatData(eq as any);
    const photoCount = [
      pat.lidStatusPhoto,
      pat.hasSignage?.photo,
      pat.connectorsOk?.photo,
      pat.hasAccess?.photo,
    ].filter(Boolean).length;
    const hasGeneralObservation = !!pat.generalObservation?.trim();

    const blockWeight =
      2 + Math.min(photoCount, 4) * 0.8 + (hasGeneralObservation ? 0.4 : 0);
    const maxWeightPerPage = 7.5;
    const maxBlocksPerPage = 3;

    if (
      currentBatch.length > 0 &&
      (currentWeight + blockWeight > maxWeightPerPage ||
        currentBatch.length >= maxBlocksPerPage)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentWeight = 0;
    }

    currentBatch.push(eq);
    currentWeight += blockWeight;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  let pages = '';

  let absoluteIndexOffset = 0;

  batches.forEach((batch, pageIndex) => {
    const isFirst = pageIndex === 0;

    pages += `
      <div class="page">
        ${generateCompanyHeader()}

        ${isFirst ? '<h2>8.- INSPECCIÓN DETALLADA DE LOS POZOS</h2>' : ''}
        ${batch
          .map((eq, index) => {
            const absoluteIndex = absoluteIndexOffset + index;
            const pat = getPatData(eq as any);
            const isReprogrammed = pat.executionStatus === 'reprogrammed';

            if (isReprogrammed) {
              return `
                <div class="inspection-block">
                  <h2 style="margin-top: ${index === 0 ? '4px' : '10px'};">POZO ${absoluteIndex + 1}: ${eq.label || 'SIN DENOMINACIÓN'}</h2>
                  <table class="data-table">
                    <tr>
                      <th>ÍTEM</th>
                      <th>ESTADO / DETALLE</th>
                    </tr>
                    <tr>
                      <td>ESTADO DE EJECUCIÓN</td>
                      <td>REPROGRAMADO</td>
                    </tr>
                    <tr>
                      <td>COMENTARIO</td>
                      <td>${pat.reprogramComment?.trim() || 'Sin comentario registrado por el técnico.'}</td>
                    </tr>
                  </table>
                </div>
              `;
            }

            const lidStatusLabel = formatPatState(pat.lidStatus);

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
              <div class="inspection-block">
                <h2 style="margin-top: ${index === 0 ? '4px' : '10px'};">POZO ${absoluteIndex + 1}: ${eq.label || 'SIN DENOMINACIÓN'}</h2>
                <table class="data-table">
                  <tr>
                    <th>ÍTEM</th>
                    <th>ESTADO / DETALLE</th>
                  </tr>
                  <tr>
                    <td>ESTADO DE TAPA</td>
                    <td>${lidStatusLabel}</td>
                  </tr>
                  ${
                    pat.lidStatusObservation?.trim()
                      ? `
                  <tr>
                    <td>OBSERVACIÓN DE TAPA</td>
                    <td>${pat.lidStatusObservation}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${checklistRows
                    .map(
                      row => `
                    <tr>
                      <td>${row.label}</td>
                      <td>
                        ${row.item?.value ? 'Conforme' : 'Observado'}
                        ${row.item?.observation ? `<br/>${row.item.observation}` : ''}
                      </td>
                    </tr>
                  `,
                    )
                    .join('')}
                  ${
                    pat.generalObservation?.trim()
                      ? `
                  <tr>
                    <td>OBSERVACIÓN GENERAL</td>
                    <td>${pat.generalObservation}</td>
                  </tr>
                  `
                      : ''
                  }
                </table>

                ${renderPhotoGrid(
                  [
                    {
                      url: pat.lidStatusPhoto,
                      caption: `ESTADO DE TAPA - ${eq.label || ''}`,
                    },
                    {
                      url: pat.hasSignage?.photo,
                      caption: `SEÑALÉTICA NUMÉRICA - ${eq.label || ''}`,
                    },
                    {
                      url: pat.connectorsOk?.photo,
                      caption: `CONECTORES - ${eq.label || ''}`,
                    },
                    {
                      url: pat.hasAccess?.photo,
                      caption: `ACCESO - ${eq.label || ''}`,
                    },
                  ],
                  true,
                )}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
    absoluteIndexOffset += batch.length;
  });

  return pages;
}

function generateRecommendationsAndConclusionsPage(
  data: MaintenanceSessionReport,
  signatures?: PATReportSignatures,
  resistanceTableImage?: string | null,
): string {
  const tableContent = resistanceTableImage
    ? `<img class="resistance-table-image" src="${resistanceTableImage}" alt="Tabla 3.1. Valores máximos de resistencia de puesta a tierra" />`
    : `
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
    `;

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
    <div class="page final-page">
      ${generateCompanyHeader()}

      <h2>9.- VALORES MÁXIMOS DE RESISTENCIA DE PUESTA A TIERRA</h2>
      ${tableContent}

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
          ${
            signatures?.gabriel
              ? `<div class="signature-image-wrap"><img class="signature-image" src="${signatures.gabriel}" alt="Firma Gabriel Enrique Flores Meza" /></div>`
              : ''
          }
          GABRIEL ENRIQUE FLORES MEZA<br/>
          INGENIERO ELECTRICISTA<br/>
          CIP 75628
        </div>
        <div class="signature-box">
          ${
            signatures?.gian
              ? `<div class="signature-image-wrap"><img class="signature-image" src="${signatures.gian}" alt="Firma Gianmarco Isique Neciosup" /></div>`
              : ''
          }
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
export function generatePATReportHTML(
  data: MaintenanceSessionReport,
  signatures?: PATReportSignatures,
  staticAssets?: PATReportStaticAssets,
): string {
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
  ${generateWellListingAndPreMeasurementPages(data)}
  ${generateTreatmentPages(data)}
  ${generatePostMeasurementPages(data)}
  ${generateInspectionChecklistPages(data)}
  ${generateRecommendationsAndConclusionsPage(data, signatures, staticAssets?.resistanceTableImage)}
</body>
</html>
  `;
}
