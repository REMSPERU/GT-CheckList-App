// PDF Report Module - Re-exports

// Types (including ReportType enum)
export * from './types';

// Styles
export { getReportStyles } from './styles';

// HTML Generators (Technical Report)
export {
  generateHeaderPageHTML,
  generateEquipmentSummaryPageHTML,
  generateEquipmentPhotoPageHTML,
  generateRecommendationsPageHTML,
} from './technical-generator';

// HTML Generators (Protocol Report)
export { generateProtocolPageHTML } from './protocol-generator';

// Operability Certificate Generator
export { generateOperabilityCertificateHTML } from './operability-generator';

// HTML Generators (Legacy - deprecated)
export {
  generateCoverPageHTML,
  generateMaintenanceHTML,
  generateSummaryHTML,
  generateSignaturesHTML,
} from './legacy-generator';

// Service
export { pdfReportService } from './service';
