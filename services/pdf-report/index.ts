// PDF Report Module - Re-exports

// Types
export * from './types';

// Styles
export { getReportStyles } from './styles';

// HTML Generators (New)
export {
  generateHeaderPageHTML,
  generateEquipmentSummaryPageHTML,
  generateEquipmentPhotoPageHTML,
} from './html-generators';

// HTML Generators (Legacy - deprecated)
export {
  generateCoverPageHTML,
  generateMaintenanceHTML,
  generateSummaryHTML,
  generateSignaturesHTML,
} from './html-generators';

// Service
export { pdfReportService } from './service';
