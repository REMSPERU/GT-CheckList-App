import type { ChangeEvent } from 'react';

export type QrLogoSize = 'normal' | 'large';
export type QrLogoRadius = 'soft' | 'square';
export type QrPrintSize = 'mini' | 'extra-compact' | 'compact' | 'normal' | 'large';

export interface QrConfigState {
  showLogo: boolean;
  logoDataUrl: string | null;
  logoSize: QrLogoSize;
  logoRadius: QrLogoRadius;
  printSize: QrPrintSize;
}

export interface QrConfigHandlers {
  onShowLogoChange: (value: boolean) => void;
  onLogoSizeChange: (value: QrLogoSize) => void;
  onLogoRadiusChange: (value: QrLogoRadius) => void;
  onPrintSizeChange: (value: QrPrintSize) => void;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onClose: () => void;
}
