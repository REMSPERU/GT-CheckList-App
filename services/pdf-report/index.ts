// PDF Report Module - Re-exports

// Types (including ReportType enum)
export * from './common/types';

// Styles
export { getReportStyles } from './common/styles';

// HTML Generators (Technical Report)
export {
  generateHeaderPageHTML,
  generateEquipmentSummaryPageHTML,
  generateEquipmentPhotoPageHTML,
  generateRecommendationsPageHTML,
} from './electrical-panels/technical-generator';

// HTML Generators (Protocol Report)
export {
  generateHeaderPageHTML as generateELHeaderPageHTML,
  generateSummaryAndObservationsHTML as generateELSummaryPageHTML,
  generateEquipmentPhotoPageHTML as generateELEquipmentPhotoPageHTML,
} from './emergency-lights/technical-generator';

export { generateProtocolPageHTML } from './electrical-panels/protocol-generator';

// Operability Certificate Generator
export { generateOperabilityCertificateHTML } from './electrical-panels/operability-generator';

// HTML Generators (Legacy - deprecated)
export {
  generateCoverPageHTML,
  generateMaintenanceHTML,
  generateSummaryHTML,
  generateSignaturesHTML,
} from './electrical-panels/legacy-generator';

// Service
export { pdfReportService } from './service';
