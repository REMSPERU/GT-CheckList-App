// PDF Report Module - Re-exports

// Types (including ReportType enum)
export * from './types';

// Styles
export { getReportStyles } from './styles';

// HTML Generators (New)
export {
  generateHeaderPageHTML,
  generateEquipmentSummaryPageHTML,
  generateEquipmentPhotoPageHTML,
  generateRecommendationsPageHTML,
} from './html-generators';

// Operability Certificate Generator
export { generateOperabilityCertificateHTML } from './operability-generator';

// HTML Generators (Legacy - deprecated)
export {
  generateCoverPageHTML,
  generateMaintenanceHTML,
  generateSummaryHTML,
  generateSignaturesHTML,
} from './html-generators';

// Service
export { pdfReportService } from './service';
