// PDF Report Service - Main Service Class

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import {
  MaintenanceSessionReport,
  SessionReportData,
  ReportType,
} from './types';
import { getReportStyles } from './styles';
import {
  generateHeaderPageHTML,
  generateEquipmentSummaryPageHTML,
  generateEquipmentPhotoPageHTML,
  generateCoverPageHTML,
  generateMaintenanceHTML,
  generateRecommendationsPageHTML,
} from './html-generators';
import { generateOperabilityCertificateHTML } from './operability-generator';

/**
 * PDF Report Generation Service
 * Corporate style with blue (#0056b3) and orange (#ff6600) color scheme
 */
class PDFReportService {
  /**
   * Generate full HTML for the maintenance session report (NEW FORMAT)
   * Uses corporate template matching plantilla.html
   */
  generateSessionReportHTML(data: MaintenanceSessionReport): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Técnico - ${data.clientName}</title>
  <style>
    ${getReportStyles()}
  </style>
</head>
<body>
  ${generateHeaderPageHTML(data)}
  ${generateEquipmentSummaryPageHTML(data)}
  ${data.equipments.map(eq => generateEquipmentPhotoPageHTML(eq)).join('')}
  ${generateRecommendationsPageHTML(data)}
</body>
</html>
    `;
  }

  /**
   * Generate operability certificate HTML
   */
  generateOperabilityCertificateHTML(data: MaintenanceSessionReport): string {
    return generateOperabilityCertificateHTML(data);
  }

  /**
   * Generate PDF based on report type
   * @returns URI of the generated PDF file
   */
  async generateReport(
    type: ReportType,
    data: MaintenanceSessionReport,
  ): Promise<string> {
    let html: string;

    switch (type) {
      case ReportType.OPERABILITY:
        html = this.generateOperabilityCertificateHTML(data);
        break;
      case ReportType.TECHNICAL:
      default:
        html = this.generateSessionReportHTML(data);
        break;
    }

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return uri;
  }

  /**
   * Generate PDF from session data (NEW FORMAT)
   * @returns URI of the generated PDF file
   */
  async generateSessionPDF(data: MaintenanceSessionReport): Promise<string> {
    const html = this.generateSessionReportHTML(data);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return uri;
  }

  // ============= LEGACY METHODS FOR BACKWARD COMPATIBILITY =============

  /**
   * @deprecated Use generateSessionReportHTML instead
   * Generate full HTML for the maintenance session report (LEGACY FORMAT)
   */
  generateReportHTML(data: SessionReportData): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Mantenimiento</title>
  <style>
    ${getReportStyles()}
  </style>
</head>
<body>
  ${generateCoverPageHTML(data)}
  ${data.maintenances.map((m, i) => generateMaintenanceHTML(m, i)).join('')}
</body>
</html>
    `;
  }

  /**
   * @deprecated Use generateSessionPDF instead
   * Generate PDF from session data (LEGACY FORMAT)
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
   * Open the PDF directly in an external viewer
   * On Android, uses IntentLauncher. On iOS, uses Sharing (native Open In flow)
   */
  async openPDF(pdfUri: string, filename?: string): Promise<void> {
    let uriToOpen = pdfUri;

    // Use descriptive name if provided
    if (filename) {
      try {
        const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
        const newUri = `${FileSystem.documentDirectory}${cleanName}`;
        await FileSystem.copyAsync({ from: pdfUri, to: newUri });
        uriToOpen = newUri;
      } catch (error) {
        console.error('Error renaming PDF for opening:', error);
      }
    }

    if (Platform.OS === 'android') {
      try {
        const contentUri = await FileSystem.getContentUriAsync(uriToOpen);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'application/pdf',
        });
      } catch (error) {
        console.error('Error with IntentLauncher:', error);
        // Fallback to sharing if intent fails
        await this.sharePDF(uriToOpen, filename, 'Abrir Informe');
      }
    } else {
      // iOS doesn't have a direct equivalent to IntentLauncher for local files,
      // so we use the sharing sheet which acts as "Open In..."
      await this.sharePDF(uriToOpen, undefined, 'Abrir Informe');
    }
  }

  /**
   * Share/Download the PDF using system share sheet
   * Renames the file to a descriptive name if possible
   */
  async sharePDF(
    pdfUri: string,
    filename?: string,
    dialogTitle?: string,
  ): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    let uriToShare = pdfUri;

    // If filename is provided, copy to a new file with that name
    // This makes the share/save dialog show a nice name instead of "Print.pdf"
    if (filename) {
      try {
        const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
        const newUri = `${FileSystem.documentDirectory}${cleanName}`;
        await FileSystem.copyAsync({
          from: pdfUri,
          to: newUri,
        });
        uriToShare = newUri;
      } catch (error) {
        console.error('Error renaming PDF for share:', error);
        // Fallback to original URI if renaming fails
      }
    }

    await Sharing.shareAsync(uriToShare, {
      mimeType: 'application/pdf',
      dialogTitle: dialogTitle || 'Descargar Informe',
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
