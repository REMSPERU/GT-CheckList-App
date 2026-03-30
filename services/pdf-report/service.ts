// PDF Report Service - Main Service Class

import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import {
  MaintenanceSessionReport,
  SessionReportData,
  ReportType,
} from './common/types';
import { getReportStyles } from './common/styles';
import {
  generateHeaderPageHTML,
  generateEquipmentSummaryPageHTML,
  generateEquipmentPhotoPageHTML,
  generateRecommendationsPageHTML,
} from './electrical-panels/technical-generator';
import { generateProtocolPageHTML } from './electrical-panels/protocol-generator';
import {
  generateCoverPageHTML,
  generateMaintenanceHTML,
} from './electrical-panels/legacy-generator';
import { generateOperabilityCertificateHTML } from './electrical-panels/operability-generator';
import {
  generateHeaderPageHTML as generateELHeader,
  generateSummaryAndObservationsHTML as generateELSummary,
} from './emergency-lights/technical-generator';
import {
  generatePATReportHTML,
  type PATReportSignatures,
} from './PAT/technical-generator';

/**
 * PDF Report Generation Service
 * Corporate style with blue (#0056b3) and orange (#ff6600) color scheme
 */
class PDFReportService {
  private readonly PDF_GENERATION_TIMEOUT_MS = 60000;

  private patSignaturesCache: PATReportSignatures | null = null;

  private generationQueue: Promise<void> = Promise.resolve();

  private async runInGenerationQueue<T>(task: () => Promise<T>): Promise<T> {
    const runPromise = this.generationQueue.then(task);

    this.generationQueue = runPromise.then(
      () => undefined,
      () => undefined,
    );

    return runPromise;
  }

  private async printToFileWithTimeout(html: string): Promise<string> {
    return this.runInGenerationQueue(async () => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      try {
        const printPromise = Print.printToFileAsync({ html, base64: false });
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(
              new Error(
                'La generación de PDF excedió el tiempo de espera. Intente nuevamente.',
              ),
            );
          }, this.PDF_GENERATION_TIMEOUT_MS);
        });

        const { uri } = await Promise.race([printPromise, timeoutPromise]);
        return uri;
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    });
  }

  /**
   * Generate full HTML for the maintenance session report (TECHNICAL REPORT)
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
    ${getReportStyles('portrait')}
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
   * Generate full HTML for the Protocol Certificate (PROTOCOL REPORT)
   */
  generateProtocolReportHTML(data: MaintenanceSessionReport): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protocolo de Mantenimiento - ${data.clientName}</title>
  <style>
    ${getReportStyles('landscape')}
  </style>
</head>
<body>
  ${generateProtocolPageHTML(data)}
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
   * Generate emergency lights report HTML
   */
  generateEmergencyLightsReportHTML(data: MaintenanceSessionReport): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Técnico - Luces de Emergencia - ${data.clientName}</title>
  <style>
    ${getReportStyles('portrait')}
  </style>
</head>
<body>
  ${generateELHeader(data)}
  ${generateELSummary(data)}
  ${generateRecommendationsPageHTML(data)}
</body>
</html>
    `;
  }

  /**
   * Generate PAT (Pozo a Tierra) report HTML
   */
  generatePATReportHTML(
    data: MaintenanceSessionReport,
    signatures?: PATReportSignatures,
  ): string {
    return generatePATReportHTML(data, signatures);
  }

  private async getImageDataUriFromAsset(moduleId: number): Promise<string> {
    const asset = Asset.fromModule(moduleId);

    if (!asset.localUri) {
      await asset.downloadAsync();
    }

    const assetUri = asset.localUri || asset.uri;
    const base64 = await FileSystem.readAsStringAsync(assetUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  }

  private async getPATSignatures(): Promise<PATReportSignatures> {
    if (this.patSignaturesCache) {
      return this.patSignaturesCache;
    }

    try {
      const [gabriel, gian] = await Promise.all([
        this.getImageDataUriFromAsset(
          require('../../assets/pdf/firmagabriel.png'),
        ),
        this.getImageDataUriFromAsset(
          require('../../assets/pdf/firmagian.png'),
        ),
      ]);

      this.patSignaturesCache = { gabriel, gian };
    } catch (error) {
      console.error('Error loading PAT signatures:', error);
      this.patSignaturesCache = { gabriel: null, gian: null };
    }

    return this.patSignaturesCache;
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
      case ReportType.PROTOCOL:
        html = this.generateProtocolReportHTML(data);
        break;
      case ReportType.EMERGENCY_LIGHTS:
        html = this.generateEmergencyLightsReportHTML(data);
        break;
      case ReportType.PAT:
        html = this.generatePATReportHTML(data, await this.getPATSignatures());
        break;
      case ReportType.TECHNICAL:
      default:
        html = this.generateSessionReportHTML(data);
        break;
    }

    return this.printToFileWithTimeout(html);
  }

  /**
   * Generate PDF from session data (TECHNICAL)
   */
  async generateSessionPDF(data: MaintenanceSessionReport): Promise<string> {
    const html = this.generateSessionReportHTML(data);
    return this.printToFileWithTimeout(html);
  }

  /**
   * Generate Protocol PDF
   */
  async generateProtocolPDF(data: MaintenanceSessionReport): Promise<string> {
    const html = this.generateProtocolReportHTML(data);
    return this.printToFileWithTimeout(html);
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
    ${getReportStyles('portrait')}
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
    return this.printToFileWithTimeout(html);
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
