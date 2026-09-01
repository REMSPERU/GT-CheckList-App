import ExcelJS from 'exceljs';

// One-time preview utility. It intentionally never opens or reads the UC sheet.
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(
  process.argv[2] ?? '../examples/Tracker_Proyectos.xlsx',
);
const sheet = workbook.getWorksheet('PROGRESO');
if (!sheet) throw new Error('No existe la hoja PROGRESO');
const headers = new Map();
sheet
  .getRow(5)
  .eachCell((cell, column) =>
    headers.set(String(cell.value ?? '').trim(), column),
  );
for (const required of ['N°', 'PROYECTOS', 'TIPO DE PROYECTO', 'USUARIO']) {
  if (!headers.has(required)) throw new Error(`Falta encabezado: ${required}`);
}
const rows = [];
for (let rowNumber = 6; rowNumber <= sheet.rowCount; rowNumber += 1) {
  const row = sheet.getRow(rowNumber);
  const name = String(row.getCell(headers.get('PROYECTOS')).value ?? '').trim();
  if (!name || name === '.') continue;
  const completed = [4, 5, 6, 7, 8, 9, 10, 11, 13, 14].filter(
    column =>
      String(row.getCell(column).value ?? '')
        .trim()
        .toUpperCase() === 'SI',
  ).length;
  rows.push({
    sequence_number: Number(row.getCell(headers.get('N°')).value),
    name,
    project_type: String(
      row.getCell(headers.get('TIPO DE PROYECTO')).value ?? '',
    ).trim(),
    manager_name:
      String(row.getCell(headers.get('ENCARGADO') ?? 17).value ?? '').trim() ||
      null,
    user: String(row.getCell(headers.get('USUARIO')).value ?? '').trim(),
    current_progress: completed * 10,
  });
}
console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
