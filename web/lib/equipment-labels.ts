export function mapTipoLabel(tipo: string): string {
  const upper = tipo.toUpperCase().trim();
  if (upper === 'AIRE') return 'Extracción de Aire';
  if (upper === 'INYECCION') return 'Inyección de Aire';
  if (upper === 'MONOXIDO') return 'Extracción de Monóxido';
  if (upper === 'JET FAN') return 'Jet Fan';
  if (upper === 'PRESURIZADOR') return 'Presurizador de Escaleras';
  return tipo;
}
