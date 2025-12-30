export interface PhotoItem {
  id: string; // local URI or UUID
  uri: string;
  status: 'pending' | 'uploading' | 'error' | 'done';
  remotePath?: string;
  url?: string;
  category?: 'visual' | 'thermo';
}

export type MaintenanceStep =
  | 'pre-photos'
  | 'checklist'
  | 'post-photos'
  | 'summary';

export interface MaintenanceSession {
  sessionId: string;
  maintenanceId?: string; // If linked to a scheduled maintenance
  panelId: string;
  startTime: string;
  lastUpdated: string;

  // Data
  prePhotos: PhotoItem[];
  postPhotos: PhotoItem[];
  checklist: Record<string, boolean | string>; // stepId -> value
  observations: string;

  // Progress
  currentStep: MaintenanceStep;
  isUploaded: boolean;
}
