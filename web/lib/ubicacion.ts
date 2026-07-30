export interface UbicacionOption {
  value: string;
  label: string;
}

const SPECIAL_LOCATION_OPTIONS: UbicacionOption[] = [
  { value: 'AZOTEA', label: 'Azotea' },
  { value: 'SEMISOTANO', label: 'Semisótano' },
  { value: 'MEZANINE', label: 'Mezanine' },
];

const FLOOR_LOCATION_OPTIONS = Array.from({ length: 32 }, (_, index) => ({
  value: String(index + 1),
  label: `Piso ${index + 1}`,
}));

const BASEMENT_LOCATION_OPTIONS = Array.from({ length: 15 }, (_, index) => ({
  value: `-S${index + 1}`,
  label: `Sótano ${index + 1}`,
}));

export const UBICACION_OPTIONS: UbicacionOption[] = [
  ...SPECIAL_LOCATION_OPTIONS,
  ...FLOOR_LOCATION_OPTIONS,
  ...BASEMENT_LOCATION_OPTIONS,
];

/** Formats the canonical location code for display. */
export function formatUbicacion(ubicacion: string | null | undefined): string {
  if (!ubicacion?.trim()) return 'Sin ubicación';

  const normalized = ubicacion.trim().toUpperCase();
  if (normalized === 'AZOTEA') return 'Azotea';
  if (normalized === 'SEMISOTANO') return 'Semisótano';
  if (normalized === 'MEZANINE') return 'Mezanine';

  const basement = normalized.match(/^-S(\d+)$/);
  if (basement) return `Sótano ${basement[1]}`;

  if (/^[1-9]\d*$/.test(normalized)) return `Piso ${normalized}`;

  return ubicacion.trim();
}
