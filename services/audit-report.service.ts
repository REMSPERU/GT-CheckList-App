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
    const rows = data.items
      .map(item => {
        const section = item.sectionName ? escapeHtml(item.sectionName) : '-';
        const observation = item.observation
          ? escapeHtml(item.observation)
          : '-';

        return `
          <tr>
            <td>${item.order}</td>
            <td>${escapeHtml(item.questionCode)}</td>
            <td>${section}</td>
            <td>${escapeHtml(item.questionText)}</td>
            <td class="${statusClass(item.status)}">${formatStatus(item.status)}</td>
            <td>${observation}</td>
            <td>${item.photosCount}</td>
          </tr>
        `;
      })
      .join('');

    const address = data.propertyAddress
      ? escapeHtml(data.propertyAddress)
      : 'No disponible';

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
      color: #0f172a;
      margin: 0;
      line-height: 1.35;
      font-size: 11px;
    }

    .header {
      border-bottom: 2px solid #0891b2;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }

    .title {
      margin: 0;
      font-size: 20px;
      color: #0e7490;
      letter-spacing: 0.2px;
    }

    .subtitle {
      margin-top: 4px;
      color: #334155;
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
      color: #475569;
      width: 160px;
      font-weight: 600;
    }

    .summary {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }

    .summary td {
      border: 1px solid #cbd5e1;
      text-align: center;
      padding: 7px 6px;
    }

    .summary-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .summary-label {
      margin-top: 2px;
      font-size: 10px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .details {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .details th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 7px 6px;
      text-align: left;
      color: #0f172a;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .details td {
      border: 1px solid #e2e8f0;
      padding: 6px;
      vertical-align: top;
      color: #1e293b;
    }

    .status-ok {
      color: #047857;
      font-weight: 700;
    }

    .status-obs {
      color: #b91c1c;
      font-weight: 700;
    }

    .status-na {
      color: #475569;
      font-weight: 600;
    }

    .footer {
      margin-top: 12px;
      font-size: 9px;
      color: #64748b;
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

  <table class="details">
    <thead>
      <tr>
        <th>#</th>
        <th>Codigo</th>
        <th>Seccion</th>
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

  <div class="footer">
    Documento generado por GT Checklist App.
  </div>
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
