import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ReportMaintenanceData {
  maintenanceId: string;
  equipmentCode: string;
  equipmentLocation: string;
  propertyName: string;
  propertyAddress?: string;
  scheduledDate: string;
  completedAt: string;
  technicianName: string;
  maintenanceType: string;
  prePhotos: { url: string; category?: string }[];
  postPhotos: { url: string }[];
  checklist: Record<string, boolean>;
  measurements?: Record<
    string,
    {
      voltage?: string;
      amperage?: string;
      cableDiameter?: string;
      cableType?: string;
    }
  >;
  itemObservations: Record<
    string,
    {
      note: string;
      photoUrl?: string;
    }
  >;
  observations?: string;
}

export interface SessionReportData {
  propertyName: string;
  propertyAddress?: string;
  sessionDate: string;
  generatedAt: string;
  maintenances: ReportMaintenanceData[];
}

/**
 * PDF Report Generation Service
 * Formal corporate style with navy blue color scheme
 */
class PDFReportService {
  /**
   * Generate cover page HTML
   */
  private generateCoverPageHTML(data: SessionReportData): string {
    const reportDate = new Date(data.generatedAt).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const sessionDate = new Date(
      data.sessionDate + 'T12:00:00',
    ).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const totalMaint = data.maintenances.length;

    return `
      <div class="cover-page">
        <div class="cover-header">
          <div class="company-logo">
            <div class="logo-circle">
              <span class="logo-text">GT</span>
            </div>
          </div>
        </div>

        <div class="cover-content">
          <div class="report-type">INFORME TÉCNICO</div>
          <h1 class="cover-title">MANTENIMIENTO<br/>PREVENTIVO</h1>
          <div class="cover-subtitle">Reporte de Ejecución de Mantenimiento</div>
        </div>

        <div class="cover-info">
          <div class="info-row">
            <span class="info-label">INMUEBLE:</span>
            <span class="info-value">${data.propertyName}</span>
          </div>
          ${
            data.propertyAddress
              ? `
          <div class="info-row">
            <span class="info-label">DIRECCIÓN:</span>
            <span class="info-value">${data.propertyAddress}</span>
          </div>
          `
              : ''
          }
          <div class="info-row">
            <span class="info-label">FECHA DE SERVICIO:</span>
            <span class="info-value">${sessionDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">EQUIPOS ATENDIDOS:</span>
            <span class="info-value">${totalMaint}</span>
          </div>
          <div class="info-row">
            <span class="info-label">FECHA DEL INFORME:</span>
            <span class="info-value">${reportDate}</span>
          </div>
        </div>

        <div class="cover-footer">
          <div class="footer-line"></div>
          <p>Documento Confidencial</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML for a single maintenance item
   */
  private generateMaintenanceHTML(
    data: ReportMaintenanceData,
    index: number,
  ): string {
    const formatCableType = (value?: string) => {
      if (!value) return '-';
      if (value === 'libre_halogeno') return 'Libre de Halógeno';
      if (value === 'no_libre_halogeno') return 'No libre de Halógeno';
      return value;
    };

    // Pre-photos HTML
    const visualPhotos = data.prePhotos.filter(p => p.category !== 'thermo');
    const thermoPhotos = data.prePhotos.filter(p => p.category === 'thermo');

    const photosHTML = (photos: { url: string }[], title: string) => {
      if (photos.length === 0) return '';
      return `
        <div class="photos-section">
          <h4>${title}</h4>
          <div class="photos-grid">
            ${photos.map(p => `<img src="${p.url}" alt="foto" class="photo" />`).join('')}
          </div>
        </div>
      `;
    };

    // Checklist HTML
    const checklistItems = Object.entries(data.checklist);
    const checklistHTML =
      checklistItems.length > 0
        ? `
      <div class="checklist-section">
        <h4>Verificación de Componentes</h4>
        <table class="checklist-table">
          <thead>
            <tr>
              <th style="width: 35%">Componente</th>
              <th style="width: 10%">Estado</th>
              <th style="width: 25%">Mediciones</th>
              <th style="width: 30%">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${checklistItems
              .map(([key, isOk]) => {
                const label = key.replace(/_/g, ' ').toUpperCase();
                const measurement = data.measurements?.[key];
                const observation = data.itemObservations[key];

                let measureText = '';
                if (measurement) {
                  const parts = [];
                  if (measurement.voltage)
                    parts.push(`${measurement.voltage}V`);
                  if (measurement.amperage)
                    parts.push(`${measurement.amperage}A`);
                  if (measurement.cableDiameter)
                    parts.push(`Ø${measurement.cableDiameter}`);
                  if (measurement.cableType)
                    parts.push(formatCableType(measurement.cableType));
                  measureText = parts.join(', ');
                }

                return `
                <tr class="${!isOk ? 'has-issue' : ''}">
                  <td>${label}</td>
                  <td class="status-cell">
                    <span class="status-badge ${isOk ? 'ok' : 'issue'}">${isOk ? 'OK' : 'OBS'}</span>
                  </td>
                  <td class="measurements">${measureText || '-'}</td>
                  <td>${observation?.note || '-'}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `
        : '';

    return `
      <div class="maintenance-item">
        <div class="equipment-header">
          <div class="equipment-number">${index + 1}</div>
          <div class="equipment-info">
            <strong>${data.equipmentCode}</strong>
            <span>${data.equipmentLocation}</span>
          </div>
          <span class="maintenance-type">${data.maintenanceType}</span>
        </div>

        ${photosHTML(visualPhotos, 'Registro Fotográfico - Inspección Visual')}
        ${photosHTML(thermoPhotos, 'Registro Fotográfico - Termografía')}

        ${checklistHTML}

        ${
          data.observations
            ? `
          <div class="general-observations">
            <h4>Observaciones Generales</h4>
            <p>${data.observations}</p>
          </div>
        `
            : ''
        }

        ${photosHTML(data.postPhotos, 'Registro Fotográfico - Post Mantenimiento')}
      </div>
    `;
  }

  /**
   * Generate full HTML for the maintenance session report
   * Uses formal corporate style with navy blue (#1F4E79) color scheme
   */
  generateReportHTML(data: SessionReportData): string {
    const totalMaint = data.maintenances.length;
    const okItems = data.maintenances.reduce(
      (acc, m) =>
        acc + Object.values(m.checklist).filter(v => v === true).length,
      0,
    );
    const issueItems = data.maintenances.reduce(
      (acc, m) =>
        acc + Object.values(m.checklist).filter(v => v === false).length,
      0,
    );

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Mantenimiento</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }

    /* Cover Page Styles */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 40px;
      background: linear-gradient(135deg, #1F4E79 0%, #2E6B9E 100%);
      color: #fff;
      page-break-after: always;
    }

    .cover-header {
      display: flex;
      justify-content: flex-end;
    }

    .company-logo {
      text-align: right;
    }

    .logo-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: 3px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-text {
      font-size: 28px;
      font-weight: bold;
      color: #fff;
    }

    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px 0;
    }

    .report-type {
      font-size: 14px;
      letter-spacing: 4px;
      margin-bottom: 20px;
      color: rgba(255,255,255,0.8);
    }

    .cover-title {
      font-size: 42px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 20px;
    }

    .cover-subtitle {
      font-size: 16px;
      color: rgba(255,255,255,0.9);
    }

    .cover-info {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 40px;
    }

    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      width: 180px;
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
    }

    .info-value {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
    }

    .cover-footer {
      text-align: center;
    }

    .footer-line {
      width: 60px;
      height: 3px;
      background: rgba(255,255,255,0.5);
      margin: 0 auto 15px;
    }

    .cover-footer p {
      font-size: 10px;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    /* Content Pages */
    .content-page {
      padding: 20px 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 15px;
      border-bottom: 2px solid #1F4E79;
      margin-bottom: 20px;
    }

    .page-header h2 {
      font-size: 18px;
      color: #1F4E79;
      font-weight: 700;
    }

    .page-header .page-info {
      font-size: 10px;
      color: #666;
    }

    /* Summary Section */
    .summary-section {
      margin-bottom: 30px;
    }

    .summary-cards {
      display: flex;
      gap: 15px;
    }

    .summary-card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .summary-card.primary {
      background: #1F4E79;
      border-color: #1F4E79;
      color: #fff;
    }

    .summary-card .number {
      font-size: 32px;
      font-weight: 700;
      color: #1F4E79;
    }

    .summary-card.primary .number {
      color: #fff;
    }

    .summary-card.ok .number { color: #059669; }
    .summary-card.issue .number { color: #DC2626; }

    .summary-card .label {
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .summary-card.primary .label {
      color: rgba(255,255,255,0.8);
    }

    /* Maintenance Items */
    .maintenance-item {
      background: #fff;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .equipment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #1F4E79;
      color: #fff;
    }

    .equipment-number {
      background: rgba(255,255,255,0.2);
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    }

    .equipment-info {
      flex: 1;
    }

    .equipment-info strong {
      display: block;
      font-size: 14px;
      color: #fff;
    }

    .equipment-info span {
      color: rgba(255,255,255,0.8);
      font-size: 11px;
    }

    .maintenance-type {
      background: rgba(255,255,255,0.2);
      color: #fff;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }

    .photos-section {
      padding: 16px;
      border-bottom: 1px solid #E2E8F0;
    }

    .photos-section:last-child {
      border-bottom: none;
    }

    .photos-section h4 {
      font-size: 11px;
      color: #1F4E79;
      margin-bottom: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .photos-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .photo {
      width: 90px;
      height: 90px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
    }

    .checklist-section {
      padding: 16px;
      border-bottom: 1px solid #E2E8F0;
    }

    .checklist-section h4 {
      font-size: 11px;
      color: #1F4E79;
      margin-bottom: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .checklist-table th {
      background: #F1F5F9;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #E2E8F0;
    }

    .checklist-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: middle;
    }

    .checklist-table tr.has-issue {
      background: #FEF2F2;
    }

    .status-cell {
      text-align: center;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 9px;
    }

    .status-badge.ok {
      background: #D1FAE5;
      color: #059669;
    }

    .status-badge.issue {
      background: #FEE2E2;
      color: #DC2626;
    }

    .measurements {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      color: #475569;
    }

    .general-observations {
      background: #F8FAFC;
      border-left: 4px solid #1F4E79;
      padding: 14px 16px;
      margin: 16px;
      border-radius: 0 6px 6px 0;
    }

    .general-observations h4 {
      font-size: 11px;
      color: #1F4E79;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .general-observations p {
      color: #475569;
      font-size: 11px;
      line-height: 1.5;
    }

    /* Footer/Signatures */
    .report-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #1F4E79;
    }

    .signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 50px;
    }

    .signature-box {
      text-align: center;
      width: 200px;
    }

    .signature-line {
      border-top: 1px solid #1F4E79;
      margin-bottom: 8px;
    }

    .signature-box p {
      font-size: 10px;
      color: #64748B;
      font-weight: 500;
    }

    .signature-box .role {
      font-size: 11px;
      color: #1F4E79;
      font-weight: 600;
    }

    @media print {
      .maintenance-item {
        page-break-inside: avoid;
      }
      .cover-page {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  ${this.generateCoverPageHTML(data)}

  <div class="content-page">
    <div class="page-header">
      <h2>Resumen de Mantenimiento</h2>
      <div class="page-info">${data.propertyName}</div>
    </div>

    <div class="summary-section">
      <div class="summary-cards">
        <div class="summary-card primary">
          <div class="number">${totalMaint}</div>
          <div class="label">Equipos Atendidos</div>
        </div>
        <div class="summary-card ok">
          <div class="number">${okItems}</div>
          <div class="label">Items Conformes</div>
        </div>
        <div class="summary-card issue">
          <div class="number">${issueItems}</div>
          <div class="label">Observaciones</div>
        </div>
      </div>
    </div>

    ${data.maintenances.map((m, i) => this.generateMaintenanceHTML(m, i)).join('')}

    <div class="report-footer">
      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p class="role">Técnico Responsable</p>
          <p>Nombre y Firma</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p class="role">Supervisor</p>
          <p>Nombre y Firma</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p class="role">Cliente</p>
          <p>Nombre y Firma</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate PDF from session data
   * @returns URI of the generated PDF file
   */
  async generatePDF(data: SessionReportData): Promise<string> {
    const html = this.generateReportHTML(data);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return uri;
  }

  /**
   * Share the PDF using system share sheet
   */
  async sharePDF(pdfUri: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir Informe de Mantenimiento',
      UTI: 'com.adobe.pdf',
    });
  }

  /**
   * Save PDF to device - uses share functionality to allow user to save
   */
  async savePDFToDevice(pdfUri: string): Promise<string> {
    await this.sharePDF(pdfUri);
    return pdfUri;
  }

  /**
   * Print the PDF directly
   */
  async printPDF(html: string): Promise<void> {
    await Print.printAsync({ html });
  }
}

export const pdfReportService = new PDFReportService();
