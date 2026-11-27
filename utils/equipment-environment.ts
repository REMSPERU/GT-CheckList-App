interface EquipmentWithDetail {
  equipment_detail?: Record<string, unknown> | null;
}

export function groupEquipmentByEnvironment<T extends EquipmentWithDetail>(
  items: T[],
) {
  const rooms = new Map<string, { key: string; title: string; data: T[] }>();
  const unassigned: T[] = [];

  for (const item of items) {
    const value = item.equipment_detail?.ambiente_tecnico;
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name) {
      unassigned.push(item);
      continue;
    }

    const key = name.toLocaleLowerCase('es');
    const room = rooms.get(key) ?? { key, title: name, data: [] };
    room.data.push(item);
    rooms.set(key, room);
  }

  const sections = [...rooms.values()].sort((a, b) =>
    a.title.localeCompare(b.title, 'es'),
  );
  if (unassigned.length) {
    sections.push({
      key: '',
      title: sections.length ? 'Sin ambiente asignado' : '',
      data: unassigned,
    });
  }
  return sections;
}
