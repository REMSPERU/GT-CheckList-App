import * as Print from 'expo-print';

const PDF_GENERATION_TIMEOUT_MS = 60000;

export interface AuditReportItem {
  order: number;
  questionCode: string;
  questionText: string;
  sectionName: string | null;
  status: 'OK' | 'OBS' | 'N/A';
  observation: string | null;
  photosCount: number;
}

export interface AuditReportSummary {
  totalQuestions: number;
  totalApplicable: number;
  totalNotApplicable: number;
  totalOk: number;
  totalObs: number;
  totalPhotos: number;
}

export interface AuditReportEvidencePhoto {
  questionCode: string;
  questionText: string;
  observation: string | null;
  url: string;
}

export interface AuditReportData {
  propertyName: string;
  propertyAddress: string | null;
  auditorLabel: string;
  scheduledFor: string;
  startedAt: string;
  submittedAt: string;
  generatedAt: string;
  summary: AuditReportSummary;
  items: AuditReportItem[];
  evidencePhotos: AuditReportEvidencePhoto[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatStatus(status: AuditReportItem['status']): string {
  if (status === 'N/A') return 'NO APLICA';
  return status;
}

function statusClass(status: AuditReportItem['status']): string {
  if (status === 'OK') return 'status-ok';
  if (status === 'OBS') return 'status-obs';
  return 'status-na';
}

class AuditReportService {
  private buildHtml(data: AuditReportData): string {
    const groupedItems: Array<{
      title: string;
      rows: AuditReportItem[];
    }> = [];

    for (const item of data.items) {
      const sectionTitle = item.sectionName?.trim() || 'Sin seccion';
      const current = groupedItems[groupedItems.length - 1];

      if (!current || current.title !== sectionTitle) {
        groupedItems.push({ title: sectionTitle, rows: [item] });
      } else {
        current.rows.push(item);
      }
    }

    const detailsBySection = groupedItems
      .map(group => {
        const rows = group.rows
          .map(item => {
            const observation = item.observation
              ? escapeHtml(item.observation)
              : '-';

            return `
          <tr>
            <td>${item.order}</td>
            <td>${escapeHtml(item.questionText)}</td>
            <td class="${statusClass(item.status)}">${formatStatus(item.status)}</td>
            <td>${observation}</td>
            <td>${item.photosCount}</td>
          </tr>
            `;
          })
          .join('');

        return `
  <div class="section-block">
    <h3 class="section-subtitle">${escapeHtml(group.title)}</h3>
    <table class="details">
      <thead>
        <tr>
          <th>#</th>
          <th>Pregunta</th>
          <th>Estado</th>
          <th>Observacion</th>
          <th>Fotos</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
        `;
      })
      .join('');

    const address = data.propertyAddress
      ? escapeHtml(data.propertyAddress)
      : 'No disponible';

    const photosSection = data.evidencePhotos.length
      ? `
  <h2 class="section-title">Evidencias fotograficas</h2>
  <div class="photo-grid">
    ${data.evidencePhotos
      .map(photo => {
        const observation = photo.observation
          ? `<div class="photo-caption">OBS: ${escapeHtml(photo.observation)}</div>`
          : '';

        return `
      <div class="photo-card">
        <img class="photo-image" src="${escapeHtml(photo.url)}" alt="Evidencia: ${escapeHtml(photo.questionText)}" />
        <div class="photo-title">${escapeHtml(photo.questionText)}</div>
        ${observation}
      </div>
        `;
      })
      .join('')}
  </div>
      `
      : `
  <h2 class="section-title">Evidencias fotograficas</h2>
  <div class="empty-note">No se registraron fotos para esta auditoria.</div>
      `;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Auditoria - ${escapeHtml(data.propertyName)}</title>
  <style>
    @page {
      margin: 20mm 14mm;
      size: A4;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #070707;
      margin: 0;
      line-height: 1.35;
      font-size: 11px;
      background: #ffffff;
    }

    .header {
      border-bottom: 2px solid #FF6640;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }

    .title {
      margin: 0;
      font-size: 20px;
      color: #070707;
      letter-spacing: 0.2px;
    }

    .subtitle {
      margin-top: 4px;
      color: #070707;
      font-size: 12px;
    }

    .meta-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .meta-grid td {
      padding: 4px 0;
      vertical-align: top;
    }

    .meta-label {
      color: #070707;
      width: 160px;
      font-weight: 600;
    }

    .summary {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }

    .summary td {
      border: 1px solid #070707;
      text-align: center;
      padding: 7px 6px;
    }

    .summary-value {
      font-size: 14px;
      font-weight: 700;
      color: #070707;
    }

    .summary-label {
      margin-top: 2px;
      font-size: 10px;
      color: #070707;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .details {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .details th {
      background: #fff7f4;
      border: 1px solid #070707;
      padding: 7px 6px;
      text-align: left;
      color: #070707;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .details td {
      border: 1px solid #070707;
      padding: 6px;
      vertical-align: top;
      color: #070707;
    }

    .section-block {
      margin-top: 10px;
      page-break-inside: avoid;
    }

    .section-subtitle {
      margin: 0 0 6px;
      font-size: 11px;
      color: #070707;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      border-left: 3px solid #FF6640;
      padding-left: 7px;
    }

    .status-ok {
      color: #070707;
      font-weight: 700;
    }

    .status-obs {
      color: #FF6640;
      font-weight: 700;
    }

    .status-na {
      color: #070707;
      font-weight: 600;
    }

    .section-title {
      margin: 14px 0 8px;
      font-size: 13px;
      color: #070707;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1px solid #FF6640;
      padding-bottom: 3px;
    }

    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .photo-card {
      width: calc(50% - 4px);
      border: 1px solid #070707;
      border-radius: 8px;
      padding: 6px;
      box-sizing: border-box;
      page-break-inside: avoid;
    }

    .photo-image {
      width: 100%;
      height: 138px;
      object-fit: contain;
      object-position: center;
      display: block;
      border-radius: 6px;
      background: #ffffff;
    }

    .photo-title {
      margin-top: 5px;
      font-size: 9px;
      font-weight: 700;
      color: #070707;
    }

    .photo-caption {
      margin-top: 3px;
      font-size: 9px;
      color: #070707;
    }

    .empty-note {
      border: 1px dashed #FF6640;
      border-radius: 8px;
      padding: 8px;
      font-size: 10px;
      color: #070707;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">Informe de Auditoria</h1>
    <div class="subtitle">Inmueble: ${escapeHtml(data.propertyName)}</div>
  </div>

  <table class="meta-grid">
    <tr>
      <td class="meta-label">Direccion</td>
      <td>${address}</td>
    </tr>
    <tr>
      <td class="meta-label">Auditor</td>
      <td>${escapeHtml(data.auditorLabel)}</td>
    </tr>
    <tr>
      <td class="meta-label">Fecha programada</td>
      <td>${escapeHtml(data.scheduledFor)}</td>
    </tr>
    <tr>
      <td class="meta-label">Inicio</td>
      <td>${escapeHtml(data.startedAt)}</td>
    </tr>
    <tr>
      <td class="meta-label">Envio</td>
      <td>${escapeHtml(data.submittedAt)}</td>
    </tr>
    <tr>
      <td class="meta-label">Generado</td>
      <td>${escapeHtml(data.generatedAt)}</td>
    </tr>
  </table>

  <table class="summary">
    <tr>
      <td>
        <div class="summary-value">${data.summary.totalQuestions}</div>
        <div class="summary-label">Preguntas</div>
      </td>
      <td>
        <div class="summary-value">${data.summary.totalApplicable}</div>
        <div class="summary-label">Aplican</div>
      </td>
      <td>
        <div class="summary-value">${data.summary.totalNotApplicable}</div>
        <div class="summary-label">No aplican</div>
      </td>
      <td>
        <div class="summary-value">${data.summary.totalOk}</div>
        <div class="summary-label">OK</div>
      </td>
      <td>
        <div class="summary-value">${data.summary.totalObs}</div>
        <div class="summary-label">OBS</div>
      </td>
      <td>
        <div class="summary-value">${data.summary.totalPhotos}</div>
        <div class="summary-label">Fotos OBS</div>
      </td>
    </tr>
  </table>

  ${detailsBySection}

  ${photosSection}
</body>
</html>
    `;
  }

  async generatePDF(data: AuditReportData): Promise<string> {
    const html = this.buildHtml(data);

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      const printPromise = Print.printToFileAsync({ html, base64: false });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(
              'La generacion de PDF excedio el tiempo de espera. Intente nuevamente.',
            ),
          );
        }, PDF_GENERATION_TIMEOUT_MS);
      });

      const { uri } = await Promise.race([printPromise, timeoutPromise]);
      return uri;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

export const auditReportService = new AuditReportService();
